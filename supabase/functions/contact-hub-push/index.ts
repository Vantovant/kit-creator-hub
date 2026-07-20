// Contact hub push — builds Spec Kit v1 payload and forwards through suite-bridge-spoke.
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const { prospect_id } = await req.json().catch(() => ({}));
  if (!prospect_id) return json({ error: "missing_prospect_id" }, 400);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: p, error } = await supabase.from("prospects").select("*").eq("id", prospect_id).single();
  if (error || !p) return json({ error: "prospect_not_found", detail: error?.message }, 404);

  const { data: tagsRows } = await supabase.from("prospect_tags").select("tags(name)").eq("prospect_id", prospect_id);
  const tags = ((tagsRows as any[]) || []).map((r) => r.tags?.name).filter(Boolean);

  const payload = {
    kind: "contact_upsert",
    app_key: APP_KEY,
    local_id: p.id,
    hub_contact_id: p.hub_contact_id ?? null,
    hub_version: p.hub_version ?? null,
    identity: {
      name: p.full_name,
      first_name: p.first_name,
      last_name: p.last_name,
      whatsapp_display_name: p.whatsapp_display_name,
      phone_normalized: p.phone_normalized,
      email: p.email,
    },
    attributes: {
      lead_type: p.lead_type,
      temperature: p.lead_temperature,
      contact_source: p.contact_source,
      contact_confidence: p.contact_confidence,
      name_needs_confirmation: p.name_needs_confirmation,
      tags,
      notes: p.additional_notes,
    },
    updated_at: p.updated_at,
  };

  const secret = Deno.env.get("SUITE_BRIDGE_SECRET");
  const hubUrl = Deno.env.get("VANTOOS_HUB_URL");
  if (!secret || !hubUrl) return json({ ok: false, error: "bridge_not_configured", payload }, 200);

  // Post directly to hub as vantoos would to a spoke — hub accepts contact_upsert from any known app.
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

  // Handle 409 conflict — hub returns { hub_contact_id, hub_version, identity, attributes }
  if (resp.status === 409) {
    try {
      const conflict = JSON.parse(text);
      const remote = conflict?.remote || conflict;
      const patch: Record<string, unknown> = {
        hub_contact_id: remote.hub_contact_id ?? p.hub_contact_id,
        hub_version: remote.hub_version ?? p.hub_version,
      };
      if (remote.identity) {
        if (remote.identity.name) patch.full_name = remote.identity.name;
        if (remote.identity.first_name) patch.first_name = remote.identity.first_name;
        if (remote.identity.last_name) patch.last_name = remote.identity.last_name;
        if (remote.identity.email) patch.email = remote.identity.email;
        if (remote.identity.phone_normalized) patch.phone_normalized = remote.identity.phone_normalized;
      }
      await supabase.from("prospects").update(patch).eq("id", prospect_id);
      return json({ ok: true, conflict: true, applied_remote: true });
    } catch { /* fall through */ }
  }

  if (resp.ok) {
    try {
      const ok = JSON.parse(text);
      const hub_contact_id = ok?.hub_contact_id ?? ok?.body?.hub_contact_id;
      const hub_version = ok?.hub_version ?? ok?.body?.hub_version;
      if (hub_contact_id || hub_version != null) {
        await supabase.from("prospects").update({
          hub_contact_id: hub_contact_id ?? p.hub_contact_id,
          hub_version: hub_version ?? p.hub_version,
        }).eq("id", prospect_id);
      }
    } catch { /* ignore */ }
  }

  return json({ ok: resp.ok, status: resp.status, hub_response: text });
});
