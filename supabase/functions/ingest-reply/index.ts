import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();

    // Expected fields from webhook/provider
    const {
      from_email, from_name, subject, text_body, html_body,
      message_id, in_reply_to, references, thread_id,
      // Optional: account_email to identify which reply account
      to_email,
    } = body;

    if (!from_email) {
      return new Response(JSON.stringify({ error: "from_email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- MATCHING LOGIC ---
    // 1. Try matching by in_reply_to → provider_message_id
    let matchedOutbound = null;

    if (in_reply_to) {
      const { data } = await supabase
        .from("zazi_outbound_sends")
        .select("*")
        .eq("provider_message_id", in_reply_to.replace(/[<>]/g, ""))
        .limit(1);
      if (data && data.length > 0) matchedOutbound = data[0];
    }

    // 2. Try matching by thread_id
    if (!matchedOutbound && thread_id) {
      const { data } = await supabase
        .from("zazi_outbound_sends")
        .select("*")
        .eq("provider_thread_id", thread_id)
        .limit(1);
      if (data && data.length > 0) matchedOutbound = data[0];
    }

    // 3. Fallback: match by recipient_email + normalized subject
    if (!matchedOutbound && from_email && subject) {
      const normalized = subject.replace(/^(Re|Fwd|Fw):\s*/gi, "").trim();
      const { data } = await supabase
        .from("zazi_outbound_sends")
        .select("*")
        .eq("recipient_email", from_email)
        .ilike("subject", normalized)
        .order("sent_at", { ascending: false })
        .limit(1);
      if (data && data.length > 0) matchedOutbound = data[0];
    }

    // If no match found, reject (this is a tracked-reply-only inbox)
    if (!matchedOutbound) {
      console.log(`No outbound match for reply from ${from_email}, subject: "${subject}". Skipping.`);
      return new Response(JSON.stringify({ status: "skipped", reason: "no_outbound_match" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate by provider_message_id
    if (message_id) {
      const { data: existing } = await supabase
        .from("zazi_inbound_replies")
        .select("id")
        .eq("provider_message_id", message_id.replace(/[<>]/g, ""))
        .limit(1);
      if (existing && existing.length > 0) {
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
      if (prospect && prospect.length > 0) prospect_id = prospect[0].id;
    }

    // Insert reply
    const replyRecord = {
      user_id: matchedOutbound.user_id,
      account_id: matchedOutbound.account_id,
      prospect_id,
      matched_outbound_id: matchedOutbound.id,
      matched_sequence_id: matchedOutbound.sequence_id,
      matched_sequence_step_index: matchedOutbound.sequence_step_index,
      matched_broadcast_id: matchedOutbound.broadcast_id,
      provider_message_id: message_id ? message_id.replace(/[<>]/g, "") : null,
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

    console.log(`Reply ingested: ${inserted.id} from ${from_email}, matched outbound: ${matchedOutbound.id}`);

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
