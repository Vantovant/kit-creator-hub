// ============================================================
// ZAZI MAIL INBOX — Auto-unsnooze cron (Phase 4)
// ============================================================
// Clears expired snoozed_until values and restores messages to
// the inbox view. Intended to run every 5 minutes via pg_cron
// or an external scheduler hitting this endpoint.
//
// POST {} -> { ok, unsnoozed: n }
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("inbox_messages")
    .select("id, user_id")
    .lte("snoozed_until", nowIso)
    .not("snoozed_until", "is", null)
    .limit(500);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let unsnoozed = 0;
  for (const row of due || []) {
    const { error: uErr } = await supabase
      .from("inbox_messages")
      .update({ snoozed_until: null })
      .eq("id", row.id);
    if (!uErr) {
      unsnoozed++;
      await supabase.from("inbox_action_log").insert({
        user_id: row.user_id,
        message_id: row.id,
        action_type: "auto_unsnooze",
        action_data: { at: nowIso },
      });
    }
  }

  return new Response(JSON.stringify({ ok: true, unsnoozed, scanned: (due || []).length }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
