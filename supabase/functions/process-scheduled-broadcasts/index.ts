import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@^2.0.0";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Find scheduled broadcasts that are due
    const now = new Date().toISOString();
    const { data: broadcasts, error: fetchError } = await adminClient
      .from("broadcasts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    if (fetchError || !broadcasts || broadcasts.length === 0) {
      return new Response(
        JSON.stringify({ message: "No scheduled broadcasts due", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendKey);
    const appUrl = "https://kit-clone-dashboard.lovable.app";
    let processed = 0;

    for (const broadcast of broadcasts) {
      // Mark as sending
      await adminClient
        .from("broadcasts")
        .update({ status: "sending" })
        .eq("id", broadcast.id);

      // Get active subscribers
      const { data: subscribers } = await adminClient
        .from("prospects")
        .select("email, first_name, unsubscribe_token")
        .eq("unsubscribed", false);

      if (!subscribers || subscribers.length === 0) {
        await adminClient
          .from("broadcasts")
          .update({ status: "sent", sent_at: now, total_recipients: 0, total_sent: 0, total_failed: 0 })
          .eq("id", broadcast.id);
        processed++;
        continue;
      }

      let sent = 0;
      let failed = 0;

      // Send in batches of 10
      for (let i = 0; i < subscribers.length; i += 10) {
        const batch = subscribers.slice(i, i + 10);
        const promises = batch.map(async (sub) => {
          try {
            const unsubscribeUrl = `${appUrl}/unsubscribe?token=${sub.unsubscribe_token || ""}`;
            const personalizedContent = broadcast.content
              .replace(/\{\{first_name\}\}/g, sub.first_name || "there");

            await resend.emails.send({
              from: `${broadcast.from_name} <vanto@onlinecourseformlm.com>`,
              to: [sub.email],
              subject: broadcast.subject,
              html: `${personalizedContent}<hr style="margin:24px 0;border:none;border-top:1px solid #eee;"/><p style="font-size:12px;color:#999;"><a href="${unsubscribeUrl}" style="color:#999;">Unsubscribe</a></p>`,
            });
            sent++;
          } catch (e) {
            console.error(`Failed to send to ${sub.email}:`, e);
            failed++;
          }
        });
        await Promise.all(promises);
      }

      await adminClient
        .from("broadcasts")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          total_recipients: subscribers.length,
          total_sent: sent,
          total_failed: failed,
        })
        .eq("id", broadcast.id);

      processed++;
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("process-scheduled-broadcasts error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
