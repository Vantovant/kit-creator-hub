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
    const { email, first_name, source } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { error: dbError } = await supabase.from("prospects").upsert(
      { email, first_name: first_name || null, source: source || "welcome_form" },
      { onConflict: "email" }
    );

    if (dbError) {
      console.error("DB error:", dbError);
      throw new Error(dbError.message);
    }

    // Send welcome email via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      try {
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: "Vanto Zazi <onboarding@resend.dev>",
          to: [email],
          subject: "Welcome to Vanto Zazi Mail!",
          html: `
            <h1>Welcome${first_name ? `, ${first_name}` : ""}!</h1>
            <p>Thanks for joining the Vanto Zazi Mail list.</p>
            <p>Insights, tools, and clarity — designed to help you build without burnout.</p>
            <p>Stay tuned!</p>
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
