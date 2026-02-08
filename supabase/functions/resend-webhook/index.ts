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

    // Map Resend event types
    const eventType = type; // e.g. email.delivered, email.bounced, email.opened, email.clicked, email.complained
    const email = data?.to?.[0] || data?.email || "";
    const broadcastSubject = data?.subject || "";

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Try to find the broadcast by subject match
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

    // Store the event
    await adminClient.from("email_events").insert({
      broadcast_id: broadcastId,
      email,
      event_type: eventType,
      metadata: data || {},
    });

    console.log(`Stored email event: ${eventType} for ${email}`);

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
