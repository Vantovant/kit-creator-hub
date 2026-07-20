// ============================================================
// ZAZI MAIL INBOX — Gmail send (Phase 5)
// ============================================================
// Sends a new message OR a threaded reply via the Lovable Gmail gateway.
// POST body:
//   {
//     account_id: uuid,                 // required
//     to: string,                       // required
//     cc?: string,
//     bcc?: string,
//     subject: string,                  // required
//     body_text: string,                // required (plain text)
//     body_html?: string,               // optional (rich)
//     reply_to_message_id?: string,     // local inbox_messages.id when replying
//   }
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

function b64url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function buildRawMime(opts: {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  text: string;
  html?: string;
  inReplyTo?: string;
  references?: string;
}): string {
  const boundary = `zazi_${Math.random().toString(36).slice(2)}`;
  const hasHtml = !!opts.html;
  const headers: string[] = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
  ];
  if (opts.cc) headers.push(`Cc: ${opts.cc}`);
  if (opts.bcc) headers.push(`Bcc: ${opts.bcc}`);
  headers.push(`Subject: ${opts.subject}`);
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`);
  if (opts.references) headers.push(`References: ${opts.references}`);
  headers.push("MIME-Version: 1.0");

  if (!hasHtml) {
    headers.push('Content-Type: text/plain; charset="UTF-8"');
    return `${headers.join("\r\n")}\r\n\r\n${opts.text}`;
  }

  headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    opts.text,
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    opts.html || "",
    `--${boundary}--`,
    "",
  ];
  return `${headers.join("\r\n")}\r\n\r\n${parts.join("\r\n")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!lovableKey || !connectionKey) return json({ error: "missing_gateway_keys" }, 500);

  let body: any = {};
  try { body = await req.json(); } catch { return json({ error: "invalid_json" }, 400); }

  const { account_id, to, cc, bcc, subject, body_text, body_html, reply_to_message_id } = body;
  if (!account_id || !to || !subject || !body_text) {
    return json({ error: "account_id, to, subject, body_text required" }, 400);
  }

  const { data: account } = await supabase.from("inbox_accounts").select("*").eq("id", account_id).maybeSingle();
  if (!account) return json({ error: "account_not_found" }, 404);

  let inReplyTo: string | undefined;
  let references: string | undefined;
  let threadId: string | undefined;
  let replySubject = subject;

  if (reply_to_message_id) {
    const { data: parent } = await supabase.from("inbox_messages")
      .select("message_id, thread_id, subject").eq("id", reply_to_message_id).maybeSingle();
    if (parent) {
      threadId = parent.thread_id || undefined;
      // Fetch the parent's RFC822 Message-ID header via gateway
      try {
        const r = await fetch(`${GATEWAY_URL}/users/me/messages/${parent.message_id}?format=metadata&metadataHeaders=Message-Id&metadataHeaders=References`, {
          headers: { "Authorization": `Bearer ${lovableKey}`, "X-Connection-Api-Key": connectionKey },
        });
        if (r.ok) {
          const meta = await r.json();
          const hs = Object.fromEntries((meta.payload?.headers || []).map((h: any) => [h.name.toLowerCase(), h.value]));
          if (hs["message-id"]) {
            inReplyTo = hs["message-id"];
            references = hs["references"] ? `${hs["references"]} ${hs["message-id"]}` : hs["message-id"];
          }
        }
      } catch { /* non-fatal */ }
      if (parent.subject && !/^re:/i.test(subject)) replySubject = `Re: ${parent.subject}`;
    }
  }

  const raw = buildRawMime({
    from: account.email_address,
    to, cc, bcc,
    subject: replySubject,
    text: body_text,
    html: body_html,
    inReplyTo,
    references,
  });

  const sendBody: any = { raw: b64url(raw) };
  if (threadId) sendBody.threadId = threadId;

  const r = await fetch(`${GATEWAY_URL}/users/me/messages/send`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sendBody),
  });
  const text = await r.text();
  if (!r.ok) {
    console.error(`gmail-send gateway ${r.status}: ${text}`);
    return json({ error: "gateway_failed", status: r.status, detail: text }, r.status);
  }

  // Log the send
  await supabase.from("inbox_action_log").insert({
    user_id: account.user_id,
    message_id: reply_to_message_id || null,
    action_type: reply_to_message_id ? "reply_sent" : "compose_sent",
    action_data: { to, cc, bcc, subject: replySubject, thread_id: threadId || null },
  });

  return json({ ok: true, sent: JSON.parse(text) });
});
