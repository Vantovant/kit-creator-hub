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

/** Normalize provider message IDs */
function normalizeId(id: string | null | undefined): string | null {
  if (!id) return null;
  return id.replace(/[<>\s]/g, "").trim() || null;
}

/** Resolve reply account — exact user+brand match only, no cross-brand fallback */
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();
    const { data: broadcasts, error: fetchError } = await adminClient
      .from("broadcasts")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_at", now);

    const resendKey = Deno.env.get("RESEND_API_KEY");

    let processed = 0;

    if (!fetchError && broadcasts && broadcasts.length > 0 && resendKey) {
      const resend = new Resend(resendKey);

      for (const broadcast of broadcasts) {
        await adminClient
          .from("broadcasts")
          .update({ status: "sending" })
          .eq("id", broadcast.id);

        const brand = broadcast.brand || "aplgo";
        // Resolve reply account — required for tracked sends
        const replyAccount = await resolveReplyAccount(adminClient, broadcast.user_id, brand);
        if (!replyAccount) {
          console.error(`missing_brand_reply_account: skipping broadcast ${broadcast.id} for brand=${brand} user=${broadcast.user_id}`);
          await adminClient.from("broadcasts").update({ status: "failed" }).eq("id", broadcast.id);
          processed++;
          continue;
        }
        const accountId = replyAccount.id;
        const replyToEmail = replyAccount.email;

        let subscribers: any[] | null = null;

        if (broadcast.segment_id) {
          const { data: segment } = await adminClient
            .from("segments")
            .select("filters")
            .eq("id", broadcast.segment_id)
            .maybeSingle();

          if (segment?.filters) {
            const { data } = await adminClient.rpc("get_segment_prospects", {
              segment_filters: segment.filters,
            }).select("id, email, first_name, unsubscribe_token");
            subscribers = data;
          } else {
            const { data } = await adminClient
              .from("prospects")
              .select("id, email, first_name, unsubscribe_token")
              .eq("unsubscribed", false);
            subscribers = data;
          }
        } else {
          const { data } = await adminClient
            .from("prospects")
            .select("id, email, first_name, unsubscribe_token")
            .eq("unsubscribed", false);
          subscribers = data;
        }

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

        for (let i = 0; i < subscribers.length; i += 3) {
          const batch = subscribers.slice(i, i + 3);
          const promises = batch.map(async (sub) => {
            try {
              const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${sub.unsubscribe_token || ""}`;
              const personalizedContent = broadcast.content
                .replace(/\{\{first_name\}\}/g, `Leader ${sub.first_name || "Friend"}`);

              const sendResult = await sendWithRetry(resend, {
                from: `${broadcast.from_name} <${replyToEmail}>`,
                reply_to: replyToEmail,
                to: [sub.email],
                subject: broadcast.subject,
                html: `${EMAIL_HEADER}${personalizedContent}${EMAIL_SIGNATURE}<p style="font-size: 11px; color: #999; margin-top: 16px;">You're receiving this email because you signed up.<br/><a href="${unsubscribeUrl}" style="color:#999; text-decoration: underline;">Unsubscribe</a></p>`,
              });

              await trackOutboundSend(adminClient, {
                user_id: broadcast.user_id,
                account_id: accountId,
                recipient_email: sub.email,
                subject: broadcast.subject,
                brand,
                broadcast_id: broadcast.id,
                prospect_id: sub.id || null,
                provider_message_id: sendResult?.data?.id || null,
              });

              sent++;
            } catch (e) {
              console.error(`Failed to send to ${sub.email}:`, e);
              failed++;
            }
          });
          await Promise.all(promises);
          if (i + 3 < subscribers.length) await throttle(1000);
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
    }

    // --- Process automation queue (limited to 5 per run) ---
    let queueProcessed = 0;
    const { data: dueItems } = await adminClient
      .from("automation_queue")
      .select("*")
      .eq("status", "pending")
      .lte("send_at", now)
      .order("send_at", { ascending: true })
      .limit(5);

    if (dueItems && dueItems.length > 0 && resendKey) {
      const resendForQueue = new Resend(resendKey);

      for (const item of dueItems) {
        try {
          await adminClient
            .from("automation_queue")
            .update({ status: "processing" })
            .eq("id", item.id);

          const step = item.step_data as any;
          const email = item.email;
          const firstName = `Leader ${item.first_name || "Friend"}`;

          if (step.type === "send_email") {
            const { data: prospect } = await adminClient
              .from("prospects")
              .select("id, unsubscribe_token, unsubscribed")
              .eq("email", email)
              .maybeSingle();

            if (prospect?.unsubscribed) {
              await adminClient
                .from("automation_queue")
                .update({ status: "cancelled", processed_at: new Date().toISOString() })
                .eq("automation_id", item.automation_id)
                .eq("email", email)
                .eq("status", "pending");
              
              await adminClient
                .from("automation_queue")
                .update({ status: "cancelled", processed_at: new Date().toISOString() })
                .eq("id", item.id);
              
              console.log(`Cancelled queue for unsubscribed ${email}`);
              continue;
            }

            // Resolve real sequence owner from email_sequences
            const { data: seqData } = await adminClient
              .from("email_sequences")
              .select("user_id, brand")
              .eq("id", item.automation_id)
              .maybeSingle();

            const realOwnerId = seqData?.user_id || null;
            const seqBrand = seqData?.brand || "aplgo";
            const queueReplyAccount = realOwnerId ? await resolveReplyAccount(adminClient, realOwnerId, seqBrand) : null;
            if (!queueReplyAccount) {
              console.error(`missing_brand_reply_account: skipping queued sequence step for email=${email} brand=${seqBrand} user=${realOwnerId}`);
              await adminClient.from("automation_queue").update({ status: "failed", processed_at: new Date().toISOString() }).eq("id", item.id);
              continue;
            }
            const queueAccountId = queueReplyAccount.id;
            const queueReplyToEmail = queueReplyAccount.email;

            const unsubUrl = `${APP_URL}/unsubscribe?token=${prospect?.unsubscribe_token || ""}`;
            const personalizedContent = (step.content || "")
              .replace(/\{\{first_name\}\}/g, firstName);
            const personalizedSubject = (step.subject || "")
              .replace(/\{\{first_name\}\}/g, firstName);

            const sendResult = await sendWithRetry(resendForQueue, {
              from: `${step.from_name || "Vanto Zazi"} <${queueReplyToEmail}>`,
              reply_to: queueReplyToEmail,
              to: [email],
              subject: personalizedSubject,
              html: `${EMAIL_HEADER}${personalizedContent}${EMAIL_SIGNATURE}<p style="font-size: 11px; color: #999; margin-top: 16px;">You're receiving this email because you signed up.<br/><a href="${unsubUrl}" style="color:#999; text-decoration: underline;">Unsubscribe</a></p>`,
            });

            // Track with real owner, not placeholder
            if (realOwnerId) {
              await trackOutboundSend(adminClient, {
                user_id: realOwnerId,
                account_id: queueAccountId,
                recipient_email: email,
                subject: personalizedSubject,
                brand: seqBrand,
                sequence_id: item.automation_id,
                sequence_step_index: item.step_index,
                prospect_id: prospect?.id || null,
                provider_message_id: sendResult?.data?.id || null,
              });
            } else {
              console.warn(`Could not resolve owner for sequence ${item.automation_id} — outbound send not tracked`);
            }

            console.log(`Queue: sent automation email to ${email} — ${personalizedSubject}`);
          } else if (step.type === "add_tag" && step.tag_name) {
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
                .upsert({ prospect_id: prospect.id, tag_id: tag.id }, { onConflict: "prospect_id,tag_id" })
                .select();
            }
          }

          await adminClient
            .from("automation_queue")
            .update({ status: "sent", processed_at: new Date().toISOString() })
            .eq("id", item.id);

          queueProcessed++;
          await throttle(600);
        } catch (e) {
          console.error(`Queue processing failed for ${item.id}:`, e);
          await adminClient
            .from("automation_queue")
            .update({ status: "failed", processed_at: new Date().toISOString() })
            .eq("id", item.id);
        }
      }
    }

    // --- Auto-check A/B test winners ---
    let abChecked = 0;
    const { data: runningTests } = await adminClient
      .from("ab_tests")
      .select("*")
      .eq("status", "running");

    if (runningTests && runningTests.length > 0) {
      for (const test of runningTests) {
        const startedAt = new Date(test.started_at).getTime();
        const durationMs = (test.duration_hours || 4) * 60 * 60 * 1000;
        if (Date.now() < startedAt + durationMs) continue;

        const results = (test.results || {}) as Record<string, any>;
        const metric = test.winning_metric;
        const eventType = metric === "clicks" ? "%clicked%" : "%opened%";
        let bestScore = -1;
        let winner = "";

        for (const [variantId, variantData] of Object.entries(results) as [string, any][]) {
          if (!variantData.broadcast_id) continue;
          const { count } = await adminClient
            .from("email_events")
            .select("*", { count: "exact", head: true })
            .eq("broadcast_id", variantData.broadcast_id)
            .ilike("event_type", eventType);

          const rate = variantData.sent > 0 ? (count || 0) / variantData.sent : 0;
          results[variantId] = { ...variantData, [`${metric}_count`]: count || 0, [`${metric}_rate`]: rate };
          if (rate > bestScore) { bestScore = rate; winner = variantId; }
        }

        await adminClient.from("ab_tests").update({
          status: "completed",
          winner_variant: winner,
          results,
          completed_at: new Date().toISOString(),
        }).eq("id", test.id);
        abChecked++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed, queue_processed: queueProcessed, ab_tests_checked: abChecked }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("process-scheduled-broadcasts error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});