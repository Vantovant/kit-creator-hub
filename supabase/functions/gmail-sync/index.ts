// ============================================================
// ZAZI MAIL INBOX — Gmail sync (Phase 2)
// ============================================================
// Reads the connected builder Gmail account via Lovable gateway,
// stores messages in inbox_messages, and matches senders to prospects.
//
// Trigger: POST { account_id, max_results?, label_filter? }
// Scheduled: cron every 2 min per active account (or manual trigger).
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_mail/gmail/v1";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(raw: string): string {
  return raw.toLowerCase().replace(/\s/g, "").replace(/<|>/g, "");
}

function parseSender(sender: string): { email: string; name: string | null } {
  const match = sender.match(/(.*?)\s*<([^>]+)>/);
  if (match) {
    return { email: normalizeEmail(match[2]), name: match[1].trim() || null };
  }
  return { email: normalizeEmail(sender), name: null };
}

function decodeB64(data: string): string {
  try {
    const bin = atob(data.replace(/-/g, "+").replace(/_/g, "/"));
    // handle utf-8
    return decodeURIComponent(escape(bin));
  } catch {
    try { return atob(data.replace(/-/g, "+").replace(/_/g, "/")); } catch { return ""; }
  }
}

async function getBodyPartData(part: any, messageId: string, lovableKey: string, connectionKey: string): Promise<string> {
  if (part?.body?.data) return decodeB64(part.body.data);
  if (!part?.body?.attachmentId) return "";

  try {
    const attachment = await gatewayGet(
      `/users/me/messages/${messageId}/attachments/${part.body.attachmentId}`,
      lovableKey,
      connectionKey,
    );
    return attachment?.data ? decodeB64(attachment.data) : "";
  } catch {
    return "";
  }
}

async function extractBodies(
  payload: any,
  messageId: string,
  lovableKey: string,
  connectionKey: string,
): Promise<{ text: string | null; html: string | null }> {
  if (!payload) return { text: null, html: null };
  let text: string | null = null;
  let html: string | null = null;
  const walk = async (p: any) => {
    if (!p) return;
    if (p.mimeType === "text/plain" && !text) {
      const value = await getBodyPartData(p, messageId, lovableKey, connectionKey);
      if (value.trim()) text = value;
    }
    if (p.mimeType === "text/html" && !html) {
      const value = await getBodyPartData(p, messageId, lovableKey, connectionKey);
      if (value.trim()) html = value;
    }
    if (p.parts) {
      for (const child of p.parts) await walk(child);
    }
  };
  await walk(payload);
  return { text, html };
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function bodyPreview(text: string | null, html: string | null): string | null {
  if (html) return stripHtml(html).replace(/\s+/g, " ").trim().slice(0, 400);
  if (text) return text.replace(/\s+/g, " ").trim().slice(0, 400);
  return null;
}

async function gatewayGet(path: string, lovableKey: string, connectionKey: string) {
  const url = `${GATEWAY_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gateway ${res.status}: ${text}`);
  return JSON.parse(text);
}

function getGmailConnectionKeys() {
  const keys: { envName: string; key: string }[] = [];
  const primary = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (primary) keys.push({ envName: "GOOGLE_MAIL_API_KEY", key: primary });

  for (let i = 1; i <= 10; i += 1) {
    const envName = `GOOGLE_MAIL_API_KEY_${i}`;
    const key = Deno.env.get(envName);
    if (key) keys.push({ envName, key });
  }

  return keys;
}

async function listAuthorizedGmailProfiles(lovableKey: string) {
  const profiles: { envName: string; key: string; emailAddress: string; messagesTotal?: number; threadsTotal?: number }[] = [];
  const errors: string[] = [];

  for (const connection of getGmailConnectionKeys()) {
    try {
      const profile = await gatewayGet("/users/me/profile", lovableKey, connection.key);
      if (profile?.emailAddress) {
        profiles.push({
          envName: connection.envName,
          key: connection.key,
          emailAddress: normalizeEmail(profile.emailAddress),
          messagesTotal: profile.messagesTotal,
          threadsTotal: profile.threadsTotal,
        });
      }
    } catch (e: any) {
      errors.push(`${connection.envName}: ${e.message}`);
    }
  }

  return { profiles, errors };
}

