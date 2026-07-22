// ============================================================
// HUB EMAIL DISPATCH — GetWell Africa Email Spoke (Retention Loop v1)
// ============================================================
// Verifies four x-bridge-* headers signed with SUITE_BRIDGE_SECRET_GETWELL_AFRICA_EMAIL.
// Dedupes by idempotency_key. Resolves template. Sends via Resend.
// Logs to public.email_dispatch_log. Calls hub /suite-bridge-hub with email_recorded.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@^2.0.0";

const APP_KEY = "getwell_africa_email";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "content-type, x-bridge-app, x-bridge-timestamp, x-bridge-nonce, x-bridge-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SIG_WINDOW_SECONDS = 300;
const enc = new TextEncoder();

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- Template registry ----------
type TemplateData = {
  first_name?: string;
  tier?: string;
  tone?: string;
  body_preview?: string;
  aplgo_id?: string;
  origin_app?: string;
};

interface TemplateDef {
  subject: (d: TemplateData) => string;
  paragraph: (d: TemplateData) => string;
  cta_label: string;
  cta_url: string;
  accent: "green" | "orange" | "royal" | "spiritual" | "professional";
}

const APP_URL = "https://getwellafrica.com";

const TEMPLATES: Record<string, TemplateDef> = {
  "monthly-activity-thankyou-champion": {
    subject: d => `Leader ${d.first_name ?? "there"}, you are a Champion this month 🏆`,
    paragraph: () => `Champion tier this month — that is a rare gear. You did not just show up, you led. The team is watching, and it lifts everyone.`,
    cta_label: "Continue your journey", cta_url: `${APP_URL}/dashboard`, accent: "green",
  },
  "monthly-activity-thankyou-strong": {
    subject: d => `Leader ${d.first_name ?? "there"} — a strong month, thank you 💪`,
    paragraph: () => `A strong month deserves a moment of recognition. Consistency like yours is exactly what compounds into long-term rank growth.`,
    cta_label: "Continue your journey", cta_url: `${APP_URL}/dashboard`, accent: "green",
  },
  "monthly-activity-thankyou-solid": {
    subject: d => `Leader ${d.first_name ?? "there"}, thank you for keeping your rank active ✅`,
    paragraph: () => `You kept your rank active — that alone protects the base you have built. Solid months are the quiet backbone of every big year.`,
    cta_label: "Continue your journey", cta_url: `${APP_URL}/dashboard`, accent: "green",
  },
  "monthly-activity-thankyou-starter": {
    subject: d => `Leader ${d.first_name ?? "there"} — proud of you for staying active 🌱`,
    paragraph: () => `Staying active in your starter tier is the hardest step. You are proving you can be counted on, and that is where every leader began.`,
    cta_label: "Continue your journey", cta_url: `${APP_URL}/dashboard`, accent: "orange",
  },
  "birthday-wishes-warm": {
    subject: d => `Happy Birthday, Leader ${d.first_name ?? "there"} 🎂`,
    paragraph: () => `Wishing you a birthday as warm as the impact you make on the people around you. May this year bring more health, more joy, more you.`,
    cta_label: "Continue your journey", cta_url: `${APP_URL}/dashboard`, accent: "orange",
  },
  "birthday-wishes-royal": {
    subject: d => `Crown up, Leader ${d.first_name ?? "there"} 👑`,
    paragraph: () => `Today is your day to crown up. You lead with dignity every other day — let this one be about you being celebrated the way you deserve.`,
    cta_label: "Continue your journey", cta_url: `${APP_URL}/dashboard`, accent: "royal",
  },
  "birthday-wishes-spiritual": {
    subject: d => `A blessed birthday, Leader ${d.first_name ?? "there"} 🙏`,
    paragraph: () => `May this new year of your life be blessed with health, peace and purpose. You are held in prayer and gratitude today.`,
    cta_label: "Continue your journey", cta_url: `${APP_URL}/dashboard`, accent: "spiritual",
  },
  "birthday-wishes-professional": {
    subject: d => `Happy Birthday, ${d.first_name ?? "there"}`,
    paragraph: () => `Wishing you a very happy birthday and a strong year ahead — personally and in the business you are building.`,
    cta_label: "Continue your journey", cta_url: `${APP_URL}/dashboard`, accent: "professional",
  },
  "zoom-invite-followup": {
    subject: () => `Quick reminder — your Zoom session with the team`,
    paragraph: () => `Just a quick reminder about the team Zoom session. Bring one question you want answered — that is what makes these calls worth it for you.`,
    cta_label: "Open your dashboard", cta_url: `${APP_URL}/dashboard`, accent: "green",
  },
};

