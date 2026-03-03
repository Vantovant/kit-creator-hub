import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { raw_text } = await req.json();
    if (!raw_text) throw new Error("raw_text required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `You are a planning intent parser. Given raw text (from voice or typed input), extract a structured intent.

Output ONLY valid JSON with this schema:
{
  "type": "task" | "reminder" | "meeting",
  "title": "short title",
  "description": "optional longer description",
  "datetime": "ISO 8601 datetime string or null",
  "location": "location string or null",
  "attendees": ["name1", "name2"] or null
}

Rules:
- If the text mentions "remind", "reminder", "don't forget" → type = "reminder"
- If the text mentions "meet", "meeting", "call", "sync", "catch up" → type = "meeting"  
- Otherwise → type = "task"
- Extract any dates/times mentioned and convert to ISO 8601 (assume current year 2026, use UTC)
- Extract locations if mentioned
- Extract attendee names if mentioned
- Keep title concise (max 10 words)
- Put any extra detail in description`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: raw_text },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Extract JSON from response
    let intent;
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      intent = jsonMatch ? JSON.parse(jsonMatch[0]) : { type: "task", title: raw_text.slice(0, 60) };
    } catch {
      intent = { type: "task", title: raw_text.slice(0, 60) };
    }

    return new Response(JSON.stringify({ intent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("plan-intake error:", e);
    return new Response(JSON.stringify({
      intent: { type: "task", title: "Untitled from voice" },
      error: e.message,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
