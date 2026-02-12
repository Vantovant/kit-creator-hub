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

      // Get active subscribers (filtered by segment if set)
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
          }).select("email, first_name, unsubscribe_token");
          subscribers = data;
        } else {
          const { data } = await adminClient
            .from("prospects")
            .select("email, first_name, unsubscribe_token")
            .eq("unsubscribed", false);
          subscribers = data;
        }
      } else {
        const { data } = await adminClient
          .from("prospects")
          .select("email, first_name, unsubscribe_token")
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

    // --- Process automation queue ---
    let queueProcessed = 0;
    const { data: dueItems } = await adminClient
      .from("automation_queue")
      .select("*")
      .eq("status", "pending")
      .lte("send_at", now)
      .order("send_at", { ascending: true })
      .limit(50);

    if (dueItems && dueItems.length > 0) {
      const resendForQueue = resendKey ? new Resend(resendKey) : null;

      for (const item of dueItems) {
        try {
          // Mark as processing to prevent duplicate pickup
          await adminClient
            .from("automation_queue")
            .update({ status: "processing" })
            .eq("id", item.id);

          const step = item.step_data as any;
          const email = item.email;
          const firstName = item.first_name || "there";

          if (step.type === "send_email" && resendForQueue) {
            const { data: prospect } = await adminClient
              .from("prospects")
              .select("unsubscribe_token, unsubscribed")
              .eq("email", email)
              .maybeSingle();

            if (prospect?.unsubscribed) {
              // Cancel all remaining queued steps for this subscriber + automation
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

            const unsubUrl = `${appUrl}/unsubscribe?token=${prospect?.unsubscribe_token || ""}`;
            const personalizedContent = (step.content || "")
              .replace(/\{\{first_name\}\}/g, firstName);
            const personalizedSubject = (step.subject || "")
              .replace(/\{\{first_name\}\}/g, firstName);

            const signature = `
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; max-width: 540px; margin-top: 24px; border-top: 2px solid #1a3a8a; padding-top: 16px;">
  <tr>
    <td style="vertical-align: top; padding-right: 16px;">
      <img src="${appUrl}/assets/logo-mlm.jpg" alt="Online Course For MLM" width="90" height="68" style="border-radius: 6px; display: block; object-fit: cover;" />
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

            await resendForQueue.emails.send({
              from: `${step.from_name || "Vanto Zazi"} <vanto@onlinecourseformlm.com>`,
              to: [email],
              subject: personalizedSubject,
              html: `${personalizedContent}${signature}<p style="font-size: 11px; color: #999; margin-top: 16px;">You're receiving this email because you registered in APLGO.<br/><a href="${unsubUrl}" style="color:#999; text-decoration: underline;">Unsubscribe</a></p>`,
            });

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
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