const ACCENT_COLORS: Record<string, string> = {
  green: "#0f7a3f",
  orange: "#e67e22",
  royal: "#5b2a86",
  spiritual: "#2e6f9e",
  professional: "#1f2937",
};

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderHtml(t: TemplateDef, d: TemplateData) {
  const accent = ACCENT_COLORS[t.accent];
  const first = escapeHtml(d.first_name ?? "there");
  const salutation = t.accent === "professional" ? `Hi ${first},` : `Hi Leader ${first},`;
  return `<!doctype html><html><body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;"><tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;padding:24px;">
    <tr><td style="padding:16px 0;border-bottom:3px solid ${accent};">
      <div style="font-size:20px;font-weight:700;color:${accent};letter-spacing:0.5px;">GetWell Africa</div>
    </td></tr>
    <tr><td style="padding:28px 0 8px 0;font-size:16px;line-height:1.6;">
      <p style="margin:0 0 12px 0;">${salutation}</p>
      <p style="margin:0 0 20px 0;">${escapeHtml(t.paragraph(d))}</p>
    </td></tr>
    <tr><td style="padding:16px 0 32px 0;">
      <a href="${t.cta_url}" style="display:inline-block;background:${accent};color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">${t.cta_label}</a>
    </td></tr>
    <tr><td style="padding:16px 0;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;">
      GetWell Africa · <a href="${APP_URL}" style="color:#6b7280;">getwellafrica.com</a>
    </td></tr>
  </table></td></tr></table></body></html>`;
}

