import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { type, data } = payload;

    const eventType = type;
    const email = data?.to?.[0] || data?.email || "";
    const broadcastSubject = data?.subject || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Try to find the broadcast by subject match first
    let broadcastId: string | null = null;
    if (broadcastSubject) {
      const { data: broadcast } = await adminClient
        .from("broadcasts")
        .select("id")
        .eq("subject", broadcastSubject)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (broadcast) broadcastId = broadcast.id;
    }

    // For open/click/bounce events without a subject, look up the broadcast
    // from a previous email.sent event for the same email address
    if (!broadcastId && email) {
      const { data: priorEvent } = await adminClient
        .from("email_events")
        .select("broadcast_id")
        .eq("email", email)
        .eq("event_type", "email.sent")
        .not("broadcast_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (priorEvent?.broadcast_id) broadcastId = priorEvent.broadcast_id;
    }

    // Store the event
    await adminClient.from("email_events").insert({
      broadcast_id: broadcastId,
      email,
      event_type: eventType,
      metadata: data || {},
    });

    console.log(`Stored email event: ${eventType} for ${email}`);

    // Trigger link_click automations
    if (eventType === "email.clicked" && email) {
      const clickUrl = data?.click?.url || data?.url || "";
      // Get prospect info
      const { data: prospect } = await adminClient
        .from("prospects")
        .select("first_name")
        .eq("email", email)
        .maybeSingle();

      try {
        await fetch(`${supabaseUrl}/functions/v1/execute-automation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trigger_type: "link_click",
            trigger_data: {
              email,
              first_name: prospect?.first_name || null,
              link_url: clickUrl,
            },
          }),
        });
      } catch (e) {
        console.error("link_click automation trigger error (non-fatal):", e);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
