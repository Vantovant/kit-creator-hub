// ============================================================
// ZAZI MAIL INBOX — Gmail action (Phase 2)
// ============================================================
// Applies Superhuman-style actions to a Gmail message via the
// Lovable gateway, then mirrors the state in inbox_messages.
// Actions: mark_read, mark_unread, star, unstar, archive, unarchive,
//            snooze, waiting_on, handled, label_add, label_remove
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function gatewayModify(messageId: string, add: string[], remove: string[], lovableKey: string, connectionKey: string) {
  const url = `${GATEWAY_URL}/users/me/messages/${messageId}/modify`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ addLabelIds: add, removeLabelIds: remove }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gateway ${res.status}: ${text}`);
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!lovableKey || !connectionKey) {
    return json({ error: "missing_gateway_keys" }, 500);
  }

  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const { message_id, action, action_data = {} } = body;
  if (!message_id || !action) return json({ error: "message_id and action required" }, 400);

  // Fetch local message + account
  const { data: msg, error: msgErr } = await supabase
    .from("inbox_messages")
    .select("*, account_id")
    .eq("id", message_id)
    .single();

  if (msgErr || !msg) return json({ error: "message_not_found" }, 404);

  const updates: any = {};
  const addLabels: string[] = [];
  const removeLabels: string[] = [];
  let logAction: string | null = null;
  let logData: any = {};

  switch (action) {
    case "mark_read":
      removeLabels.push("UNREAD");
      updates.is_read = true;
      logAction = "mark_read";
      break;
    case "mark_unread":
      addLabels.push("UNREAD");
      updates.is_read = false;
      logAction = "mark_unread";
      break;
    case "star":
      addLabels.push("STARRED");
      updates.is_starred = true;
      logAction = "star";
      break;
    case "unstar":
      removeLabels.push("STARRED");
      updates.is_starred = false;
      logAction = "unstar";
      break;
    case "archive":
      removeLabels.push("INBOX");
      updates.is_archived = true;
      logAction = "archive";
      break;
    case "unarchive":
      addLabels.push("INBOX");
      updates.is_archived = false;
      logAction = "unarchive";
      break;
    case "snooze":
      updates.snoozed_until = action_data.until || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      logAction = "snooze";
      logData = { until: updates.snoozed_until };
      break;
    case "waiting_on":
      updates.waiting_on = action_data.person || action_data.reason || "waiting";
      logAction = "waiting_on";
      logData = { waiting_on: updates.waiting_on };
      break;
    case "handled":
      updates.handled_at = new Date().toISOString();
      logAction = "handled";
      break;
    case "label_add":
      if (action_data.label) addLabels.push(action_data.label);
      logAction = "label_add";
      logData = { label: action_data.label };
      break;
    case "label_remove":
      if (action_data.label) removeLabels.push(action_data.label);
      logAction = "label_remove";
      logData = { label: action_data.label };
      break;
    default:
      return json({ error: "unknown_action" }, 400);
  }

  // Apply Gmail label changes
  if (addLabels.length || removeLabels.length) {
    try {
      await gatewayModify(msg.message_id, addLabels, removeLabels, lovableKey, connectionKey);
    } catch (e: any) {
      return json({ error: "gateway_failed", detail: e.message }, 502);
    }
  }

  // Update local row
  const { error: updateErr } = await supabase
    .from("inbox_messages")
    .update(updates)
    .eq("id", message_id);

  if (updateErr) return json({ error: "update_failed", detail: updateErr.message }, 500);

  // Log action
  if (logAction) {
    await supabase.from("inbox_action_log").insert({
      user_id: msg.user_id,
      message_id,
      action_type: logAction,
      action_data: logData,
    });
  }

  return json({ ok: true, action, message_id });
});
