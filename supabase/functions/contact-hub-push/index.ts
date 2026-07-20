// Contact hub push — enforces VantoOS Field Ownership Contract v1.
// - First push per prospect = BOOTSTRAP: sends identity + contact_type.
// - Every subsequent push = ONGOING: sends only source_ref, source_app,
//   consent_marketing, consent_updated_at, and append-only shared arrays.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_KEY = "zazi_email";
const enc = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

function buildBootstrapRecord(p: any) {
  return {
    source_app: APP_KEY,
    source_ref: p.id,
    full_name: p.full_name ?? null,
    first_name: p.first_name ?? null,
    last_name: p.last_name ?? null,
    primary_email: p.email ? String(p.email).toLowerCase() : null,
    primary_phone: p.phone_normalized ?? null,
    contact_type: p.contact_type ?? p.lead_type ?? "subscriber",
    consent_marketing: p.consent_marketing ?? !p.unsubscribed,
    consent_updated_at: p.consent_updated_at ?? p.updated_at,
    // Append-only shared arrays (contract §2)
    secondary_emails: p.secondary_emails ?? [],
    secondary_phones: p.secondary_phones ?? [],
  };
}

function buildOngoingRecord(p: any) {
  // Contract §3.1 — post-bootstrap payload must OMIT hub-owned identity fields.
  return {
    source_app: APP_KEY,
    source_ref: p.id,
    consent_marketing: p.consent_marketing ?? !p.unsubscribed,
    consent_updated_at: p.consent_updated_at ?? p.updated_at,
    secondary_emails: p.secondary_emails ?? [],
    secondary_phones: p.secondary_phones ?? [],
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const { prospect_id } = await req.json().catch(() => ({}));
  if (!prospect_id) return json({ error: "missing_prospect_id" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: p, error } = await supabase.from("prospects").select("*").eq("id", prospect_id).single();
  if (error || !p) return json({ error: "prospect_not_found", detail: error?.message }, 404);

  const isBootstrap = !p.hub_bootstrapped_at && !p.hub_contact_id;
  const record = isBootstrap ? buildBootstrapRecord(p) : buildOngoingRecord(p);

  const secret = Deno.env.get("SUITE_BRIDGE_SECRET");
  const hubUrl = Deno.env.get("VANTOOS_HUB_URL");
  if (!secret || !hubUrl) return json({ ok: false, error: "bridge_not_configured", record, mode: isBootstrap ? "bootstrap" : "ongoing" }, 200);

  // Contract §4 envelope
  const payload = {
    action: "contacts_upsert",
    app_key: APP_KEY,
    records: [record],
    last_seen_version: p.hub_last_seen_version ?? null,
  };

  const bodyStr = JSON.stringify(payload);
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const sig = await hmacSha256Hex(secret, `${ts}.${nonce}.${APP_KEY}.${bodyStr}`);
  const target = new URL("/functions/v1/suite-bridge-hub", hubUrl).toString();
  const resp = await fetch(target, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-bridge-app": APP_KEY,
      "x-bridge-timestamp": ts,
      "x-bridge-nonce": nonce,
      "x-bridge-signature": sig,
    },
    body: JSON.stringify({ action: "receive", body: payload }),
  });
  const text = await resp.text();

  // Parse hub response and apply hub-authoritative fields locally.
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { /* ignore */ }
  const result = parsed?.results?.[0] ?? parsed?.body?.results?.[0] ?? parsed?.body ?? parsed ?? {};

  if (resp.ok) {
    const patch: Record<string, unknown> = {};
    if (result.hub_contact_id) patch.hub_contact_id = result.hub_contact_id;
    if (result.version != null) {
      patch.hub_version = result.version;
      patch.hub_last_seen_version = result.version;
    } else if (result.hub_version != null) {
      patch.hub_version = result.hub_version;
      patch.hub_last_seen_version = result.hub_version;
    }
    if (isBootstrap) patch.hub_bootstrapped_at = new Date().toISOString();
    if (Object.keys(patch).length) {
      await supabase.from("prospects").update(patch).eq("id", prospect_id);
    }

    // Record any hub-reported field ownership violations for observability.
    const violations = result.field_ownership_violations ?? result.violations ?? [];
    if (Array.isArray(violations) && violations.length) {
      await supabase.from("hub_field_violations").insert(
        violations.map((v: any) => ({
          prospect_id,
          field: v.field ?? v.name ?? "unknown",
          attempted_value: v.value ?? null,
          hub_reason: v.reason ?? "field_ownership_violation",
        })),
      );
    }
  }

  return json({
    ok: resp.ok,
    status: resp.status,
    mode: isBootstrap ? "bootstrap" : "ongoing",
    hub_response: text,
  });
});
