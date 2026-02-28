import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_query, context, feedback } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const client = createClient(supabaseUrl, serviceRoleKey);

    // Handle feedback submission
    if (feedback) {
      await client.from("kb_query_log").update({
        outcome: feedback.outcome,
        feedback: feedback.text || null,
      }).eq("id", feedback.log_id);
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!user_query) throw new Error("user_query required");

    // Search KB chunks using full-text search
    const { data: chunks, error: searchErr } = await client.rpc("search_kb_chunks", {
      search_query: user_query,
      collection_filter: context?.collection || null,
      max_results: 8,
    });

    if (searchErr) console.error("Search error:", searchErr);

    const retrievedChunks = chunks || [];
    const hasKBData = retrievedChunks.length > 0;

    // Build context from retrieved chunks
    const kbContext = retrievedChunks.map((c: any, i: number) =>
      `[Source ${i + 1}: ${c.filename} (${c.collection})]\n${c.chunk_text}`
    ).join("\n\n---\n\n");

    const sources = retrievedChunks.map((c: any) => ({
      filename: c.filename,
      collection: c.collection,
      chunk_id: c.chunk_id,
    }));

    // Detect intent
    const actionType = context?.action || "general";
    let intentInstruction = "";
    switch (actionType) {
      case "write_whatsapp":
        intentInstruction = "Write a professional WhatsApp message. Keep it concise, friendly, and actionable. Use line breaks for readability.";
        break;
      case "write_email":
        intentInstruction = "Write a professional email. Include a clear subject line suggestion and well-structured body.";
        break;
      case "broadcast":
        intentInstruction = "Write broadcast email content suitable for mass sending. Engaging, clear, and with a strong call-to-action.";
        break;
      case "pricing":
        intentInstruction = "Answer the pricing/PV question ONLY from KB data. If the exact price/PV is not in the KB, say so explicitly.";
        break;
      default:
        intentInstruction = "Provide a helpful, accurate answer based on the knowledge base.";
    }

    const systemPrompt = `You are Zazi Copilot, the AI assistant for Vanto Zazi Mail — an APLGO distributor platform.

CRITICAL RULES:
1. ONLY use information from the Knowledge Base (KB) provided below. Never invent prices, PV values, compensation details, or product specifics.
2. If the KB doesn't contain the answer, respond: "⚠️ This information is not in the Knowledge Base yet. Please upload the relevant APLGO document."
3. Always cite your sources using [Source N] references.
4. Be direct, professional, and actionable.
5. For health-related products, include: "Disclaimer: These products are not intended to diagnose, treat, cure, or prevent any disease."

INTENT: ${intentInstruction}

${hasKBData ? `KNOWLEDGE BASE CONTENT:\n${kbContext}` : "NO KNOWLEDGE BASE DATA FOUND for this query."}`;

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
          { role: "user", content: user_query },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ answer: "Rate limit reached. Please try again in a moment.", sources: [] }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ answer: "AI credits depleted. Contact support.", sources: [] }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || "Unable to generate a response.";

    // Log the query
    const authHeader = req.headers.get("Authorization");
    let userId = null;
    if (authHeader?.startsWith("Bearer ")) {
      const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData } = await userClient.auth.getUser();
      userId = userData?.user?.id || null;
    }

    const { data: logEntry } = await client.from("kb_query_log").insert({
      user_id: userId,
      query: user_query,
      retrieved_sources: sources,
      response: answer,
      context: context || {},
      outcome: "pending",
    }).select("id").single();

    return new Response(JSON.stringify({
      answer,
      sources,
      log_id: logEntry?.id,
      kb_used: hasKBData,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("copilot-answer error:", e);
    return new Response(JSON.stringify({
      answer: "Unable to get copilot response. Please try again.",
      sources: [],
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
