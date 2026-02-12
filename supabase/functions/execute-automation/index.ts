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

    const { trigger_type, trigger_data } = await req.json();
    if (!trigger_type) {
      return new Response(JSON.stringify({ error: "trigger_type required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find active automations matching this trigger
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

      // Check trigger config filters
      if (trigger_type === "tag_added" && triggerConfig.tag_name) {
        if (trigger_data?.tag_name !== triggerConfig.tag_name) continue;
      }
      if (trigger_type === "link_click" && triggerConfig.link_url) {
        const clickedUrl = trigger_data?.link_url || "";
        if (!clickedUrl.includes(triggerConfig.link_url)) continue;
      }

      const email = trigger_data?.email;
      const firstName = trigger_data?.first_name || "there";
      if (!email) continue;

      // Execute workflow steps sequentially
      for (const step of workflow) {
        if (step.type === "send_email" && resend) {
          const { data: prospect } = await adminClient
            .from("prospects")
            .select("unsubscribe_token")
            .eq("email", email)
            .maybeSingle();

          const appUrl = "https://kit-clone-dashboard.lovable.app";
          const unsubUrl = `${appUrl}/unsubscribe?token=${prospect?.unsubscribe_token || ""}`;
          const personalizedContent = (step.content || "")
            .replace(/\{\{first_name\}\}/g, firstName);
          const personalizedSubject = (step.subject || "")
            .replace(/\{\{first_name\}\}/g, firstName);

          try {
            await resend.emails.send({
              from: `${step.from_name || "Vanto Zazi"} <vanto@onlinecourseformlm.com>`,
              to: [email],
              subject: personalizedSubject,
              html: `${personalizedContent}<hr style="margin:24px 0;border:none;border-top:1px solid #eee;"/><p style="font-size:12px;color:#999;"><a href="${unsubUrl}" style="color:#999;">Unsubscribe</a></p>`,
            });
          } catch (e) {
            console.error(`Automation email failed for ${email}:`, e);
          }
        } else if (step.type === "add_tag") {
          if (!step.tag_name) continue;

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
        } else if (step.type === "wait") {
          // Wait steps log duration - in production this would schedule the next steps
          console.log(`Wait step: ${step.duration_hours || 0} hours — skipping (synchronous execution)`);
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
