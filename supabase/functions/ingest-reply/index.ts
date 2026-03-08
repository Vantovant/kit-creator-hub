import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, svix-id, svix-timestamp, svix-signature, x-webhook-secret",
};

/** Strip angle brackets and whitespace from message IDs */
function normalizeMessageId(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.replace(/[<>\s]/g, "").trim() || null;
}

/** Verify webhook signature — fail-closed unless ALLOW_INSECURE_WEBHOOKS=true */
async function verifyWebhookSignature(req: Request, body: string): Promise<{ valid: boolean; reason?: string }> {
  const allowInsecure = Deno.env.get("ALLOW_INSECURE_WEBHOOKS") === "true";

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  // Path A: Svix signature headers present → verify HMAC
  if (svixId && svixTimestamp && svixSignature) {
    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET") || Deno.env.get("WEBHOOK_REPLY_SECRET");
    if (!webhookSecret) {
      if (allowInsecure) { console.warn("ALLOW_INSECURE_WEBHOOKS: accepting unsigned svix request"); return { valid: true }; }
      return { valid: false, reason: "no_webhook_secret_configured" };
    }

    try {
      const secretBytes = Uint8Array.from(atob(webhookSecret.replace("whsec_", "")), c => c.charCodeAt(0));
      const toSign = `${svixId}.${svixTimestamp}.${body}`;
      const key = await crypto.subtle.importKey("raw", secretBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(toSign));
      const computedSig = btoa(String.fromCharCode(...new Uint8Array(sig)));

      const signatures = svixSignature.split(" ").map(s => s.replace("v1,", ""));
      if (signatures.some(s => s === computedSig)) return { valid: true };
      return { valid: false, reason: "signature_mismatch" };
    } catch (e) {
      console.error("Svix HMAC verification error:", e);
      return { valid: false, reason: "signature_verification_error" };
    }
  }

  // Path B: Shared secret header
  const authToken = req.headers.get("x-webhook-secret");
  const expectedToken = Deno.env.get("WEBHOOK_REPLY_SECRET");
  if (expectedToken && authToken === expectedToken) return { valid: true };
  if (expectedToken && authToken !== expectedToken) return { valid: false, reason: "invalid_shared_secret" };

  // Path C: No verification mechanism at all
  if (allowInsecure) {
    console.warn("ALLOW_INSECURE_WEBHOOKS: no verification configured, accepting request");
    return { valid: true };
  }

  return { valid: false, reason: "no_verification_configured" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const bodyText = await req.text();

    // --- Webhook verification (fail-closed) ---
    const verification = await verifyWebhookSignature(req, bodyText);
    if (!verification.valid) {
      console.error(`Webhook rejected: ${verification.reason}`);
      return new Response(JSON.stringify({ error: "unauthorized", reason: verification.reason }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = JSON.parse(bodyText);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const {
      from_email, from_name, subject, text_body, html_body,
      message_id, in_reply_to, references, thread_id,
      to_email,
    } = body;

    if (!from_email) {
      return new Response(JSON.stringify({ error: "from_email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- STEP 1: Strict reply account resolution from to_email ---
    // No fallback guessing — if to_email doesn't match an active account, skip.
    let replyAccount: any = null;
    if (to_email) {
      const normalizedTo = to_email.toLowerCase().trim();
      const { data } = await supabase
        .from("zazi_reply_accounts")
        .select("*")
        .eq("account_email", normalizedTo)
        .eq("is_active", true)
        .limit(1);
      if (data && data.length > 0) replyAccount = data[0];
    }

    if (!replyAccount) {
      console.log(`Unknown reply account for to_email="${to_email}" — skipping. Reason: unknown_reply_account`);
      return new Response(JSON.stringify({ status: "skipped", reason: "unknown_reply_account", to_email }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const scopeAccountId = replyAccount.id;
    const scopeUserId = replyAccount.user_id;

    // --- STEP 2: MATCHING LOGIC (scoped by account_id first, then user_id) ---
    const normalizedInReplyTo = normalizeMessageId(in_reply_to);
    const normalizedMsgId = normalizeMessageId(message_id);

    let matchedOutbound: any = null;

    // Helper: build scoped query
    function scopedQuery() {
      return supabase
        .from("zazi_outbound_sends")
        .select("*")
        .eq("account_id", scopeAccountId);
    }

    // Also prepare a user-scoped fallback (for sends without account_id set)
    function userScopedQuery() {
      return supabase
        .from("zazi_outbound_sends")
        .select("*")
        .eq("user_id", scopeUserId);
    }

    // 2a. in_reply_to → provider_message_id (account-scoped, then user-scoped)
    if (normalizedInReplyTo) {
      let { data } = await scopedQuery().eq("provider_message_id", normalizedInReplyTo).limit(1);
      if (!data?.length) {
        ({ data } = await userScopedQuery().eq("provider_message_id", normalizedInReplyTo).limit(1));
      }
      if (data?.length) matchedOutbound = data[0];
    }

    // 2b. references header — extract all message IDs
    if (!matchedOutbound && references) {
      const refIds = references.match(/[^\s<>]+/g) || [];
      for (const refId of refIds) {
        const normalized = normalizeMessageId(refId);
        if (!normalized) continue;
        let { data } = await scopedQuery().eq("provider_message_id", normalized).limit(1);
        if (!data?.length) {
          ({ data } = await userScopedQuery().eq("provider_message_id", normalized).limit(1));
        }
        if (data?.length) { matchedOutbound = data[0]; break; }
      }
    }

    // 2c. thread_id → provider_thread_id
    if (!matchedOutbound && thread_id) {
      let { data } = await scopedQuery().eq("provider_thread_id", thread_id).limit(1);
      if (!data?.length) {
        ({ data } = await userScopedQuery().eq("provider_thread_id", thread_id).limit(1));
      }
      if (data?.length) matchedOutbound = data[0];
    }

    // 2d. Subject fallback — account_id-scoped ONLY, last 60 days, NO user_id fallback
    if (!matchedOutbound && from_email && subject) {
      const normalized = subject.replace(/^(Re|Fwd|Fw):\s*/gi, "").trim();
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

      const { data } = await scopedQuery()
        .eq("recipient_email", from_email)
        .ilike("subject", normalized)
        .gte("sent_at", sixtyDaysAgo)
        .order("sent_at", { ascending: false })
        .limit(1);

      if (data?.length) matchedOutbound = data[0];
    }

    // No match → skip
    if (!matchedOutbound) {
      console.log(`No outbound match for reply from ${from_email}, subject: "${subject}", account: ${scopeAccountId}. Skipping.`);
      return new Response(JSON.stringify({ status: "skipped", reason: "no_outbound_match" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate by provider_message_id
    if (normalizedMsgId) {
      const { data: existing } = await supabase
        .from("zazi_inbound_replies")
        .select("id")
        .eq("provider_message_id", normalizedMsgId)
        .limit(1);
      if (existing?.length) {
        return new Response(JSON.stringify({ status: "duplicate", id: existing[0].id }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build snippet
    const snippet = (text_body || "").slice(0, 200);

    // Look up prospect
    let prospect_id = matchedOutbound.prospect_id;
    if (!prospect_id) {
      const { data: prospect } = await supabase
        .from("prospects")
        .select("id")
        .eq("email", from_email)
        .limit(1);
      if (prospect?.length) prospect_id = prospect[0].id;
    }

    // Insert reply
    const replyRecord = {
      user_id: matchedOutbound.user_id,
      account_id: scopeAccountId,
      prospect_id,
      matched_outbound_id: matchedOutbound.id,
      matched_sequence_id: matchedOutbound.sequence_id,
      matched_sequence_step_index: matchedOutbound.sequence_step_index,
      matched_broadcast_id: matchedOutbound.broadcast_id,
      provider_message_id: normalizedMsgId,
      in_reply_to: in_reply_to || null,
      references_header: references || null,
      thread_id: thread_id || matchedOutbound.provider_thread_id || null,
      sender_email: from_email,
      sender_name: from_name || null,
      subject: subject || null,
      snippet,
      body_text: text_body || null,
      body_html: html_body || null,
      reply_status: "new",
      is_read: false,
      is_starred: false,
      received_at: new Date().toISOString(),
    };

    const { data: inserted, error } = await supabase
      .from("zazi_inbound_replies")
      .insert(replyRecord)
      .select("id")
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Reply ingested: ${inserted.id} from ${from_email}, matched outbound: ${matchedOutbound.id}, account: ${scopeAccountId}`);

    return new Response(JSON.stringify({ status: "ingested", id: inserted.id }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ingest-reply error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});