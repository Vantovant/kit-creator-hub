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
    // Rate limiting via in-memory tracking (resets on cold start, but sufficient for basic protection)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") || "unknown";

    const kv = await Deno.openKv();
    const key = ["ratelimit", "save-prospect", clientIp];
    const current = await kv.get<number>(key);
    if (current.value && current.value >= 5) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    await kv.set(key, (current.value || 0) + 1, { expireIn: 3600000 });
    const { email, first_name, source } = await req.json();

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

    const allowedSources = ["welcome_form", "website_embed", "csv_import"];
    const sanitizedSource = allowedSources.includes(source) ? source : "welcome_form";

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

    // Send welcome email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
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
