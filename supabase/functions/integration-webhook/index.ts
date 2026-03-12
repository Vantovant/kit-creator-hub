import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

/**
 * integration-webhook: Accepts inbound webhooks from connected integrations (e.g. Zapier)
 * and maps them to CRM activities in contact_activities.
 *
 * Zapier payload format:
 * {
 *   "action": "log_activity",
 *   "email": "prospect@example.com",
 *   "activity_type": "call" | "whatsapp" | "meeting" | "email" | "email_reply" | "custom",
 *   "notes": "Some description",
 *   "outcome": "completed" | "no_answer" | etc.
 * }
 *
 * Or to read activities:
 * {
 *   "action": "get_activities",
 *   "email": "prospect@example.com",
 *   "limit": 20
 * }
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify shared secret
    const webhookSecret = Deno.env.get("WEBHOOK_REPLY_SECRET");
    const providedSecret = req.headers.get("x-webhook-secret");

    if (!webhookSecret || providedSecret !== webhookSecret) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const { action, email } = body;

    if (!action || !email) {
      return new Response(JSON.stringify({ error: "action and email are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up prospect by email
    const { data: prospect } = await supabase
      .from("prospects")
      .select("id")
      .eq("email", email.toLowerCase().trim())
      .limit(1);

    const prospectId = prospect?.length ? prospect[0].id : null;

    // --- ACTION: log_activity ---
    if (action === "log_activity") {
      const { activity_type, notes, outcome } = body;

      if (!activity_type) {
        return new Response(JSON.stringify({ error: "activity_type is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get admin user (first admin) to attribute the activity
      const { data: adminRole } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1);

      if (!adminRole?.length) {
        return new Response(JSON.stringify({ error: "no_admin_user" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: inserted, error } = await supabase
        .from("contact_activities")
        .insert({
          user_id: adminRole[0].user_id,
          prospect_id: prospectId,
          activity_type,
          notes: notes || `Integration activity: ${activity_type}`,
          outcome: outcome || null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Insert error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`Integration activity logged: ${inserted.id} for ${email} (${activity_type})`);

      return new Response(JSON.stringify({ status: "logged", id: inserted.id, prospect_id: prospectId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ACTION: get_activities ---
    if (action === "get_activities") {
      if (!prospectId) {
        return new Response(JSON.stringify({ status: "ok", activities: [], reason: "prospect_not_found" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const limit = Math.min(body.limit || 20, 100);
      const { data: activities } = await supabase
        .from("contact_activities")
        .select("id, activity_type, notes, outcome, created_at")
        .eq("prospect_id", prospectId)
        .order("created_at", { ascending: false })
        .limit(limit);

      return new Response(JSON.stringify({ status: "ok", activities: activities || [] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("integration-webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
