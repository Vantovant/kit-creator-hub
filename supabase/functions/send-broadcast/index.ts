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

    // Get active subscribers (filtered by segment if set)
    let subscribers: any[] | null = null;
    let subError: any = null;

    if (broadcast.segment_id) {
      // Fetch segment filters
      const { data: segment } = await adminClient
        .from("segments")
        .select("filters")
        .eq("id", broadcast.segment_id)
        .maybeSingle();

      if (segment?.filters) {
        const { data, error } = await adminClient.rpc("get_segment_prospects", {
          segment_filters: segment.filters,
        }).select("email, first_name, unsubscribe_token");
        subscribers = data;
        subError = error;
      } else {
        // Segment not found or no filters, fall back to all
        const { data, error } = await adminClient
          .from("prospects")
          .select("email, first_name, unsubscribe_token")
          .eq("unsubscribed", false);
        subscribers = data;
        subError = error;
      }
    } else {
      const { data, error } = await adminClient
        .from("prospects")
        .select("email, first_name, unsubscribe_token")
        .eq("unsubscribed", false);
      subscribers = data;
      subError = error;
    }

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

          const signature = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; max-width: 500px; margin-top: 24px; border-top: 2px solid #5CC5DE; padding-top: 16px;">
  <tr>
    <td style="vertical-align: top; padding-right: 16px;">
      <img src="${appUrl}/assets/logo.jpg" alt="Vanto Zazi Mail" width="80" height="80" style="border-radius: 8px; display: block;" />
    </td>
    <td style="vertical-align: top;">
      <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold; color: #1a1a1a;">Vanto Zazi</p>
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #5CC5DE; font-weight: 600;">Wellness Business Leader | APLGO</p>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding-right: 6px;"><span style="font-size: 12px; color: #666;">📧</span></td><td><a href="mailto:vanto@onlinecourseformlm.com" style="font-size: 13px; color: #333; text-decoration: none;">vanto@onlinecourseformlm.com</a></td></tr>
        <tr><td style="padding-right: 6px; padding-top: 4px;"><span style="font-size: 12px; color: #666;">🌐</span></td><td style="padding-top: 4px;"><a href="https://onlinecourseformlm.com" style="font-size: 13px; color: #5CC5DE; text-decoration: none; font-weight: 500;">onlinecourseformlm.com</a></td></tr>
      </table>
      <p style="margin: 10px 0 0 0; font-size: 11px; color: #999; font-style: italic;">"Empowering wellness entrepreneurs to build scalable income."</p>
    </td>
  </tr>
</table>`;

          await resend.emails.send({
            from: `${broadcast.from_name} <vanto@onlinecourseformlm.com>`,
            to: [sub.email],
            subject: broadcast.subject,
            html: `${personalizedContent}${signature}<p style="font-size: 11px; color: #999; margin-top: 16px;">You're receiving this email because you registered in APLGO.<br/><a href="${unsubscribeUrl}" style="color:#999; text-decoration: underline;">Unsubscribe</a></p>`,
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
