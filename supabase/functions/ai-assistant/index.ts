import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { context, question } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are Vanto Zazi Mail's business mentor AI. You give short, actionable email marketing advice.

Rules:
- Be direct and specific. No vague advice.
- Focus on revenue-generating actions.
- Reference the user's actual data in your response.
- Keep responses under 150 words.
- Use bullet points for action items.
- If metrics are poor, say so honestly but constructively.
- Speak like a trusted advisor, not a chatbot.

Platform context:
- Subscribers: ${context.subscriber_count}
- Broadcasts sent: ${context.sent_broadcast_count}
- Active sequences: ${context.active_sequence_count}
- Tags: ${context.tag_count}
- Segments: ${context.segment_count}
- Open rate: ${context.open_rate}%
- Click rate: ${context.click_rate}%
- Current page: ${context.page}`;

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
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ advice: "Rate limit reached. Please try again in a moment." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ advice: "AI credits depleted. Contact support to top up." }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const advice = data.choices?.[0]?.message?.content || "No advice available right now.";

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-assistant error:", e);
    return new Response(JSON.stringify({ advice: "Unable to get advice right now. Try again later." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
