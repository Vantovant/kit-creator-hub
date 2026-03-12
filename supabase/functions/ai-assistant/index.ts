import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { context, question, action, prospect_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // --- ACTION: Apply a status update to a prospect ---
    if (action === "update_prospect" && prospect_id) {
      const { field, value } = await extractUpdateFields(question);
      if (field && value !== undefined) {
        const { error } = await sb.from("prospects").update({ [field]: value }).eq("id", prospect_id);
        if (error) throw error;
        return jsonResp({ advice: `✅ Updated **${field}** to **${value}** successfully.`, action_applied: true });
      }
      return jsonResp({ advice: "Could not determine what to update. Please be more specific." });
    }

    // --- ACTION: Add tag to prospect ---
    if (action === "add_tag" && prospect_id) {
      const tagName = question?.trim();
      if (!tagName) return jsonResp({ advice: "No tag name provided." });

      // Find or create tag
      let { data: tag } = await sb.from("tags").select("id").eq("name", tagName).maybeSingle();
      if (!tag) {
        // Get any admin user_id for tag creation
        const { data: role } = await sb.from("user_roles").select("user_id").eq("role", "admin").limit(1).single();
        if (!role) return jsonResp({ advice: "No admin user found to create tag." });
        const { data: newTag, error } = await sb.from("tags").insert({ name: tagName, user_id: role.user_id }).select("id").single();
        if (error) throw error;
        tag = newTag;
      }

      // Check if already tagged
      const { data: existing } = await sb.from("prospect_tags").select("id").eq("prospect_id", prospect_id).eq("tag_id", tag!.id).maybeSingle();
      if (existing) return jsonResp({ advice: `This subscriber already has the **${tagName}** tag.` });

      const { error } = await sb.from("prospect_tags").insert({ prospect_id, tag_id: tag!.id });
      if (error) throw error;
      return jsonResp({ advice: `✅ Added tag **${tagName}** successfully.`, action_applied: true });
    }

    // --- Build page-aware context for AI ---
    let subscriberContext = "";
    let goalContext = "";

    // If viewing a specific subscriber
    if (prospect_id) {
      const [prospectRes, eventsRes, activitiesRes, tagsRes] = await Promise.all([
        sb.from("prospects").select("*").eq("id", prospect_id).single(),
        sb.from("email_events").select("event_type, created_at").eq("email", (await sb.from("prospects").select("email").eq("id", prospect_id).single()).data?.email || "").order("created_at", { ascending: false }).limit(20),
        sb.from("contact_activities").select("activity_type, notes, outcome, created_at").eq("prospect_id", prospect_id).order("created_at", { ascending: false }).limit(10),
        sb.from("prospect_tags").select("tag_id, tags(name)").eq("prospect_id", prospect_id),
      ]);

      const p = prospectRes.data;
      if (p) {
        const tagNames = (tagsRes.data || []).map((t: any) => t.tags?.name).filter(Boolean);
        const recentOpens = (eventsRes.data || []).filter((e: any) => e.event_type?.includes("opened")).length;
        const recentClicks = (eventsRes.data || []).filter((e: any) => e.event_type?.includes("clicked")).length;
        const recentActivities = (activitiesRes.data || []).slice(0, 5);

        subscriberContext = `
SUBSCRIBER PROFILE:
- Name: ${p.full_name || p.first_name || 'Unknown'}
- Email: ${p.email}
- Lead Type: ${p.lead_type || 'Not set'}
- Lead Temperature: ${p.lead_temperature || 'Not set'}
- Registration Status: ${p.registration_status || 'Not set'}
- GO Status: ${p.go_status || 'Not set'}
- Associate Status: ${p.associate_status || 'Not set'}
- Engagement Score: ${p.engagement_score}
- Source: ${p.source || 'Unknown'}
- Tags: ${tagNames.join(", ") || "None"}
- Subscribed: ${!p.unsubscribed}
- Created: ${p.created_at}
- Last Activity: ${p.last_activity_at || 'Never'}

RECENT EMAIL ENGAGEMENT (last 20 events):
- Opens: ${recentOpens}
- Clicks: ${recentClicks}

RECENT CONTACT ACTIVITIES:
${recentActivities.map((a: any) => `- ${a.activity_type}: ${a.notes || 'no notes'} (${a.outcome || 'no outcome'}) — ${new Date(a.created_at).toLocaleDateString()}`).join("\n") || "None logged"}
`;
      }
    }

    // If on plan/activities page, load goals
    if (context?.page?.includes("plan") || context?.page?.includes("activities")) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader) {
        const userSb = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user } } = await userSb.auth.getUser();
        if (user) {
          const today = new Date().toISOString().split("T")[0];
          const [goalsRes, todayActivitiesRes] = await Promise.all([
            sb.from("activity_goals").select("*").eq("user_id", user.id),
            sb.from("contact_activities").select("activity_type").eq("user_id", user.id).gte("created_at", today + "T00:00:00Z"),
          ]);

          const goals = goalsRes.data || [];
          const todayCounts: Record<string, number> = {};
          (todayActivitiesRes.data || []).forEach((a: any) => {
            todayCounts[a.activity_type] = (todayCounts[a.activity_type] || 0) + 1;
          });

          if (goals.length > 0) {
            goalContext = `\nDAILY ACTIVITY GOALS & PROGRESS:\n`;
            for (const g of goals) {
              const done = todayCounts[g.activity_type] || 0;
              const remaining = Math.max(0, g.daily_target - done);
              goalContext += `- ${g.activity_type}: ${done}/${g.daily_target} (${remaining} remaining)\n`;
            }
          }

          // If behind on goals, fetch hot prospects not contacted recently
          const behindGoals = goals.some(g => (todayCounts[g.activity_type] || 0) < g.daily_target);
          if (behindGoals) {
            const { data: hotProspects } = await sb.from("prospects")
              .select("id, email, first_name, full_name, lead_temperature, engagement_score")
              .eq("unsubscribed", false)
              .in("lead_temperature", ["Hot", "Warm"])
              .order("engagement_score", { ascending: false })
              .limit(5);

            if (hotProspects?.length) {
              goalContext += `\nSUGGESTED PROSPECTS TO CONTACT:\n`;
              hotProspects.forEach((p: any) => {
                goalContext += `- ${p.full_name || p.first_name || p.email} (${p.lead_temperature}, score: ${p.engagement_score})\n`;
              });
            }
          }
        }
      }
    }

    const systemPrompt = `You are Vanto Zazi Mail's intelligent CRM copilot. You give short, actionable advice based on real subscriber data.

Rules:
- Be direct and specific. No vague advice.
- Focus on revenue-generating actions.
- Reference the user's actual data in your response.
- Keep responses under 200 words.
- Use bullet points for action items.
- If metrics are poor, say so honestly but constructively.
- Speak like a trusted advisor, not a chatbot.

WHEN VIEWING A SUBSCRIBER:
- Analyze their engagement pattern and CRM statuses
- If there's a mismatch between engagement and status, PROACTIVELY suggest an update
- Format suggestions as: "I recommend updating [field] from [current] to [new] because [reason]"
- Be specific about which field to update

WHEN ON PLAN/ACTIVITIES PAGE:
- Coach the user on their daily goals
- If behind, suggest specific prospects to contact
- Be encouraging but direct about gaps

Platform context:
- Subscribers: ${context?.subscriber_count || 'N/A'}
- Broadcasts sent: ${context?.sent_broadcast_count || 'N/A'}
- Active sequences: ${context?.active_sequence_count || 'N/A'}
- Tags: ${context?.tag_count || 'N/A'}
- Segments: ${context?.segment_count || 'N/A'}
- Open rate: ${context?.open_rate || 'N/A'}%
- Click rate: ${context?.click_rate || 'N/A'}%
- Current page: ${context?.page || 'dashboard'}
${subscriberContext}${goalContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question || "What should I do next to grow my email business?" },
        ],
        tools: prospect_id ? [
          {
            type: "function",
            function: {
              name: "suggest_actions",
              description: "Suggest specific CRM actions for this subscriber",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action_type: { type: "string", enum: ["update_field", "add_tag"] },
                        field: { type: "string" },
                        current_value: { type: "string" },
                        new_value: { type: "string" },
                        reason: { type: "string" },
                        button_label: { type: "string" }
                      },
                      required: ["action_type", "button_label", "reason"]
                    }
                  }
                },
                required: ["suggestions"]
              }
            }
          }
        ] : undefined,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return jsonResp({ advice: "Rate limit reached. Please try again in a moment." });
      }
      if (response.status === 402) {
        return jsonResp({ advice: "AI credits depleted. Contact support to top up." });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    let advice = choice?.message?.content || "No advice available right now.";
    let suggested_actions: any[] = [];

    // Check for tool calls with suggested actions
    if (choice?.message?.tool_calls?.length) {
      for (const tc of choice.message.tool_calls) {
        if (tc.function?.name === "suggest_actions") {
          try {
            const args = JSON.parse(tc.function.arguments);
            suggested_actions = args.suggestions || [];
          } catch {}
        }
      }
    }

    return jsonResp({ advice, suggested_actions });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return jsonResp({ advice: "Unable to get advice right now. Try again later." });
  }
});

function jsonResp(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractUpdateFields(question: string): Promise<{ field: string | null; value: any }> {
  // Parse simple update commands like "update lead_temperature to Warm"
  const patterns = [
    /update\s+(\w+)\s+to\s+(.+)/i,
    /set\s+(\w+)\s+to\s+(.+)/i,
    /change\s+(\w+)\s+to\s+(.+)/i,
  ];
  const validFields = [
    "lead_temperature", "lead_type", "registration_status", "go_status",
    "associate_status", "communication_status", "interest_level",
    "action_taken", "next_action", "additional_notes", "lead_path",
  ];

  for (const pattern of patterns) {
    const match = question.match(pattern);
    if (match) {
      const field = match[1].toLowerCase();
      const value = match[2].trim();
      if (validFields.includes(field)) {
        return Promise.resolve({ field, value });
      }
    }
  }
  return Promise.resolve({ field: null, value: null });
}

const corsHeaders2 = corsHeaders; // alias for clarity
