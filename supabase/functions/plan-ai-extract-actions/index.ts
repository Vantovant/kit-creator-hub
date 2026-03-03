import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { note_content, note_date, project_id } = await req.json();
    if (!note_content) throw new Error("note_content required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // POPIA redaction: strip emails, phone numbers, ID numbers
    const redacted = note_content
      .slice(0, 3000)
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL]")
      .replace(/\b\d{10,13}\b/g, "[ID/PHONE]");

    const today = note_date || new Date().toISOString().slice(0, 10);

    const systemPrompt = `You are a planning assistant that extracts actionable items from notes.
Given note content, extract tasks, reminders, and meetings.

Today's date: ${today}

Rules:
- If text mentions "remind", "don't forget", "follow up" → type = "reminder"
- If text mentions "meet", "meeting", "call", "sync", "zoom", "teams", a video link, or a specific time with a person → type = "meeting"
- Otherwise actionable items → type = "task"
- Extract dates/times and convert to ISO 8601 (assume current year 2026, default timezone Africa/Johannesburg UTC+2)
- "tomorrow" = day after ${today}
- "Monday", "Friday" etc = next occurrence from ${today}
- Detect video links (zoom.us, teams.microsoft.com, meet.google.com) and include as "link"
- Estimate meeting duration as 30 min if not specified
- Assign priority: P1 (critical), P2 (high), P3 (medium), P4 (low) based on urgency cues
- Keep titles concise (max 10 words)
- Only extract genuinely actionable items, skip observations/reflections

You MUST use the extract_actions tool to return results.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: redacted },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_actions",
              description: "Return extracted actionable items from the note",
              parameters: {
                type: "object",
                properties: {
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["task", "reminder", "meeting"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        datetime: { type: "string", description: "ISO 8601 datetime or null" },
                        due_at: { type: "string", description: "ISO 8601 for task due date" },
                        remind_at: { type: "string", description: "ISO 8601 for reminder time" },
                        start_at: { type: "string", description: "ISO 8601 for meeting start" },
                        duration: { type: "number", description: "Meeting duration in minutes" },
                        link: { type: "string", description: "Video call link if detected" },
                        priority: { type: "string", enum: ["P1", "P2", "P3", "P4"] },
                        source_text: { type: "string", description: "The original text snippet this was extracted from" },
                      },
                      required: ["type", "title"],
                    },
                  },
                },
                required: ["actions"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_actions" } },
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later.", actions: [] }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits.", actions: [] }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let actions: any[] = [];

    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        actions = parsed.actions || [];
      } catch {
        actions = [];
      }
    }

    // Attach project_id if provided
    if (project_id) {
      actions = actions.map((a: any) => ({ ...a, project_id }));
    }

    return new Response(JSON.stringify({ actions, truncated: note_content.length > 3000 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("plan-ai-extract-actions error:", e);
    return new Response(JSON.stringify({ actions: [], error: e.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
