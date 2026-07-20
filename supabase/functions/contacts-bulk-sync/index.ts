// Contacts bulk sync — pushes prospects to Vantoos hub in batches of ≤500,
// and pulls hub contacts back on a schedule.
// Actions: { action: "push" | "pull" | "bootstrap", batch_size?, since? }
import { createClient } from "npm:@supabase/supabase-js@2";

const APP_KEY = "zazi_email";
const BATCH_SIZE = 500;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const enc = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

async function postToHub(secret: string, hubUrl: string, body: Record<string, unknown>) {
  const bodyStr = JSON.stringify(body);
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
    body: JSON.stringify({ action: "receive", body }),
  });
  return { status: resp.status, text: await resp.text() };
}

// Field Ownership Contract v1 — bootstrap record (first push per prospect).
function toBootstrapRecord(p: any) {
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
    secondary_emails: p.secondary_emails ?? [],
    secondary_phones: p.secondary_phones ?? [],
  };
}

// Ongoing record — strips hub-owned identity fields (Contract §3.1).
function toOngoingRecord(p: any) {
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

  const secret = Deno.env.get("SUITE_BRIDGE_SECRET");
  const hubUrl = Deno.env.get("VANTOOS_HUB_URL");
  if (!secret || !hubUrl) return json({ error: "bridge_not_configured" }, 500);

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  let params: any = {};
  try { params = await req.json(); } catch { /* empty */ }
  const action = params?.action ?? "push";
  const batchSize = Math.min(Number(params?.batch_size) || BATCH_SIZE, BATCH_SIZE);

  const { data: stateRow } = await supabase.from("hub_sync_state").select("*").eq("app_key", APP_KEY).maybeSingle();
  const state = stateRow ?? { app_key: APP_KEY, last_pushed_at: null, last_pulled_at: null, pushed_count: 0, pulled_count: 0 };

  // ---------------- PUSH ----------------
  if (action === "push" || action === "bootstrap") {
    let prospects: any[] | null = null;
    let usedOffset = false;
    if (action === "bootstrap") {
      // Offset-based, safe against updated_at ties (mass imports share timestamps).
      const offset = Number(params?.offset ?? state.pushed_count ?? 0);
      const { data, error } = await supabase
        .from("prospects")
        .select("*")
        .order("id", { ascending: true })
        .range(offset, offset + batchSize - 1);
      if (error) return json({ error: "query_failed", detail: error.message }, 500);
      prospects = data;
      usedOffset = true;
    } else {
      const since = state.last_pushed_at as string | null;
      let query = supabase.from("prospects").select("*").order("updated_at", { ascending: true }).limit(batchSize);
      if (since) query = query.gt("updated_at", since);
      const { data, error } = await query;
      if (error) return json({ error: "query_failed", detail: error.message }, 500);
      prospects = data;
    }
    if (!prospects?.length) {
      return json({ ok: true, action, pushed: 0, done: true });
    }

    const bootstrapIds: string[] = [];
    const records = prospects.map((p) => {
      const isBootstrap = !p.hub_bootstrapped_at && !p.hub_contact_id;
      if (isBootstrap) bootstrapIds.push(p.id);
      return isBootstrap ? toBootstrapRecord(p) : toOngoingRecord(p);
    });

    // Contract §4 envelope. Keep legacy `kind`/`contacts` for hub back-compat.
    const hubResp = await postToHub(secret, hubUrl, {
      action: "contacts_upsert",
      kind: "contacts_upsert",
      app_key: APP_KEY,
      records,
      contacts: records,
    });

    // Try to apply returned hub_contact_id / hub_version + log violations.
    let applied = 0;
    let violations = 0;
    try {
      const parsed = JSON.parse(hubResp.text);
      const results = parsed?.results ?? parsed?.body?.results ?? [];
      if (Array.isArray(results)) {
        for (const r of results) {
          const localId = r?.local_id ?? r?.source_ref;
          if (!localId) continue;
          const patch: Record<string, unknown> = {};
          if (r.hub_contact_id) patch.hub_contact_id = r.hub_contact_id;
          const ver = r.version ?? r.hub_version;
          if (ver != null) { patch.hub_version = ver; patch.hub_last_seen_version = ver; }
          if (Object.keys(patch).length) {
            await supabase.from("prospects").update(patch).eq("id", localId);
            applied++;
          }
          const vs = r.field_ownership_violations ?? r.violations ?? [];
          if (Array.isArray(vs) && vs.length) {
            await supabase.from("hub_field_violations").insert(
              vs.map((v: any) => ({
                prospect_id: localId,
                field: v.field ?? v.name ?? "unknown",
                attempted_value: v.value ?? null,
                hub_reason: v.reason ?? "field_ownership_violation",
              })),
            );
            violations += vs.length;
          }
        }
      }
    } catch { /* hub may not echo per-row results yet */ }

    // Mark bootstrapped prospects so future pushes send ongoing payload only.
    if (hubResp.status < 400 && bootstrapIds.length) {
      await supabase.from("prospects")
        .update({ hub_bootstrapped_at: new Date().toISOString() })
        .in("id", bootstrapIds);
    }


    const lastUpdated = prospects[prospects.length - 1].updated_at;
    const newPushedCount = (state.pushed_count ?? 0) + prospects.length;
    await supabase.from("hub_sync_state").upsert({
      app_key: APP_KEY,
      last_pushed_at: usedOffset ? state.last_pushed_at : lastUpdated,
      pushed_count: newPushedCount,
      last_error: hubResp.status >= 400 ? `push http ${hubResp.status}` : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "app_key" });

    return json({
      ok: hubResp.status < 400,
      action, pushed: prospects.length, applied_hub_ids: applied,
      hub_status: hubResp.status,
      done: prospects.length < batchSize,
      next_offset: usedOffset ? newPushedCount : undefined,
      cursor: lastUpdated,
    });
  }

  // ---------------- PULL ----------------
  if (action === "pull") {
    const since = params?.since ?? state.last_pulled_at ?? null;
    const hubResp = await postToHub(secret, hubUrl, {
      kind: "contacts_pull",
      app_key: APP_KEY,
      since,
      limit: batchSize,
    });
    if (hubResp.status >= 400) {
      await supabase.from("hub_sync_state").upsert({
        app_key: APP_KEY,
        last_error: `pull http ${hubResp.status}`,
        updated_at: new Date().toISOString(),
      }, { onConflict: "app_key" });
      return json({ ok: false, action, hub_status: hubResp.status, body: hubResp.text }, 502);
    }

    let contacts: any[] = [];
    let nextSince: string | null = null;
    try {
      const parsed = JSON.parse(hubResp.text);
      contacts = parsed?.contacts ?? parsed?.body?.contacts ?? [];
      nextSince = parsed?.next_since ?? parsed?.body?.next_since ?? null;
    } catch { /* empty */ }

    let merged = 0;
    for (const c of contacts) {
      const email = c?.identity?.email?.toLowerCase() ?? null;
      const phone = c?.identity?.phone_normalized ?? null;
      if (!email && !phone) continue;

      // Match existing prospect by email OR phone_normalized OR hub_contact_id
      let existing: any = null;
      if (c?.hub_contact_id) {
        const { data } = await supabase.from("prospects").select("*").eq("hub_contact_id", c.hub_contact_id).maybeSingle();
        existing = data;
      }
      if (!existing && email) {
        const { data } = await supabase.from("prospects").select("*").eq("email", email).maybeSingle();
        existing = data;
      }
      if (!existing && phone) {
        const { data } = await supabase.from("prospects").select("*").eq("phone_normalized", phone).maybeSingle();
        existing = data;
      }

      // Null-safe merge: never blank out non-null local fields with null remote.
      const patch: Record<string, unknown> = {
        hub_contact_id: c.hub_contact_id ?? existing?.hub_contact_id ?? null,
        hub_version: c.hub_version ?? existing?.hub_version ?? null,
      };
      const id = c.identity ?? {};
      const at = c.attributes ?? {};
      const setIf = (k: string, v: any) => { if (v != null && v !== "") patch[k] = v; };
      setIf("full_name", id.name);
      setIf("first_name", id.first_name);
      setIf("last_name", id.last_name);
      setIf("whatsapp_display_name", id.whatsapp_display_name);
      setIf("email", email);
      setIf("phone_normalized", phone);
      setIf("phone_raw", phone);
      setIf("lead_type", at.lead_type);
      setIf("lead_temperature", at.temperature);
      setIf("contact_source", at.contact_source);
      setIf("contact_confidence", at.contact_confidence);
      setIf("aplgo_id", at.aplgo_id);
      setIf("additional_notes", at.notes);

      if (existing) {
        await supabase.from("prospects").update(patch).eq("id", existing.id);
      } else {
        await supabase.from("prospects").insert({
          ...patch,
          email: email ?? `hub-${crypto.randomUUID()}@placeholder.local`,
          source: "vantoos_hub",
          unsubscribed: false,
        });
      }
      merged++;
    }

    await supabase.from("hub_sync_state").upsert({
      app_key: APP_KEY,
      last_pulled_at: nextSince ?? new Date().toISOString(),
      pulled_count: (state.pulled_count ?? 0) + merged,
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "app_key" });

    return json({ ok: true, action, pulled: contacts.length, merged, next_since: nextSince });
  }

  return json({ error: "unknown_action" }, 400);
});
