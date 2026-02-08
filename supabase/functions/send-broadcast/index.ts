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
    // Verify admin auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Use service role to check admin and send
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleCheck } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleCheck) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { broadcast_id } = await req.json();
    if (!broadcast_id) {
      return new Response(JSON.stringify({ error: "broadcast_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch broadcast
    const { data: broadcast, error: broadcastError } = await adminClient
      .from("broadcasts")
      .select("*")
      .eq("id", broadcast_id)
      .single();

    if (broadcastError || !broadcast) {
      return new Response(JSON.stringify({ error: "Broadcast not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (broadcast.status === "sent" || broadcast.status === "sending") {
      return new Response(JSON.stringify({ error: "Broadcast already sent or sending" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark as sending
    await adminClient
      .from("broadcasts")
      .update({ status: "sending" })
      .eq("id", broadcast_id);

    // Get active subscribers
    const { data: subscribers, error: subError } = await adminClient
      .from("prospects")
      .select("email, first_name, unsubscribe_token")
      .eq("unsubscribed", false);

    if (subError || !subscribers) {
      await adminClient
        .from("broadcasts")
        .update({ status: "failed" })
        .eq("id", broadcast_id);
      return new Response(JSON.stringify({ error: "Failed to fetch subscribers" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      await adminClient
        .from("broadcasts")
        .update({ status: "failed" })
        .eq("id", broadcast_id);
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendKey);
    const appUrl = "https://kit-clone-dashboard.lovable.app";
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
            html: `
              ${personalizedContent}
              <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
              <p style="font-size: 12px; color: #999;">
                <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
              </p>
            `,
          });
          sent++;
        } catch (e) {
          console.error(`Failed to send to ${sub.email}:`, e);
          failed++;
        }
      });
      await Promise.all(promises);
    }

    // Update broadcast status
    await adminClient
      .from("broadcasts")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        total_recipients: subscribers.length,
        total_sent: sent,
        total_failed: failed,
      })
      .eq("id", broadcast_id);

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: subscribers.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-broadcast error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