async function resolveConnectionKeyForAccount(account: any, lovableKey: string): Promise<string> {
  const expectedEmail = normalizeEmail(account.email_address || "");
  const { profiles } = await listAuthorizedGmailProfiles(lovableKey);
  const match = profiles.find((profile) => profile.emailAddress === expectedEmail);

  if (!match) {
    throw new Error(
      `No linked Gmail authorization matches ${account.email_address}. Authorize that mailbox in Settings, then refresh authorized accounts.`,
    );
  }

  return match.key;
}

async function getRequestUser(req: Request, supabase: any) {
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return data.user || null;
}

async function gatewayPost(path: string, body: any, lovableKey: string, connectionKey: string) {
  const url = `${GATEWAY_URL}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Gateway ${res.status}: ${text}`);
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey || getGmailConnectionKeys().length === 0) {
    return json({ error: "missing_gateway_keys" }, 500);
  }

  // Parse request body
  let payload: any = {};
  try {
    if (req.method === "POST") payload = await req.json();
  } catch { /* empty manual trigger allowed */ }

  if (payload?.discover_accounts === true) {
    const user = await getRequestUser(req, supabase);
    if (!user) return json({ error: "authentication_required" }, 401);

    const { profiles, errors } = await listAuthorizedGmailProfiles(lovableKey);
    const accounts: any[] = [];

    for (const profile of profiles) {
      const { data: existing } = await supabase
        .from("inbox_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("provider", "gmail")
        .eq("email_address", profile.emailAddress)
        .maybeSingle();

      if (existing) {
        const { data } = await supabase
          .from("inbox_accounts")
          .update({ status: "connected", is_active: true, sync_error: null })
          .eq("id", existing.id)
          .select("*")
          .single();
        if (data) accounts.push(data);
      } else {
        const { data } = await supabase
          .from("inbox_accounts")
          .insert({
            user_id: user.id,
            provider: "gmail",
            email_address: profile.emailAddress,
            label: profile.emailAddress,
            status: "connected",
            is_active: true,
          })
          .select("*")
          .single();
        if (data) accounts.push(data);
      }
    }

    return json({ ok: true, accounts, errors: errors.length ? errors : undefined });
  }

  const accountId = payload?.account_id;
  const maxResults = Math.min(Math.max(payload?.max_results ?? 50, 1), 200);
  const labelFilter = payload?.label_filter ?? "inbox";

  if (!accountId) {
    return json({ error: "account_id required" }, 400);
  }

  // Fetch account row
  const { data: account, error: accountErr } = await supabase
    .from("inbox_accounts")
    .select("*")
    .eq("id", accountId)
    .eq("is_active", true)
    .maybeSingle();

  if (accountErr || !account) {
    return json({ error: "account_not_found", detail: accountErr?.message }, 404);
  }

  // Ownership check: the caller must own this mailbox.
  const requestUser = await getRequestUser(req, supabase);
  if (!requestUser) return json({ error: "authentication_required" }, 401);
  if (requestUser.id !== account.user_id) return json({ error: "forbidden" }, 403);

  let connectionKey: string;
  try {
    connectionKey = await resolveConnectionKeyForAccount(account, lovableKey);
  } catch (e: any) {
    await supabase
      .from("inbox_accounts")
      .update({ status: "needs_authorization", sync_error: e.message })
      .eq("id", accountId);
    return json({ error: "gmail_authorization_required", detail: e.message }, 409);
  }

  // List messages
  let q = labelFilter === "inbox" ? "in:inbox" : "";
  const list = await gatewayGet(
    `/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(q)}`,
    lovableKey,
    connectionKey,
  );

  const messages = list.messages || [];
  const stored: string[] = [];
  const errors: string[] = [];

  for (const m of messages) {
    try {
      const full = await gatewayGet(
        `/users/me/messages/${m.id}?format=full`,
        lovableKey,
        connectionKey,
      );

      const headers = Object.fromEntries(
        (full.payload?.headers || []).map((h: any) => [h.name.toLowerCase(), h.value]),
      );

      const sender = parseSender(headers.from || "Unknown");
      const to = (headers.to || "").split(",").map(normalizeEmail).filter(Boolean);
      const cc = (headers.cc || "").split(",").map(normalizeEmail).filter(Boolean);
      const subject = headers.subject || "(no subject)";
      const date = new Date(Number(full.internalDate));
      const { text: textBody, html: htmlBody } = await extractBodies(full.payload, full.id, lovableKey, connectionKey);
      const preview = bodyPreview(textBody, htmlBody) || full.snippet || "";

      // NOTE: We intentionally do NOT auto-link senders to prospects here.
      // Users add contacts explicitly via the Contact 360 panel.
      const upsert = {
        user_id: account.user_id,
        account_id: account.id,
        message_id: full.id,
        thread_id: full.threadId || null,
        sender: sender.email,
        sender_name: sender.name,
        recipients: to,
        cc,
        subject,
        snippet: full.snippet || null,
        body_preview: preview,
        body_text: textBody,
        body_html: htmlBody,
        date: date.toISOString(),
        label_ids: full.labelIds || [],
        is_read: !(full.labelIds || []).includes("UNREAD"),
        is_starred: (full.labelIds || []).includes("STARRED"),
        is_archived: !(full.labelIds || []).includes("INBOX"),
        prospect_id: null,
        category: null,
        urgency: null,
        intent: null,
      };

      const { data: upserted, error: upsertErr } = await supabase
        .from("inbox_messages")
        .upsert(upsert, { onConflict: "account_id, message_id" })
        .select("id")
        .single();

      if (upsertErr) throw upsertErr;
      stored.push(full.id);

      // AGENTIC LEARNING: apply learned sender routing on NEW inbox messages only.
      const isFreshInbox = (full.labelIds || []).includes("INBOX") && (full.labelIds || []).includes("UNREAD");
      if (upserted?.id && isFreshInbox) {
        const { data: signals } = await supabase
          .from("inbox_learning_signals")
          .select("signal, weight")
          .eq("user_id", account.user_id)
          .eq("sender_email", sender.email);
        const spamWeight = signals?.find((s) => s.signal === "spam")?.weight || 0;
        const keepWeight = signals?.find((s) => s.signal === "keep")?.weight || 0;
        if (keepWeight > 0) {
          // Learned KEEP: ensure starred + in inbox.
          try {
            await gatewayPost(
              `/users/me/messages/${full.id}/modify`,
              { addLabelIds: ["STARRED", "INBOX"], removeLabelIds: [] },
              lovableKey,
              connectionKey,
            );
            await supabase
              .from("inbox_messages")
              .update({ is_starred: true, is_archived: false })
              .eq("id", upserted.id);
          } catch { /* non-fatal */ }
        } else if (spamWeight > 0) {
          // Learned SPAM: send to Gmail Spam folder + mark deleted locally.
          try {
            await gatewayPost(
              `/users/me/messages/${full.id}/modify`,
              { addLabelIds: ["SPAM"], removeLabelIds: ["INBOX", "UNREAD"] },
              lovableKey,
              connectionKey,
            );
            await supabase
              .from("inbox_messages")
              .update({ is_archived: true, is_read: true, deleted_at: new Date().toISOString() })
              .eq("id", upserted.id);
          } catch { /* non-fatal */ }
        }
      }

      // Fire-and-forget AI classify
      if (upserted?.id) {
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/inbox-classify`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": Deno.env.get("SUPABASE_ANON_KEY")! },
          body: JSON.stringify({ message_id: upserted.id }),
        }).catch(() => {});
      }

    } catch (e: any) {
      errors.push(`${m.id}: ${e.message}`);
    }
  }

  // Update account last_sync_at
  await supabase
    .from("inbox_accounts")
    .update({ last_sync_at: new Date().toISOString(), sync_error: errors.length ? errors.join("; ") : null })
    .eq("id", accountId);

  return json({
    ok: true,
    account_id: accountId,
    fetched: messages.length,
    stored: stored.length,
    errors: errors.length ? errors : undefined,
  });
});
