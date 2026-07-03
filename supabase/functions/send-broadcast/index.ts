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
async function sendWithRetry(resend: any, emailPayload: any, maxRetries = 3): Promise<any> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await resend.emails.send(emailPayload);
    } catch (e: any) {
      const is429 = e?.statusCode === 429 || e?.message?.includes("429");
      if (is429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw e;
      }
    }
  }
  return null;
}

function throttle(ms = 600): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── APLGO branding ──
const APLGO_HEADER = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; max-width: 540px; margin-bottom: 16px;">
  <tr>
    <td style="vertical-align: middle; padding-right: 8px;">
      <img src="${APP_URL}/assets/aplgo-logo.png" alt="APLGO" height="24" style="display: block; height: 24px; width: auto;" />
    </td>
    <td style="vertical-align: middle;">
      <p style="margin: 0; font-size: 10px; font-weight: 500; color: #777; line-height: 1.3; letter-spacing: 0.2px;">Accredited Distributors<br/>of APLGO</p>
    </td>
  </tr>
</table>`;

const APLGO_SIGNATURE = `
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
        <tr><td style="padding-right: 6px; padding-top: 4px;"><span style="font-size: 12px; color: #666;">🌐</span></td><td style="padding-top: 4px;"><a href="https://getwellafrica.com" style="font-size: 13px; color: #1a3a8a; text-decoration: none; font-weight: 500;">onlinecourseformlm.com</a></td></tr>
      </table>
    </td>
  </tr>
</table>`;

const VANTOOS_HEADER = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; max-width: 540px; margin-bottom: 20px;">
  <tr>
    <td style="vertical-align: middle; padding-right: 12px;">
      <img src="${APP_URL}/assets/vantoos-logo.png" alt="VantoOS" height="36" style="display: block; height: 36px; width: auto;" />
    </td>
    <td style="vertical-align: middle;">
      <p style="margin: 0; font-size: 11px; font-weight: 500; color: #6b7b6a; line-height: 1.3; letter-spacing: 0.3px;">Plan. Fund. Deliver.</p>
    </td>
  </tr>
</table>`;

const VANTOOS_SIGNATURE = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: 'Segoe UI', Arial, Helvetica, sans-serif; max-width: 540px; margin-top: 28px; border-top: 2px solid #2d3a4a; padding-top: 16px;">
  <tr>
    <td style="vertical-align: top; padding-right: 16px;">
      <img src="${APP_URL}/assets/vantoos-logo.png" alt="VantoOS" width="64" height="48" style="display: block; object-fit: contain;" />
    </td>
    <td style="vertical-align: top;">
      <p style="margin: 0 0 2px 0; font-size: 16px; font-weight: bold; color: #1a1a1a;">Vanto Vanto</p>
      <p style="margin: 0 0 2px 0; font-size: 13px; color: #2d3a4a; font-weight: 600;">Founder — VantoOS</p>
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7b6a;">Plan. Fund. Deliver.</p>
      <table cellpadding="0" cellspacing="0" border="0">
        <tr><td style="padding-right: 6px;"><span style="font-size: 12px; color: #666;">📧</span></td><td><a href="mailto:vanto@onlinecourseformlm.com" style="font-size: 13px; color: #333; text-decoration: none;">vanto@onlinecourseformlm.com</a></td></tr>
        <tr><td style="padding-right: 6px; padding-top: 4px;"><span style="font-size: 12px; color: #666;">🌐</span></td><td style="padding-top: 4px;"><a href="https://getwellafrica.com" style="font-size: 13px; color: #2d3a4a; text-decoration: none; font-weight: 500;">onlinecourseformlm.com</a></td></tr>
      </table>
    </td>
  </tr>
