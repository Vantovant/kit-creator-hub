// ============================================================
// GOOGLE CONTACTS SYNC (People API via Lovable gateway)
// ============================================================
// Pulls the caller's Google Contacts and enriches prospects that
// match by APLGO id (in note), full name, or existing email/phone.
// Requires an App User Connector for google_contacts with the
// scope https://www.googleapis.com/auth/contacts.readonly.
// ============================================================
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_contacts/v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizePhone(v: string): string {
  return (v || "").replace(/[^\d+]/g, "");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("GOOGLE_CONTACTS_API_KEY");

  if (!lovableKey || !connectionKey) {
    return json({
      needs_setup: true,
      detail: "google_contacts connector not linked. In App User Connectors, connect google_contacts with scope contacts.readonly, then retry.",
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Fetch People connections
  const url = `${GATEWAY_URL}/people/me/connections?personFields=names,emailAddresses,phoneNumbers,biographies&pageSize=1000`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return json({ error: "gateway_failed", status: res.status, detail: text }, res.status);
  }
  const body = await res.json();
  const connections: any[] = body?.connections || [];

  // 2. Pull prospects that need enrichment or have partial data
  const { data: prospects } = await supabase
    .from("prospects")
    .select("id, email, phone_number, full_name, first_name, aplgo_id, needs_enrichment")
    .or("needs_enrichment.eq.true,phone_number.is.null");

  const list = prospects || [];
  let matched = 0;
  let updated = 0;

  for (const person of connections) {
    const name = person.names?.[0]?.displayName?.toLowerCase();
    const emails: string[] = (person.emailAddresses || []).map((e: any) => (e.value || "").toLowerCase()).filter(Boolean);
    const phones: string[] = (person.phoneNumbers || []).map((p: any) => normalizePhone(p.value || "")).filter(Boolean);
    const bio: string = (person.biographies || []).map((b: any) => b.value).join(" ").toLowerCase();

    const hit = list.find((p) => {
      if (p.aplgo_id && bio.includes(String(p.aplgo_id).toLowerCase())) return true;
      if (p.full_name && name && p.full_name.toLowerCase() === name) return true;
      if (p.email && emails.includes(p.email.toLowerCase())) return true;
      if (p.phone_number && phones.some((ph) => ph.endsWith(normalizePhone(p.phone_number!).slice(-9)))) return true;
      return false;
    });

    if (!hit) continue;
    matched += 1;

    const patch: Record<string, unknown> = {};
    if ((!hit.email || hit.email.endsWith("@aplgo.enrollment.pending")) && emails[0]) patch.email = emails[0];
    if (!hit.phone_number && phones[0]) patch.phone_number = phones[0];
    if (!hit.full_name && name) patch.full_name = person.names?.[0]?.displayName;
    if (Object.keys(patch).length > 0) {
      patch.needs_enrichment = false;
      const { error } = await supabase.from("prospects").update(patch).eq("id", hit.id);
      if (!error) updated += 1;
    }
  }

  return json({ ok: true, scanned: connections.length, matched, updated });
});
