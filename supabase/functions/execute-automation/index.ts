import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@^2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://kit-clone-dashboard.lovable.app";

// Retry helper with exponential backoff for 429 errors
async function sendWithRetry(
  resend: any,
  emailPayload: any,
  maxRetries = 3
): Promise<void> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await resend.emails.send(emailPayload);
      return;
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
}

// Small delay between sends to avoid bursts
function throttle(ms = 500): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

const EMAIL_HEADER = `
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
        <tr><td style="padding-right: 6px; padding-top: 4px;"><span style="font-size: 12px; color: #666;">🌐</span></td><td style="padding-top: 4px;"><a href="https://getwellafrica.com" style="font-size: 13px; color: #1a3a8a; text-decoration: none; font-weight: 500;">getwellafrica.com</a></td></tr>
      </table>
    </td>
  </tr>
</table>`;

async function executeStep(
  step: any,
  email: string,
  firstName: string,
  resend: any | null,
  adminClient: any
) {
  if (step.type === "send_email" && resend) {
    const { data: prospect } = await adminClient
      .from("prospects")
      .select("unsubscribe_token, unsubscribed")
      .eq("email", email)
      .maybeSingle();

    if (prospect?.unsubscribed) return;

    const unsubUrl = `${APP_URL}/unsubscribe?token=${prospect?.unsubscribe_token || ""}`;
    const personalizedContent = (step.content || "")
      .replace(/\{\{first_name\}\}/g, firstName);
    const personalizedSubject = (step.subject || "")
      .replace(/\{\{first_name\}\}/g, firstName);

    await sendWithRetry(resend, {
      from: `${step.from_name || "Vanto Zazi"} <vanto@onlinecourseformlm.com>`,
      to: [email],
      subject: personalizedSubject,
      html: `${EMAIL_HEADER}${personalizedContent}${EMAIL_SIGNATURE}<p style="font-size: 11px; color: #999; margin-top: 16px;">You're receiving this email because you registered in APLGO.<br/><a href="${unsubUrl}" style="color:#999; text-decoration: underline;">Unsubscribe</a></p>`,
    });
    console.log(`Automation email sent to ${email}: ${personalizedSubject}`);
  } else if (step.type === "add_tag") {
    if (!step.tag_name) return;

    const { data: prospect } = await adminClient
      .from("prospects")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    const { data: tag } = await adminClient
      .from("tags")
      .select("id")
      .eq("name", step.tag_name)
      .maybeSingle();

    if (prospect && tag) {
      await adminClient
        .from("prospect_tags")
        .upsert(
          { prospect_id: prospect.id, tag_id: tag.id },
          { onConflict: "prospect_id,tag_id" }
        )
        .select();
    }
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

    const { trigger_type, trigger_data } = await req.json();
    if (!trigger_type) {
      return new Response(JSON.stringify({ error: "trigger_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: automations, error: autoError } = await adminClient
      .from("automations")
      .select("*")
      .eq("status", "active")
      .eq("trigger_type", trigger_type);

    if (autoError || !automations || automations.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active automations for this trigger", executed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendKey ? new Resend(resendKey) : null;

    let executed = 0;

    for (const automation of automations) {
      const triggerConfig = (automation.trigger_config || {}) as Record<string, any>;
      const workflow = automation.workflow as any[];
      if (!workflow || workflow.length === 0) continue;

      if (trigger_type === "tag_added" && triggerConfig.tag_name) {
        if (trigger_data?.tag_name !== triggerConfig.tag_name) continue;
      }
      if (trigger_type === "link_click" && triggerConfig.link_url) {
        const clickedUrl = trigger_data?.link_url || "";
        if (!clickedUrl.includes(triggerConfig.link_url)) continue;
      }

      const email = trigger_data?.email;
      const firstName = `Leader ${trigger_data?.first_name || "Friend"}`;
      if (!email) continue;

      const { data: existing } = await adminClient
        .from("automation_queue")
        .select("id")
        .eq("automation_id", automation.id)
        .eq("email", email)
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`Skipping duplicate: ${email} already in queue for automation ${automation.id}`);
        continue;
      }

      let cumulativeDelayHours = 0;
      let hitWait = false;

      for (let i = 0; i < workflow.length; i++) {
        const step = workflow[i];

        if (step.type === "wait") {
          cumulativeDelayHours += step.duration_hours || 0;
          hitWait = true;
          continue;
        }

        if (!hitWait) {
          await executeStep(step, email, firstName, resend, adminClient);
          // Throttle between immediate sends
          await throttle(500);
        } else {
          const sendAt = new Date(Date.now() + cumulativeDelayHours * 60 * 60 * 1000).toISOString();
          await adminClient.from("automation_queue").insert({
            automation_id: automation.id,
            email,
            first_name: firstName,
            step_index: i,
            step_data: step,
            send_at: sendAt,
            status: "pending",
          });
          console.log(`Queued step ${i} for ${email} at ${sendAt}`);
        }
      }

      executed++;
    }

    return new Response(
      JSON.stringify({ success: true, executed, total_automations: automations.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("execute-automation error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
