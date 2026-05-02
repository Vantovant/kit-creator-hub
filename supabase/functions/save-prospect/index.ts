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
    // Simple in-memory rate limiting (resets on cold start)
    const body = await req.json();
    const { email, first_name, source, sequence_id, ref_code } = body;

    // Sanitize ref_code (pass-through only, not persisted) — alphanumeric + - _ up to 80 chars
    const sanitizedRefCode = ref_code && typeof ref_code === "string"
      ? ref_code.trim().slice(0, 80).replace(/[^a-zA-Z0-9\-_]/g, "")
      : null;

    // Server-side validation
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail) || trimmedEmail.length > 255) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sanitizedName = first_name
      ? String(first_name).trim().slice(0, 100).replace(/[<>]/g, "")
      : null;

    const allowedSources = [
      "welcome_form", "website_embed", "csv_import", "sequence_form", "vantoos_beta_form",
      "nrm_bridge", "nrm_bridge_section", "rlx_bridge", "rlx_bridge_section",
      "nrm_gut_bridge", "nrm_gut_bridge_section",
      // Daily Range cluster bridges (Immunity / Energy / Detox)
      "grw_bridge_section", "gts_bridge_section",
      "sld_bridge_section", "stp_bridge_section",
      "pwr-lemon_bridge_section", "pwr-apricot_bridge_section",
      // Premium bridges
      "alt_premium_bridge_section", "hpr_premium_bridge_section", "hrt_premium_bridge_section",
      "ice_premium_bridge_section", "mls_premium_bridge_section", "lft_premium_bridge_section",
      // Elite bridges
      "bty_elite_bridge_section", "air_elite_bridge_section", "hpy_elite_bridge_section",
      "brn_elite_bridge_section", "pft_elite_bridge_section", "terra_elite_bridge_section",
    ];
    const sanitizedSource = allowedSources.includes(source) ? source : "welcome_form";

    // Cluster source → sequence_id mapping (final routing 2026-05-01).
    // SLD is NOT detox; SLD + STP go to the Comfort & Mobility bridge.
    // GTS moves to Energy alongside PWR Lemon and PWR Apricot.
    // GRW is the only product in the Immunity bridge.
    const IMMUNITY_BRIDGE_ID = "462db47a-7d6e-47f1-92d2-640e13683cbd";
    const ENERGY_BRIDGE_ID = "d9f83f1f-eb64-47fd-ae87-26c65821e4c9";
    const COMFORT_MOBILITY_BRIDGE_ID = "5738da89-3a6e-45e9-8db9-4aadb48e507f"; // repurposed from old Detox row
    const CLUSTER_SEQUENCE_MAP: Record<string, string> = {
      grw_bridge_section: IMMUNITY_BRIDGE_ID,
      gts_bridge_section: ENERGY_BRIDGE_ID,
      "pwr-lemon_bridge_section": ENERGY_BRIDGE_ID,
      "pwr-apricot_bridge_section": ENERGY_BRIDGE_ID,
      sld_bridge_section: COMFORT_MOBILITY_BRIDGE_ID,
      stp_bridge_section: COMFORT_MOBILITY_BRIDGE_ID,
    };
    const resolvedSequenceId = (sequence_id && typeof sequence_id === "string")
      ? sequence_id
      : (CLUSTER_SEQUENCE_MAP[sanitizedSource] || null);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: dbError } = await supabase.from("prospects").upsert(
      { email: trimmedEmail, first_name: sanitizedName, source: sanitizedSource },
      { onConflict: "email" }
    );

    if (dbError) {
      console.error("DB error:", dbError);
      if (dbError.code === "23505") {
        return new Response(JSON.stringify({ error: "Email already registered" }), {
          status: 409,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "Failed to save subscription" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get unsubscribe token for the email link
    const { data: prospect } = await supabase
      .from("prospects")
      .select("unsubscribe_token")
      .eq("email", email)
      .single();

    const unsubscribeToken = prospect?.unsubscribe_token || "";
    const appUrl = Deno.env.get("APP_URL") || "https://kit-clone-dashboard.lovable.app";
    const unsubscribeUrl = `${appUrl}/unsubscribe?token=${unsubscribeToken}`;

    // Send generic welcome email via Resend — ONLY when not enrolling in a specific sequence.
    // Bridge sequences send their own product-specific Day 1 email.
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && !resolvedSequenceId) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "Vanto Zazi <vanto@onlinecourseformlm.com>",
          to: [email],
          subject: "Welcome to Vanto Zazi Mail!",
          html: `
            <h1>Welcome${first_name ? `, ${first_name}` : ""}!</h1>
            <p>Thanks for joining the Vanto Zazi Mail list.</p>
            <p>Insights, tools, and clarity — designed to help you build without burnout.</p>
            <p>Stay tuned!</p>
            <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;" />
            <p style="font-size: 12px; color: #999;">
              <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
            </p>
          `,
        });
        console.log("Welcome email sent to:", email);
      } catch (emailErr) {
        console.error("Email send error (non-fatal):", emailErr);
      }
    }

    // Trigger 'subscribe' automations — only when NOT enrolled into a specific sequence.
    if (!resolvedSequenceId) {
      try {
        await fetch(`${supabaseUrl}/functions/v1/execute-automation`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            trigger_type: "subscribe",
            trigger_data: { email: trimmedEmail, first_name: sanitizedName },
          }),
        });
      } catch (triggerErr) {
        console.error("Automation trigger error (non-fatal):", triggerErr);
      }
    } else {
      console.log(`Skipping generic 'subscribe' automation for ${trimmedEmail} — enrolled in sequence ${resolvedSequenceId} (source=${sanitizedSource})`);
    }

    // If a sequence_id was resolved (explicit or via cluster source map), enroll into it.
    if (resolvedSequenceId) {
      try {
        const { data: seq } = await supabase
          .from("email_sequences")
          .select("id, steps")
          .eq("id", resolvedSequenceId)
          .eq("status", "active")
          .maybeSingle();

        if (seq && Array.isArray(seq.steps) && seq.steps.length > 0) {
          await fetch(`${supabaseUrl}/functions/v1/execute-sequence`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sequence_id: seq.id,
              email: trimmedEmail,
              first_name: sanitizedName,
              ref_code: sanitizedRefCode,
            }),
          });
          console.log(`Enrolled ${trimmedEmail} in sequence ${seq.id} (source=${sanitizedSource})`);
        } else {
          console.warn(`Cluster source ${sanitizedSource} mapped to ${resolvedSequenceId} but sequence not found/inactive`);
        }
      } catch (seqErr) {
        console.error("Sequence enrollment error (non-fatal):", seqErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("save-prospect error:", err);
    return new Response(JSON.stringify({ error: "An error occurred. Please try again." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