</table>`;

function getBranding(brand: string) {
  if (brand === "vantoos") {
    return { header: VANTOOS_HEADER, signature: VANTOOS_SIGNATURE, unsubText: "You're receiving this because you joined VantoOS." };
  }
  return { header: APLGO_HEADER, signature: APLGO_SIGNATURE, unsubText: "You're receiving this email because you registered in APLGO." };
}

/** Normalize provider message IDs for consistent storage */
function normalizeId(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.replace(/[<>\s]/g, "").trim() || null;
}

/** Resolve the reply account for a brand/user — exact match only, no cross-brand fallback */
async function resolveReplyAccount(adminClient: any, userId: string, brand: string): Promise<{ id: string; email: string } | null> {
  const { data } = await adminClient
    .from("zazi_reply_accounts")
    .select("id, account_email")
    .eq("user_id", userId)
    .eq("brand", brand)
    .eq("is_active", true)
    .limit(1);
  if (data?.length) return { id: data[0].id, email: data[0].account_email };
  console.warn(`missing_brand_reply_account: no active reply account for user_id=${userId} brand=${brand}`);
  return null;
}

// ── Track outbound send ──
async function trackOutboundSend(adminClient: any, params: {
  user_id: string;
  account_id?: string | null;
  recipient_email: string;
  subject: string;
  brand: string;
  broadcast_id?: string | null;
  sequence_id?: string | null;
  sequence_step_index?: number | null;
  prospect_id?: string | null;
  provider_message_id?: string | null;
  provider_thread_id?: string | null;
}) {
  try {
    await adminClient.from("zazi_outbound_sends").insert({
      user_id: params.user_id,
      account_id: params.account_id || null,
      recipient_email: params.recipient_email,
      subject: params.subject,
      brand: params.brand,
      broadcast_id: params.broadcast_id || null,
      sequence_id: params.sequence_id || null,
      sequence_step_index: params.sequence_step_index ?? null,
      prospect_id: params.prospect_id || null,
      provider_message_id: normalizeId(params.provider_message_id),
      provider_thread_id: params.provider_thread_id || null,
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Failed to track outbound send:", e);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      const { header, signature } = getBranding(body.brand || "aplgo");
      const personalizedContent = (body.content || "").replace(/\{\{first_name\}\}/g, "Leader Test User");

      await resend.emails.send({
        from: `${body.from_name || "Vanto Zazi"} <vanto@onlinecourseformlm.com>`,
        to: [body.test_email],
        subject: `[TEST] ${body.subject || "(no subject)"}`,
        html: `${header}${personalizedContent}${signature}<p style="font-size: 11px; color: #999; margin-top: 16px;">This is a test email.</p>`,
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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: broadcast, error: broadcastError } = await adminClient
      .from("broadcasts")
      .select("*")
      .eq("id", broadcast_id)
      .single();

    if (broadcastError || !broadcast) {
      return new Response(JSON.stringify({ error: "Broadcast not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (broadcast.status === "sent" || broadcast.status === "sending") {
      return new Response(JSON.stringify({ error: "Broadcast already sent or sending" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brand = broadcast.brand || "aplgo";
    const { header, signature, unsubText } = getBranding(brand);

    // Resolve reply account for this user+brand — required for tracked sends
    const replyAccount = await resolveReplyAccount(adminClient, userId, brand);
    if (!replyAccount) {
      await adminClient.from("broadcasts").update({ status: "failed" }).eq("id", broadcast_id);
      return new Response(JSON.stringify({ error: "missing_brand_reply_account", detail: `No active reply account for brand "${brand}". Configure one in Email → Settings before sending.` }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const accountId = replyAccount.id;
    const replyToEmail = replyAccount.email;

    await adminClient.from("broadcasts").update({ status: "sending" }).eq("id", broadcast_id);

    // Get active subscribers
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
        }).select("id, email, first_name, unsubscribe_token");
        subscribers = data;
        subError = error;
      } else {
        const { data, error } = await adminClient
          .from("prospects")
          .select("id, email, first_name, unsubscribe_token")
          .eq("unsubscribed", false);
        subscribers = data;
        subError = error;
      }
    } else {
      const { data, error } = await adminClient
        .from("prospects")
        .select("id, email, first_name, unsubscribe_token")
        .eq("unsubscribed", false);
      subscribers = data;
      subError = error;
    }

    if (subError || !subscribers) {
      await adminClient.from("broadcasts").update({ status: "failed" }).eq("id", broadcast_id);
      return new Response(JSON.stringify({ error: "Failed to fetch subscribers" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Support resuming: exclude emails that were already sent
    if (body.exclude_emails && Array.isArray(body.exclude_emails)) {
      const excludeSet = new Set(body.exclude_emails.map((e: string) => e.toLowerCase()));
      subscribers = subscribers.filter((s: any) => !excludeSet.has(s.email?.toLowerCase()));
      console.log(`Filtered out ${body.exclude_emails.length} already-sent emails, ${subscribers.length} remaining`);
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      await adminClient.from("broadcasts").update({ status: "failed" }).eq("id", broadcast_id);
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resend = new Resend(resendKey);
    let sent = 0;
    let failed = 0;

    for (let i = 0; i < subscribers.length; i++) {
      const sub = subscribers[i];
      try {
        const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${sub.unsubscribe_token || ""}`;
        const personalizedContent = broadcast.content
          .replace(/\{\{first_name\}\}/g, `Leader ${sub.first_name || "Friend"}`);

        const sendResult = await sendWithRetry(resend, {
          from: `${broadcast.from_name} <${replyToEmail}>`,
          reply_to: replyToEmail,
          to: [sub.email],
          subject: broadcast.subject,
          html: `${header}${personalizedContent}${signature}<p style="font-size: 11px; color: #999; margin-top: 16px;">${unsubText}<br/><a href="${unsubscribeUrl}" style="color:#999; text-decoration: underline;">Unsubscribe</a></p>`,
        });

        await trackOutboundSend(adminClient, {
          user_id: userId,
          account_id: accountId,
          recipient_email: sub.email,
          subject: broadcast.subject,
          brand,
          broadcast_id: broadcast.id,
          prospect_id: sub.id || null,
          provider_message_id: sendResult?.data?.id || null,
        });

        // Log CRM activity for outbound email
        try {
          await adminClient.from("contact_activities").insert({
            user_id: userId,
            prospect_id: sub.id || null,
            activity_type: "email",
            notes: `Email Sent: ${broadcast.subject}`,
            outcome: "sent",
          });
        } catch (actErr) {
          console.error("Failed to log email activity:", actErr);
        }

        sent++;
        console.log(`Sent ${sent}/${subscribers.length}: ${sub.email}`);
      } catch (e) {
        console.error(`Failed to send to ${sub.email}:`, e);
        failed++;
      }

      if (i < subscribers.length - 1) await throttle(600);
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
      .eq("id", broadcast_id);

    console.log(`Broadcast complete: ${sent} sent, ${failed} failed out of ${subscribers.length}`);

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: subscribers.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("send-broadcast error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});