// ---------- Callback to hub ----------
async function callHubEmailRecorded(secret: string, hubUrl: string, payload: Record<string, unknown>) {
  const body = JSON.stringify({ kind: "email_recorded", ...payload });
  const ts = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomUUID();
  const sig = await hmacSha256Hex(secret, `${ts}.${nonce}.${APP_KEY}.${body}`);
  const target = new URL("/functions/v1/suite-bridge-hub", hubUrl).toString();
  try {
    await fetch(target, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bridge-app": APP_KEY,
        "x-bridge-timestamp": ts,
        "x-bridge-nonce": nonce,
        "x-bridge-signature": sig,
      },
      body: JSON.stringify({ action: "receive", body: JSON.parse(body) }),
    });
  } catch (_e) { /* best-effort */ }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const secret = Deno.env.get("SUITE_BRIDGE_SECRET_GETWELL_AFRICA_EMAIL");
  const hubUrl = Deno.env.get("VANTOOS_HUB_URL");
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!secret) return json({ error: "spoke_missing_secret" }, 500);
  if (!resendKey) return json({ error: "missing_resend_key" }, 500);

  const senderApp = req.headers.get("x-bridge-app") ?? "";
  const ts = req.headers.get("x-bridge-timestamp") ?? "";
  const nonce = req.headers.get("x-bridge-nonce") ?? "";
  const sig = req.headers.get("x-bridge-signature") ?? "";

  if (!senderApp || !ts || !nonce || !sig) return json({ error: "missing_signature_headers" }, 400);
  if (senderApp !== "vantoos") return json({ error: "unexpected_sender" }, 401);
  if (Math.abs(Math.floor(Date.now() / 1000) - Number(ts)) > SIG_WINDOW_SECONDS) {
    return json({ error: "stale_timestamp" }, 400);
  }

  const bodyStr = await req.text();
  const expected = await hmacSha256Hex(secret, `${ts}.${nonce}.${APP_KEY}.${bodyStr}`);
  if (!timingSafeEqual(sig, expected)) return json({ error: "bad_signature" }, 401);

  let body: any = {};
  try { body = JSON.parse(bodyStr || "{}"); } catch { return json({ error: "bad_json" }, 400); }

  const idempotencyKey: string | undefined = body.idempotency_key;
  if (!idempotencyKey) return json({ error: "missing_idempotency_key" }, 400);

  const templateHint: string = body.template_hint ?? body.template_name ?? "";
  const campaignType: string = body.campaign_type ?? "unknown";
  const originApp: string = body.origin_app ?? "unknown";
  const originEventId: string | null = body.origin_event_id ?? null;
  const hubEventId: string | null = body.hub_event_id ?? null;
  const contact = body.contact ?? {};
  const templateData: TemplateData = {
    first_name: contact.first_name ?? body.first_name,
    tier: body.tier,
    tone: body.tone,
    body_preview: body.body_preview,
    aplgo_id: contact.aplgo_id ?? body.aplgo_id,
    origin_app: originApp,
  };

  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // 1. Dedupe
  const { data: existing } = await sb
    .from("email_dispatch_log")
    .select("id, status, email_send_id, skip_reason")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();
  if (existing) {
    return json({
      accepted: existing.status === "queued" || existing.status === "sent",
      duplicate: true,
      status: existing.status,
      email_send_id: existing.email_send_id,
      reason: existing.skip_reason,
    });
  }

  // 2. Resolve template
  const template = TEMPLATES[templateHint];
  if (!template) {
    await sb.from("email_dispatch_log").insert({
      idempotency_key: idempotencyKey, hub_event_id: hubEventId, origin_app: originApp,
      origin_event_id: originEventId, campaign_type: campaignType,
      template_name: templateHint || "unknown", body_preview: body.body_preview ?? null,
      status: "skipped", skip_reason: "unknown_template",
    });
    return json({ accepted: false, reason: "unknown_template" });
  }

  // 3. Resolve recipient
  let recipient: string | null = (contact.email ?? "").toString().toLowerCase() || null;
  if (!recipient && contact.aplgo_id) {
    const { data: p } = await sb.from("prospects").select("email").eq("aplgo_id", contact.aplgo_id).maybeSingle();
    if (p?.email && !p.email.endsWith("@aplgo.enrollment.pending") && !p.email.endsWith("@placeholder.local")) {
      recipient = p.email.toLowerCase();
    }
  }
  if (!recipient) {
    await sb.from("email_dispatch_log").insert({
      idempotency_key: idempotencyKey, hub_event_id: hubEventId, origin_app: originApp,
      origin_event_id: originEventId, campaign_type: campaignType,
      template_name: templateHint, recipient_hash: contact.phone_hash ?? null,
      body_preview: body.body_preview ?? null, status: "skipped", skip_reason: "no_email",
    });
    if (hubUrl) await callHubEmailRecorded(secret, hubUrl, { idempotency_key: idempotencyKey, status: "skipped", reason: "no_email" });
    return json({ accepted: false, reason: "no_email" });
  }

  // 4. Suppression — rely on prospects.unsubscribed (no suppressed_emails table in this project)
  const { data: pros } = await sb
    .from("prospects").select("unsubscribed").eq("email", recipient).maybeSingle();
  if (pros?.unsubscribed) {
    await sb.from("email_dispatch_log").insert({
      idempotency_key: idempotencyKey, hub_event_id: hubEventId, origin_app: originApp,
      origin_event_id: originEventId, campaign_type: campaignType,
      template_name: templateHint, recipient_email: recipient,
      body_preview: body.body_preview ?? null, status: "skipped", skip_reason: "suppressed",
    });
    if (hubUrl) await callHubEmailRecorded(secret, hubUrl, { idempotency_key: idempotencyKey, status: "skipped", reason: "suppressed" });
    return json({ accepted: false, reason: "suppressed" });
  }
    await sb.from("email_dispatch_log").insert({
      idempotency_key: idempotencyKey, hub_event_id: hubEventId, origin_app: originApp,
      origin_event_id: originEventId, campaign_type: campaignType,
      template_name: templateHint, recipient_email: recipient,
      body_preview: body.body_preview ?? null, status: "skipped", skip_reason: "suppressed",
    });
    if (hubUrl) await callHubEmailRecorded(secret, hubUrl, { idempotency_key: idempotencyKey, status: "skipped", reason: "suppressed" });
    return json({ accepted: false, reason: "suppressed" });
  }

  // 5. Send via Resend
  const resend = new Resend(resendKey);
  const subject = template.subject(templateData);
  const html = renderHtml(template, templateData);
  let sendId: string | null = null;
  let sendError: string | null = null;
  try {
    const result = await resend.emails.send({
      from: "GetWell Africa <vanto@onlinecourseformlm.com>",
      to: [recipient],
      subject,
      html,
      headers: { "X-Idempotency-Key": idempotencyKey },
    });
    sendId = (result as any)?.data?.id ?? (result as any)?.id ?? null;
    if ((result as any)?.error) sendError = JSON.stringify((result as any).error);
  } catch (e) {
    sendError = String(e);
  }

  const status = sendError ? "failed" : "queued";
  const { data: logRow } = await sb.from("email_dispatch_log").insert({
    idempotency_key: idempotencyKey,
    hub_event_id: hubEventId,
    origin_app: originApp,
    origin_event_id: originEventId,
    campaign_type: campaignType,
    template_name: templateHint,
    recipient_email: recipient,
    recipient_hash: contact.phone_hash ?? null,
    body_preview: body.body_preview ?? null,
    status,
    skip_reason: sendError,
    email_send_id: sendId as any,
  }).select("id").maybeSingle();

  // Best-effort: log to email_events for analytics
  if (status === "queued") {
    try {
      await sb.from("email_events").insert({
        event_type: "email.sent",
        email: recipient,
        metadata: { source: "hub-email-dispatch", template: templateHint, subject, campaign_type: campaignType },
      });
    } catch (_e) { /* ignore */ }
  }

  // 6. Callback hub
  if (hubUrl) {
    await callHubEmailRecorded(secret, hubUrl, {
      idempotency_key: idempotencyKey,
      status,
      email_send_id: sendId,
      dispatch_log_id: logRow?.id ?? null,
      reason: sendError,
    });
  }

  return json({
    accepted: status === "queued",
    status,
    email_send_id: sendId,
    dispatch_log_id: logRow?.id ?? null,
    reason: sendError,
  }, sendError ? 502 : 200);
});
