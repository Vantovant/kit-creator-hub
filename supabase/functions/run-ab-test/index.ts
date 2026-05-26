import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@^2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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
    const { action } = body;

    if (action === "start") {
      return await startABTest(body, adminClient, userId);
    } else if (action === "check_winner") {
      return await checkWinner(body, adminClient);
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("run-ab-test error:", err);
    return new Response(JSON.stringify({ error: "An error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function startABTest(body: any, adminClient: any, userId: string) {
  const { ab_test_id, broadcast_content, from_name } = body;

  const { data: test, error: testError } = await adminClient
    .from("ab_tests")
    .select("*")
    .eq("id", ab_test_id)
    .single();

  if (testError || !test) {
    return new Response(JSON.stringify({ error: "A/B test not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (test.status !== "draft") {
    return new Response(JSON.stringify({ error: "A/B test already started" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
  const variants = test.variants as any[];

  // Get all active subscribers
  const { data: allSubscribers } = await adminClient
    .from("prospects")
    .select("email, first_name, unsubscribe_token")
    .eq("unsubscribed", false);

  if (!allSubscribers || allSubscribers.length === 0) {
    return new Response(JSON.stringify({ error: "No active subscribers" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Shuffle and split into test pool
  const shuffled = shuffleArray(allSubscribers);
  const testPoolSize = Math.floor(shuffled.length * (test.test_size_percent / 100));
  const testPool = shuffled.slice(0, testPoolSize);
  const subsPerVariant = Math.floor(testPool.length / variants.length);

  const results: Record<string, any> = {};

  // Send each variant to its subset
  for (let v = 0; v < variants.length; v++) {
    const variant = variants[v];
    const variantSubs = testPool.slice(v * subsPerVariant, (v + 1) * subsPerVariant);
    let sent = 0;
    let failed = 0;

    // Create a broadcast record for tracking
    const { data: broadcast } = await adminClient
      .from("broadcasts")
      .insert({
        subject: variant.subject,
        preview_text: variant.previewText || "",
        content: broadcast_content || "",
        from_name: from_name || "Vanto Zazi",
        reply_to: "vanto@reply.onlinecourseformlm.com",
        status: "sending",
        user_id: userId,
      })
      .select("id")
      .single();

    for (let i = 0; i < variantSubs.length; i += 10) {
      const batch = variantSubs.slice(i, i + 10);
      const promises = batch.map(async (sub) => {
        try {
          const unsubUrl = `${appUrl}/unsubscribe?token=${sub.unsubscribe_token || ""}`;
          const content = (broadcast_content || "").replace(/\{\{first_name\}\}/g, `Leader ${sub.first_name || "Friend"}`);
          await resend.emails.send({
            from: `${from_name || "Vanto Zazi"} <vanto@onlinecourseformlm.com>`,
            to: [sub.email],
            subject: variant.subject,
            html: `${content}<hr style="margin:24px 0;border:none;border-top:1px solid #eee;"/><p style="font-size:12px;color:#999;"><a href="${unsubUrl}" style="color:#999;">Unsubscribe</a></p>`,
          });
          sent++;
        } catch {
          failed++;
        }
      });
      await Promise.all(promises);
    }

    if (broadcast) {
      await adminClient.from("broadcasts").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        total_recipients: variantSubs.length,
        total_sent: sent,
        total_failed: failed,
      }).eq("id", broadcast.id);
    }

    results[variant.id] = {
      broadcast_id: broadcast?.id,
      sent,
      failed,
      total: variantSubs.length,
    };
  }

  // Update test status
  await adminClient.from("ab_tests").update({
    status: "running",
    started_at: new Date().toISOString(),
    results,
  }).eq("id", ab_test_id);

  return new Response(
    JSON.stringify({ success: true, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function checkWinner(body: any, adminClient: any) {
  const { ab_test_id } = body;

  const { data: test } = await adminClient
    .from("ab_tests")
    .select("*")
    .eq("id", ab_test_id)
    .single();

  if (!test || test.status !== "running") {
    return new Response(JSON.stringify({ error: "Test not running" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const results = test.results as Record<string, any>;
  const metric = test.winning_metric; // 'opens' or 'clicks'
  const eventType = metric === "clicks" ? "%clicked%" : "%opened%";

  const variantScores: Record<string, number> = {};

  for (const [variantId, variantData] of Object.entries(results)) {
    if (!variantData.broadcast_id) continue;

    const { count } = await adminClient
      .from("email_events")
      .select("*", { count: "exact", head: true })
      .eq("broadcast_id", variantData.broadcast_id)
      .ilike("event_type", eventType);

    const rate = variantData.sent > 0 ? (count || 0) / variantData.sent : 0;
    variantScores[variantId] = rate;
    results[variantId] = { ...variantData, [`${metric}_count`]: count || 0, [`${metric}_rate`]: rate };
  }

  // Find winner
  let winner = "";
  let bestScore = -1;
  for (const [id, score] of Object.entries(variantScores)) {
    if (score > bestScore) {
      bestScore = score;
      winner = id;
    }
  }

  await adminClient.from("ab_tests").update({
    status: "completed",
    winner_variant: winner,
    results,
    completed_at: new Date().toISOString(),
  }).eq("id", ab_test_id);

  return new Response(
    JSON.stringify({ success: true, winner, scores: variantScores, results }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
