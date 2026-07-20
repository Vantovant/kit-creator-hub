// ============================================================
// ZAZI MAIL INBOX — Gmail sync (Phase 2)
// ============================================================
// Reads the connected builder Gmail account via Lovable gateway,
// stores messages in inbox_messages, and matches senders to prospects.
//
// Trigger: POST { account_id, max_results?, label_filter? }
// Scheduled: cron every 2 min per active account (or manual trigger).
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

const enc = new TextEncoder();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(raw: string): string {
  return raw.toLowerCase().replace(/\s/g, "").replace(/<|>/g, "");
}

function parseSender(sender: string): { email: string; name: string | null } {
  const match = sender.match(/(.*?)\s*<([^>]+)>/);
  if (match) {
    return { email: normalizeEmail(match[2]), name: match[1].trim() || null };
  }
  return { email: normalizeEmail(sender), name: null };
}

function decodeB64(data: string): string {
  try {
    const bin = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
    // handle utf-8
    return decodeURIComponent(escape(bin));
  } catch {
    try { return atob(data.replace(/-/g, "+").replace(/_/g, "/")); } catch { return ""; }
  }
}

async function getBodyPartData(part: any, messageId: string, lovableKey: string, connectionKey: string): Promise<string> {
  if (part?.body?.data) return decodeB64(part.body.data);
  if (!part?.body?.attachmentId) return "";

  try {
    const attachment = await gatewayGet(
      `/users/me/messages/${messageId}/attachments/${part.body.attachmentId}`,
      lovableKey,
      connectionKey,
    );
    return attachment?.data ? decodeB64(attachment.data) : "";
  } catch {
    return "";
  }
}

async function extractBodies(
  payload: any,
  messageId: string,
  lovableKey: string,
  connectionKey: string,
): Promise<{ text: string | null; html: string | null }> {
  if (!payload) return { text: null, html: null };
  let text: string | null = null;
  let html: string | null = null;
  const walk = async (p: any) => {
    if (!p) return;
    if (p.mimeType === "text/plain" && !text) {
      const value = await getBodyPartData(p, messageId, lovableKey, connectionKey);
      if (value.trim()) text = value;
    }
    if (p.mimeType === "text/html" && !html) {
      const value = await getBodyPartData(p, messageId, lovableKey, connectionKey);
      if (value.trim()) html = value;
    }
    if (p.parts) {
      for (const child of p.parts) await walk(child);
    }
  };
  await walk(payload);
  return { text, html };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function bodyPreview(text: string | null, html: string | null): string | null {
  if (html) return stripHtml(html).replace(/\s+/g, " ").trim().slice(0, 400);
  if (text) return text.replace(/\s+/g, " ").trim().slice(0, 400);
  return null;
}

async function gatewayGet(path: string, lovableKey: string, connectionKey: string) {
  const url = `${GATEWAY_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gateway ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function gatewayPost(path: string, body: any, lovableKey: string, connectionKey: string) {
  const url = `${GATEWAY_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gateway ${res.status}: ${text}`);
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!lovableKey || !connectionKey) {
    return json({ error: "missing_gateway_keys" }, 500);
  }

  // Parse request body
  let payload: any = {};
  try {
    if (req.method === "POST") payload = await req.json();
  } catch { /* empty manual trigger allowed */ }

  const accountId = payload?.account_id;
  const maxResults = Math.min(Math.max(payload?.max_results ?? 50, 1), 200);
  const labelFilter = payload?.label_filter ?? "inbox";

  if (!accountId) {
    return json({ error: "account_id required" }, 400);
  }

  // Fetch account row
  const { data: account, error: accountErr } = await supabase
    .from("inbox_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("is_active", true)
    .maybeSingle();

  if (accountErr || !account) {
    return json({ error: "account_not_found", detail: accountErr?.message }, 404);
  }

  // List messages
  let q = labelFilter === "inbox" ? "in:inbox" : "";
  const list = await gatewayGet(
    `/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(q)}`,
    lovableKey,
    connectionKey,
  );

  const messages = list.messages || [];
  const stored: string[] = [];
  const errors: string[] = [];

  for (const m of messages) {
    try {
      const full = await gatewayGet(
        `/users/me/messages/${m.id}?format=full`,
        lovableKey,
        connectionKey,
      );

      const headers = Object.fromEntries(
        (full.payload?.headers || []).map((h: any) => [h.name.toLowerCase(), h.value]),
      );

      const sender = parseSender(headers.from || "Unknown");
      const to = (headers.to || "").split(",").map(normalizeEmail).filter(Boolean);
      const cc = (headers.cc || "").split(",").map(normalizeEmail).filter(Boolean);
      const subject = headers.subject || "(no subject)";
      const date = new Date(Number(full.internalDate));
      const { text: textBody, html: htmlBody } = await extractBodies(full.payload, full.id, lovableKey, connectionKey);
      const preview = bodyPreview(textBody, htmlBody) || full.snippet || "";

      // NOTE: We intentionally do NOT auto-link senders to prospects here.
      // Users add contacts explicitly via the Contact 360 panel.
      const upsert = {
        user_id: account.user_id,
        account_id: account.id,
        message_id: full.id,
        thread_id: full.threadId || null,
        sender: sender.email,
        sender_name: sender.name,
        recipients: to,
        cc,
        subject,
        snippet: full.snippet || null,
        body_preview: preview,
        body_text: textBody,
        body_html: htmlBody,
        date: date.toISOString(),
        label_ids: full.labelIds || [],
        is_read: !(full.labelIds || []).includes("UNREAD"),
        is_starred: (full.labelIds || []).includes("STARRED"),
        is_archived: !(full.labelIds || []).includes("INBOX"),
        prospect_id: null,
        category: null,
        urgency: null,
        intent: null,
      };

      const { data: upserted, error: upsertErr } = await supabase
        .from("inbox_messages")
        .upsert(upsert, { onConflict: "account_id, message_id" })
        .select("id")
        .single();

      if (upsertErr) throw upsertErr;
      stored.push(full.id);

      // Fire-and-forget AI classify
      if (upserted?.id) {
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/inbox-classify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": Deno.env.get("SUPABASE_ANON_KEY")! },
          body: JSON.stringify({ message_id: upserted.id }),
        }).catch(() => {});
      }
    } catch (e: any) {
      errors.push(`${m.id}: ${e.message}`);
    }
  }

  // Update account last_sync_at
  await supabase
    .from("inbox_accounts")
    .update({ last_sync_at: new Date().toISOString(), sync_error: errors.length ? errors.join("; ") : null })
    .eq("id", accountId);

  return json({
    ok: true,
    account_id: accountId,
    fetched: messages.length,
    stored: stored.length,
    errors: errors.length ? errors : undefined,
  });
});
