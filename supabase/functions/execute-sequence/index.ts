import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@^2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://kit-clone-dashboard.lovable.app";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { sequence_id, email, first_name } = await req.json();

    if (!sequence_id || !email) {
      return new Response(JSON.stringify({ error: "sequence_id and email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the sequence
    const { data: seq, error: seqErr } = await adminClient
      .from("email_sequences")
      .select("id, steps")
      .eq("id", sequence_id)
      .eq("status", "active")
      .maybeSingle();

    if (seqErr || !seq) {
      return new Response(JSON.stringify({ error: "Sequence not found or inactive" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const steps = seq.steps as any[];
    if (!steps || steps.length === 0) {
      return new Response(JSON.stringify({ message: "Sequence has no steps" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate enrollment
    const { data: existing } = await adminClient
      .from("automation_queue")
      .select("id")
      .eq("automation_id", sequence_id)
      .eq("email", email)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ message: "Already enrolled in this sequence" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendKey ? new Resend(resendKey) : null;
    const firstName = first_name || "there";

    // Get prospect info for unsubscribe link
    const { data: prospect } = await adminClient
      .from("prospects")
      .select("unsubscribe_token, unsubscribed")
      .eq("email", email)
      .maybeSingle();

    if (prospect?.unsubscribed) {
      return new Response(JSON.stringify({ message: "Subscriber is unsubscribed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
          const personalizedContent = (step.content || "").replace(/\{\{first_name\}\}/g, firstName);
          const personalizedSubject = (step.subject || "").replace(/\{\{first_name\}\}/g, firstName);

          try {
            await resend.emails.send({
              from: `${step.from_name || "Vanto Zazi"} <vanto@onlinecourseformlm.com>`,
              to: [email],
              subject: personalizedSubject,
              html: `${personalizedContent}${EMAIL_SIGNATURE}<p style="font-size: 11px; color: #999; margin-top: 16px;">You're receiving this because you signed up.<br/><a href="${unsubUrl}" style="color:#999; text-decoration: underline;">Unsubscribe</a></p>`,
            });
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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
