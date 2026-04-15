import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@^2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const APP_URL = "https://kit-clone-dashboard.lovable.app";

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
        <tr><td style="padding-right: 6px; padding-top: 4px;"><span style="font-size: 12px; color: #666;">🌐</span></td><td style="padding-top: 4px;"><a href="https://onlinecourseformlm.com" style="font-size: 13px; color: #1a3a8a; text-decoration: none; font-weight: 500;">onlinecourseformlm.com</a></td></tr>
      </table>
    </td>
  </tr>
</table>`;

function throttle(ms = 700): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function sendWithRetry(resend: any, payload: any, maxRetries = 3): Promise<boolean> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      await resend.emails.send(payload);
      return true;
    } catch (e: any) {
      const is429 = e?.statusCode === 429 || e?.message?.includes("429");
      if (is429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt + 1) * 1000;
        console.log(`Rate limited, retrying in ${delay}ms (attempt ${attempt + 1})`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        throw e;
      }
    }
  }
  return false;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { sequence_id, tag_name } = await req.json();

    if (!sequence_id || !tag_name) {
      return new Response(JSON.stringify({ error: "sequence_id and tag_name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const steps = seq.steps as any[];

    // Use RPC/SQL to get subscribers with this tag (avoids nested .in() 1000 row limit)
    const { data: subscribers, error: subErr } = await adminClient.rpc('get_segment_prospects', {
      segment_filters: {
        match: 'all',
        groups: [{
          match: 'all',
          type: 'include',
          conditions: [
            { field: 'tag', operator: 'has', value: tag_name },
            { field: 'unsubscribed', operator: 'equals', value: 'false' }
          ]
        }]
      }
    });

    if (subErr || !subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ error: "No subscribers found", details: subErr?.message }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${subscribers.length} subscribers with tag "${tag_name}"`);

    // Check who is already enrolled — use pagination to get all
    const enrolledEmails = new Set<string>();
    let offset = 0;
    const pageSize = 1000;
    while (true) {
      const { data: batch } = await adminClient
        .from("automation_queue")
        .select("email")
        .eq("automation_id", sequence_id)
        .range(offset, offset + pageSize - 1);
      if (!batch || batch.length === 0) break;
      batch.forEach(e => enrolledEmails.add(e.email));
      if (batch.length < pageSize) break;
      offset += pageSize;
    }

    const newSubscribers = subscribers.filter((s: any) => !enrolledEmails.has(s.email));

    if (newSubscribers.length === 0) {
      return new Response(JSON.stringify({ message: "All subscribers already enrolled", total: subscribers.length }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`${newSubscribers.length} new subscribers to enroll (${enrolledEmails.size} already enrolled)`);

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const resend = resendKey ? new Resend(resendKey) : null;

    let sent = 0;
    let failed = 0;
    let queued = 0;

    // Process in batches to avoid timeout — queue all steps, send first email in batches
    const BATCH_SIZE = 50; // Process 50 subscribers at a time for queuing

    for (let batchStart = 0; batchStart < newSubscribers.length; batchStart += BATCH_SIZE) {
      const batch = newSubscribers.slice(batchStart, batchStart + BATCH_SIZE);
      const queueRows: any[] = [];

      for (const sub of batch) {
        const firstName = sub.first_name || "there";
        const unsubUrl = `${APP_URL}/unsubscribe?token=${sub.unsubscribe_token || ""}`;

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
              // Send first email immediately
              const personalizedContent = (step.content || "").replace(/\{\{first_name\}\}/g, firstName);
              const personalizedSubject = (step.subject || "").replace(/\{\{first_name\}\}/g, firstName);

              try {
                await sendWithRetry(resend, {
                  from: `${step.from_name || "Vanto Zazi"} <vanto@onlinecourseformlm.com>`,
                  to: [sub.email],
                  subject: personalizedSubject,
                  html: `${EMAIL_HEADER}${personalizedContent}${EMAIL_SIGNATURE}<p style="font-size: 11px; color: #999; margin-top: 16px;">You're receiving this because you signed up.<br/><a href="${unsubUrl}" style="color:#999; text-decoration: underline;">Unsubscribe</a></p>`,
                });
                sent++;
              } catch (sendErr) {
                console.error(`Failed to send to ${sub.email}:`, sendErr);
                failed++;
              }

              await throttle(700);
            } else {
              // Queue for later
              const sendAt = new Date(Date.now() + cumulativeDelayHours * 60 * 60 * 1000).toISOString();
              queueRows.push({
                automation_id: sequence_id,
                email: sub.email,
                first_name: firstName,
                step_index: i,
                step_data: step,
                send_at: sendAt,
                status: "pending",
              });
            }
          }
        }
      }

      // Bulk insert queue rows for this batch
      if (queueRows.length > 0) {
        // Insert in chunks of 500 to avoid payload limits
        for (let ci = 0; ci < queueRows.length; ci += 500) {
          const chunk = queueRows.slice(ci, ci + 500);
          const { error: insertErr } = await adminClient.from("automation_queue").insert(chunk);
          if (insertErr) {
            console.error(`Queue insert error:`, insertErr);
          } else {
            queued += chunk.length;
          }
        }
      }

      console.log(`Batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: ${sent} sent, ${queued} queued`);
    }

    console.log(`Batch enroll complete: ${sent} sent, ${failed} failed, ${queued} queued for ${newSubscribers.length} subscribers`);

    return new Response(
      JSON.stringify({ success: true, enrolled: newSubscribers.length, sent, failed, queued }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("batch-enroll-sequence error:", err);
    return new Response(JSON.stringify({ error: "An error occurred", details: err?.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});