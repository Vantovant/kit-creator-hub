import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@^2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://kit-clone-dashboard.lovable.app";

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
        <tr><td style="padding-right: 6px; padding-top: 4px;"><span style="font-size: 12px; color: #666;">🌐</span></td><td style="padding-top: 4px;"><a href="https://onlinecourseformlm.com" style="font-size: 13px; color: #1a3a8a; text-decoration: none; font-weight: 500;">onlinecourseformlm.com</a></td></tr>
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
        <tr><td style="padding-right: 6px; padding-top: 4px;"><span style="font-size: 12px; color: #666;">🌐</span></td><td style="padding-top: 4px;"><a href="https://onlinecourseformlm.com" style="font-size: 13px; color: #2d3a4a; text-decoration: none; font-weight: 500;">onlinecourseformlm.com</a></td></tr>
      </table>
    </td>
  </tr>
</table>`;

function getBranding(brand: string) {
  if (brand === "vantoos") {
    return { header: VANTOOS_HEADER, signature: VANTOOS_SIGNATURE, unsubText: "You're receiving this because you joined VantoOS." };
  }
  return { header: APLGO_HEADER, signature: APLGO_SIGNATURE, unsubText: "You're receiving this because you signed up." };
}

/** Normalize provider message IDs */
function normalizeId(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.replace(/[<>\s]/g, "").trim() || null;
}

/** Resolve the reply account — exact user+brand match only, no cross-brand fallback */
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
  sequence_id?: string | null;
  sequence_step_index?: number | null;
  broadcast_id?: string | null;
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
      sequence_id: params.sequence_id || null,
      sequence_step_index: params.sequence_step_index ?? null,
      broadcast_id: params.broadcast_id || null,
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { sequence_id, email, first_name, ref_code } = await req.json();
    const safeRefCode = ref_code && typeof ref_code === "string"
      ? ref_code.trim().slice(0, 80).replace(/[^a-zA-Z0-9\-_]/g, "")
      : "";

    if (!sequence_id || !email) {
      return new Response(JSON.stringify({ error: "sequence_id and email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the sequence (including brand + real owner user_id)
    const { data: seq, error: seqErr } = await adminClient
      .from("email_sequences")
      .select("id, steps, brand, user_id")
      .eq("id", sequence_id)
      .eq("status", "active")
      .maybeSingle();

    if (seqErr || !seq) {
      return new Response(JSON.stringify({ error: "Sequence not found or inactive" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const steps = seq.steps as any[];
    if (!steps || steps.length === 0) {
      return new Response(JSON.stringify({ message: "Sequence has no steps" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const brand = seq.brand || "aplgo";
    const sequenceOwnerId = seq.user_id;
    const { header, signature, unsubText } = getBranding(brand);

    // Resolve reply account for the sequence owner — required for tracked sends
    const replyAccount = await resolveReplyAccount(adminClient, sequenceOwnerId, brand);
    if (!replyAccount) {
      return new Response(JSON.stringify({ error: "missing_brand_reply_account", detail: `No active reply account for brand "${brand}". Configure one in Email → Settings before enrolling.` }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const accountId = replyAccount.id;
    const replyToEmail = replyAccount.email;

    // Check for duplicate enrollment
    const { data: existing } = await adminClient
      .from("automation_queue")
      .select("id")
      .eq("automation_id", sequence_id)
      .eq("email", email)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ message: "Already enrolled in this sequence" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendKey ? new Resend(resendKey) : null;
    const firstName = first_name || "there";

    // Get prospect info
    const { data: prospect } = await adminClient
      .from("prospects")
      .select("id, unsubscribe_token, unsubscribed")
      .eq("email", email)
      .maybeSingle();

    if (prospect?.unsubscribed) {
      return new Response(JSON.stringify({ message: "Subscriber is unsubscribed" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const unsubUrl = `${APP_URL}/unsubscribe?token=${prospect?.unsubscribe_token || ""}`;

    let cumulativeDelayHours = 0;
    let hitWait = false;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      if (step.type === "wait") {
        cumulativeDelayHours += step.duration_hours || 0;
        hitWait = true;
        continue;
      }

      if (step.type === "send_email") {
        if (!hitWait && resend) {
          // Send immediately
          const personalizedContent = (step.content || "")
            .replace(/\{\{first_name\}\}/g, firstName)
            .replace(/\{\{ref_code\}\}/g, safeRefCode);
          const personalizedSubject = (step.subject || "")
            .replace(/\{\{first_name\}\}/g, firstName)
            .replace(/\{\{ref_code\}\}/g, safeRefCode);

          try {
            const sendResult = await resend.emails.send({
              from: `${step.from_name || "Vanto Zazi"} <${replyToEmail}>`,
              reply_to: replyToEmail,
              to: [email],
              subject: personalizedSubject,
              html: `${header}${personalizedContent}${signature}<p style="font-size: 11px; color: #999; margin-top: 16px;">${unsubText}<br/><a href="${unsubUrl}" style="color:#999; text-decoration: underline;">Unsubscribe</a></p>`,
            });

            await trackOutboundSend(adminClient, {
              user_id: sequenceOwnerId,
              account_id: accountId,
              recipient_email: email,
              subject: personalizedSubject,
              brand,
              sequence_id: seq.id,
              sequence_step_index: i,
              prospect_id: prospect?.id || null,
              provider_message_id: sendResult?.data?.id || null,
            });

            // Log CRM activity for sequence email
            try {
              await adminClient.from("contact_activities").insert({
                user_id: sequenceOwnerId,
                prospect_id: prospect?.id || null,
                activity_type: "email",
                notes: `Sequence Email Sent: ${personalizedSubject}`,
                outcome: "sent",
              });
            } catch (actErr) {
              console.error("Failed to log sequence email activity:", actErr);
            }

            console.log(`Sequence email sent to ${email}: ${personalizedSubject}`);
          } catch (sendErr) {
            console.error(`Failed to send sequence email to ${email}:`, sendErr);
          }
        } else {
          // Queue for later
          const sendAt = new Date(Date.now() + cumulativeDelayHours * 60 * 60 * 1000).toISOString();
          await adminClient.from("automation_queue").insert({
            automation_id: sequence_id,
            email,
            first_name: firstName,
            step_index: i,
            step_data: step,
            send_at: sendAt,
            status: "pending",
          });
          console.log(`Queued sequence step ${i} for ${email} at ${sendAt}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: `Enrolled ${email} in sequence` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("execute-sequence error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});