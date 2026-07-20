// ============================================================
// CONTACT NEXT BEST ACTION (Lovable AI Gateway)
// ============================================================
// Given a prospect_id, assembles a short profile and asks the
// model for a single actionable next step, using CRM context.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) return json({ error: "missing_lovable_key" }, 500);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { prospect_id } = await req.json().catch(() => ({}));
  if (!prospect_id) return json({ error: "prospect_id required" }, 400);

  const [{ data: p }, tagsRes, actRes, evRes] = await Promise.all([
    supabase.from("prospects").select("*").eq("id", prospect_id).single(),
    supabase.from("prospect_tags").select("tags(name)").eq("prospect_id", prospect_id),
    supabase.from("contact_activities").select("activity_type, notes, created_at").eq("prospect_id", prospect_id).order("created_at", { ascending: false }).limit(6),
    supabase.from("email_events").select("event_type, created_at").eq("recipient_email", (await supabase.from("prospects").select("email").eq("id", prospect_id).single()).data?.email || "").order("created_at", { ascending: false }).limit(6),
  ]);

  if (!p) return json({ error: "prospect_not_found" }, 404);

  const tags = ((tagsRes.data as any[]) || []).map((t: any) => t.tags?.name).filter(Boolean);
  const activities = (actRes.data as any[]) || [];
  const events = (evRes.data as any[]) || [];

  const profile = {
    name: p.full_name || p.first_name || "Unknown",
    email: p.email,
    aplgo_id: p.aplgo_id,
    phone: p.phone_number,
    status: p.registration_status,
    go: p.go_status,
    engagement: p.engagement_score,
    lead_type: p.lead_type,
    needs_enrichment: p.needs_enrichment,
    tags,
    last_activities: activities,
    last_email_events: events,
  };

  const system = `You are an APLGO leadership CRM coach. In 2-4 short lines, recommend the single next best action for this contact — concrete, warm, motivational, actionable today. Prefer: WhatsApp check-in, enrichment (missing phone/email), enroll in the right sequence, or book a call. No preamble.`;
  const user = `Contact profile:\n${JSON.stringify(profile, null, 2)}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!resp.ok) {
    const detail = await resp.text();
    return json({ error: "ai_failed", status: resp.status, detail }, resp.status);
  }
  const data = await resp.json();
  const suggestion = data?.choices?.[0]?.message?.content?.trim() || "No suggestion.";
  return json({ ok: true, suggestion });
});
