import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@^2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://kit-clone-dashboard.lovable.app";

// Retry with exponential backoff for 429 errors
async function sendWithRetry(
  resend: any,
  emailPayload: any,
  maxRetries = 3
): Promise<boolean> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await resend.emails.send(emailPayload);
      return true;
    } catch (e: any) {
      const is429 = e?.statusCode === 429 || e?.message?.includes("429");
      if (is429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000; // 2s, 4s, 8s
        console.log(`Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw e;
      }
    }
  }
  return false;
}

// Throttle between sends
function throttle(ms = 600): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const EMAIL_SIGNATURE = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; max-width: 540px; margin-top: 24px; border-top: 2px solid #1a3a8a; padding-top: 16px;">
  <tr>
    <td style="vertical-align: top; padding-right: 16px;">
      <img src="${APP_URL}/assets/logo-mlm.jpg" alt="Online Course For MLM" width="90" height="68" style="border-radius: 6px; display: block; object-fit: cover;" />
    </td>
    <td style="vertical-align: top;">
      <p style="margin: 0 0 2px 0; font-size: 16px; font-weight: bold; color: #1a1a1a;">Vanto Vanto</p>
      <p style="margin: 0 0 2px 0; font-size: 13px; color: #1a3a8a; font-weight: 600;">Founder — Vanto Zazi</p>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #666;">Master AI. Recruit Smart. Grow Fast.</p>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding-right: 6px;"><span style="font-size: 12px; color: #666;">📧</span></td><td><a href="mailto:vanto@onlinecourseformlm.com" style="font-size: 13px; color: #333; text-decoration: none;">vanto@onlinecourseformlm.com</a></td></tr>
        <tr><td style="padding-right: 6px; padding-top: 4px;"><span style="font-size: 12px; color: #666;">🌐</span></td><td style="padding-top: 4px;"><a href="https://onlinecourseformlm.com" style="font-size: 13px; color: #1a3a8a; text-decoration: none; font-weight: 500;">onlinecourseformlm.com</a></td></tr>
      </table>
    </td>
  </tr>
</table>`;

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

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
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

    const body = await req.json();

    // ── TEST EMAIL MODE ──
    if (body.test_email) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      if (!resendKey) {
        return new Response(JSON.stringify({ error: "Email service not configured" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const resend = new Resend(resendKey);
      const personalizedContent = (body.content || "")
        .replace(/\{\{first_name\}\}/g, "Test User");

      await resend.emails.send({
        from: `${body.from_name || "Vanto Zazi"} <vanto@onlinecourseformlm.com>`,
        to: [body.test_email],
        subject: `[TEST] ${body.subject || "(no subject)"}`,
        html: `${personalizedContent}${EMAIL_SIGNATURE}<p style="font-size: 11px; color: #999; margin-top: 16px;">This is a test email.</p>`,
      });

      return new Response(
        JSON.stringify({ success: true, sent: 1 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── NORMAL BROADCAST MODE ──
    const { broadcast_id } = body;
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
    let sent = 0;
    let failed = 0;

    // Send ONE AT A TIME with throttle + retry to avoid 429 rate limits
    for (let i = 0; i < subscribers.length; i++) {
      const sub = subscribers[i];
      try {
        const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${sub.unsubscribe_token || ""}`;
        const personalizedContent = broadcast.content
          .replace(/\{\{first_name\}\}/g, sub.first_name || "there");

        await sendWithRetry(resend, {
          from: `${broadcast.from_name} <vanto@onlinecourseformlm.com>`,
          to: [sub.email],
          subject: broadcast.subject,
          html: `${personalizedContent}${EMAIL_SIGNATURE}<p style="font-size: 11px; color: #999; margin-top: 16px;">You're receiving this email because you registered in APLGO.<br/><a href="${unsubscribeUrl}" style="color:#999; text-decoration: underline;">Unsubscribe</a></p>`,
        });
        sent++;
        console.log(`Sent ${sent}/${subscribers.length}: ${sub.email}`);
      } catch (e) {
        console.error(`Failed to send to ${sub.email}:`, e);
        failed++;
      }

      // Throttle: 600ms between each send (~1.6 emails/sec, well under 2/sec limit)
      if (i < subscribers.length - 1) {
        await throttle(600);
      }
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

    console.log(`Broadcast complete: ${sent} sent, ${failed} failed out of ${subscribers.length}`);

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
