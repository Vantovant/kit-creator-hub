import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend@^2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-mcp-token',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

// Timing-safe string compare — same convention already used in this repo's
// contacts-bulk-sync/suite-bridge-spoke HMAC checks, and in the Zazi CRM /
// Get Well Hub mcp-bridge functions before this one.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  const len = Math.max(ab.length, bb.length)
  let diff = ab.length ^ bb.length
  for (let i = 0; i < len; i++) diff |= (ab[i] ?? 0) ^ (bb[i] ?? 0)
  return diff === 0
}

// ---------------------------------------------------------------------------
// reply_to_inbox_message helpers — reuse gmail-send's MIME/threading/gateway
// logic, but since this bridge authenticates via x-mcp-token (service role,
// no user JWT), ownership is enforced by comparing the message's owner
// against the resolved DEFAULT_OWNER_EMAIL user, instead of gmail-send's
// JWT-based `sender.id === account.user_id` check.
// ---------------------------------------------------------------------------
const GMAIL_GATEWAY_URL = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1'
const APP_URL = 'https://kit-clone-dashboard.lovable.app'

function b64url(input: string): string {
  const bytes = new TextEncoder().encode(input)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function normalizeEmail(raw: string): string {
  return raw.toLowerCase().replace(/\s/g, '').replace(/<|>/g, '')
}

function buildReplyMime(opts: {
  from: string; to: string; subject: string; text: string
  inReplyTo?: string; references?: string
}): string {
  const headers = [
    `From: ${opts.from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
  ]
  if (opts.inReplyTo) headers.push(`In-Reply-To: ${opts.inReplyTo}`)
  if (opts.references) headers.push(`References: ${opts.references}`)
  headers.push('MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"')
  return `${headers.join('\r\n')}\r\n\r\n${opts.text}`
}

async function resolveGmailConnectionKey(email: string, lovableKey: string): Promise<string> {
  const expected = normalizeEmail(email)
  const keys: string[] = []
  const primary = Deno.env.get('GOOGLE_MAIL_API_KEY')
  if (primary) keys.push(primary)
  for (let i = 1; i <= 10; i++) {
    const k = Deno.env.get(`GOOGLE_MAIL_API_KEY_${i}`)
    if (k) keys.push(k)
  }
  for (const key of keys) {
    try {
      const res = await fetch(`${GMAIL_GATEWAY_URL}/users/me/profile`, {
        headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': key },
      })
      if (!res.ok) continue
      const profile = await res.json()
      if (normalizeEmail(profile?.emailAddress || '') === expected) return key
    } catch { /* try next linked Gmail connection */ }
  }
  throw new Error(`No linked Gmail authorization matches ${email}`)
}

// ---------------------------------------------------------------------------
// sync_gmail_inbox helpers — mirror gmail-sync/index.ts's own fetch/decode/
// store logic (list -> full fetch -> decode bodies -> upsert), but scoped by
// the resolved DEFAULT_OWNER_EMAIL owner instead of a user JWT, since this
// bridge has no session to reuse. Deliberately does NOT include gmail-sync's
// "learning" branch (auto-star / auto-move-to-spam based on stored signals)
// — that mutates the user's real Gmail mailbox, not just this app's
// database, and was scoped out of the MCP tool as a safeguard rather than
// assumed safe to carry over.
// ---------------------------------------------------------------------------
async function gatewayGet(path: string, lovableKey: string, connectionKey: string) {
  const url = `${GMAIL_GATEWAY_URL}${path}`
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      'X-Connection-Api-Key': connectionKey,
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`Gateway ${res.status}: ${text}`)
  return JSON.parse(text)
}

function parseSender(sender: string): { email: string; name: string | null } {
  const match = sender.match(/(.*?)\s*<([^>]+)>/)
  if (match) {
    return { email: normalizeEmail(match[2]), name: match[1].trim() || null }
  }
  return { email: normalizeEmail(sender), name: null }
}

function decodeB64(data: string): string {
  try {
    const bin = atob(data.replace(/-/g, '+').replace(/_/g, '/'))
    return decodeURIComponent(escape(bin))
  } catch {
    try { return atob(data.replace(/-/g, '+').replace(/_/g, '/')) } catch { return '' }
  }
}

async function getBodyPartData(part: any, messageId: string, lovableKey: string, connectionKey: string): Promise<string> {
  if (part?.body?.data) return decodeB64(part.body.data)
  if (!part?.body?.attachmentId) return ''
  try {
    const attachment = await gatewayGet(
      `/users/me/messages/${messageId}/attachments/${part.body.attachmentId}`,
      lovableKey,
      connectionKey,
    )
    return attachment?.data ? decodeB64(attachment.data) : ''
  } catch {
    return ''
  }
}

async function extractBodies(
  payload: any,
  messageId: string,
  lovableKey: string,
  connectionKey: string,
): Promise<{ text: string | null; html: string | null }> {
  if (!payload) return { text: null, html: null }
  let text: string | null = null
  let html: string | null = null
  const walk = async (p: any) => {
    if (!p) return
    if (p.mimeType === 'text/plain' && !text) {
      const value = await getBodyPartData(p, messageId, lovableKey, connectionKey)
      if (value.trim()) text = value
    }
    if (p.mimeType === 'text/html' && !html) {
      const value = await getBodyPartData(p, messageId, lovableKey, connectionKey)
      if (value.trim()) html = value
    }
    if (p.parts) {
      for (const child of p.parts) await walk(child)
    }
  }
  await walk(payload)
  return { text, html }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
}

function bodyPreview(text: string | null, html: string | null): string | null {
  if (html) return stripHtml(html).replace(/\s+/g, ' ').trim().slice(0, 400)
  if (text) return text.replace(/\s+/g, ' ').trim().slice(0, 400)
  return null
}

// ---------------------------------------------------------------------------
// send_prospect_email helper — resolves the per-brand Resend "reply account"
// exactly the way process-scheduled-broadcasts does (zzi_reply_accounts,
// exact user+brand match, no cross-brand fallback), so individual sends from
// this bridge look and behave identically to real broadcast/sequence sends.
// ---------------------------------------------------------------------------
async function resolveReplyAccount(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  brand: string,
): Promise<{ id: string; email: string; signatureHtml: string | null } | null> {
  const { data } = await supabase
    .from('zazi_reply_accounts')
    .select('id, account_email, config_json')
    .eq('user_id', userId)
    .eq('brand', brand)
    .eq('is_active', true)
    .limit(1)
  if (data?.length) {
    const row = data[0] as { id: string; account_email: string; config_json: Record<string, unknown> | null }
    return {
      id: row.id,
      email: row.account_email,
      // Default signature lives in config_json.signature_html, set per-brand
      // (2026-08-11). No dedicated column — reuses the existing generic
      // config_json field rather than a schema migration.
      signatureHtml: typeof row.config_json?.signature_html === 'string' ? row.config_json.signature_html : null,
    }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  // ---- Fail-closed auth: missing/wrong token -> 401. No fallback "system" path. ----
  const expected = Deno.env.get('MCP_BRIDGE_TOKEN')
  const provided = req.headers.get('x-mcp-token')
  if (!expected || !provided || !timingSafeEqual(provided, expected)) {
    return json({ error: 'unauthorized' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  )

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }

  const action = String(body.action ?? '')

  // NOTE on scoping — this app differs from Zazi CRM / Get Well Hub:
  // `prospects` and `broadcasts` carry NO user_id column and their RLS
  // policies grant any authenticated user full access (single shared
  // workspace, not per-user tenancy). So reads/updates below do NOT filter
  // by an owner id — there is nothing to filter by. The one place an owner
  // identity is still needed is attribution on writes to `contact_activities`
  // (its user_id column is informational/audit, not an access boundary), so
  // we resolve DEFAULT_OWNER_EMAIL to an auth user id via the Admin Auth API
  // (profiles has no email column in this app, unlike Zazi CRM's profiles
  // table — auth.admin.listUsers() is the reliable source here).
  //
  // Plan Hub tables (plan_tasks, plan_reminders, plan_meetings) and
  // inbox_messages/inbox_accounts DO have a real user_id / per-user RLS
  // model — but since this bridge uses the service-role key (bypasses RLS
  // entirely), the same DEFAULT_OWNER_EMAIL resolution is reused below to
  // attribute/scope those rows to the single configured account, rather
  // than adding a second, different owner-resolution pattern.
  async function resolveOwnerUserId(): Promise<string | null> {
    const email = (Deno.env.get('DEFAULT_OWNER_EMAIL') ?? '').toLowerCase().trim()
    if (!email) return null
    let page = 1
    for (let i = 0; i < 5; i++) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
      if (error || !data?.users?.length) break
      const match = data.users.find((u) => (u.email ?? '').toLowerCase() === email)
      if (match) return match.id
      if (data.users.length < 200) break
      page++
    }
    return null
  }

  try {
    switch (action) {
      case 'list_prospects': {
        const contactType = body.contact_type ? String(body.contact_type) : null
        const leadType = body.lead_type ? String(body.lead_type) : null
        const leadTemperature = body.lead_temperature ? String(body.lead_temperature) : null
        const unsubscribed = typeof body.unsubscribed === 'boolean' ? body.unsubscribed : null
        const search = body.search ? String(body.search) : null
        const limit = Number.isInteger(Number(body.limit)) && Number(body.limit) > 0
          ? Math.min(Number(body.limit), 100) : 25

        let query = supabase.from('prospects')
          .select('id, full_name, first_name, last_name, email, phone_normalized, contact_type, lead_type, lead_temperature, unsubscribed, engagement_score, source, updated_at')
          .order('updated_at', { ascending: false })
          .limit(limit)
        if (contactType) query = query.eq('contact_type', contactType)
        if (leadType) query = query.eq('lead_type', leadType)
        if (leadTemperature) query = query.eq('lead_temperature', leadTemperature)
        if (unsubscribed !== null) query = query.eq('unsubscribed', unsubscribed)
        if (search) query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)

        const { data, error } = await query
        if (error) throw error
        return json({ ok: true, count: data?.length ?? 0, prospects: data ?? [] })
      }

      case 'get_prospect': {
        const prospectId = body.prospect_id ? String(body.prospect_id) : null
        const email = body.email ? String(body.email).toLowerCase().trim() : null
        if (!prospectId && !email) return json({ error: 'prospect_id_or_email_required' }, 400)

        let query = supabase.from('prospects').select('*').limit(1)
        query = prospectId ? query.eq('id', prospectId) : query.eq('email', email)
        const { data: prospect, error } = await query.maybeSingle()
        if (error) throw error
        if (!prospect) return json({ error: 'prospect_not_found' }, 404)

        const { data: recentActivity } = await supabase
          .from('contact_activities')
          .select('activity_type, notes, outcome, created_at')
          .eq('prospect_id', prospect.id)
          .order('created_at', { ascending: false })
          .limit(10)

        // email_events has no prospect_id column (confirmed against
        // resend-webhook's own insert) — it's keyed by `email` instead.
        const { data: recentEvents } = await supabase
          .from('email_events')
          .select('event_type, created_at')
          .eq('email', prospect.email)
          .order('created_at', { ascending: false })
          .limit(10)

        // Tags — joined via prospect_tags.
        const { data: tagRows } = await supabase
          .from('prospect_tags')
          .select('tags(name)')
          .eq('prospect_id', prospect.id)
        const tags = (tagRows ?? []).map((r: any) => r.tags?.name).filter(Boolean)

        return json({ ok: true, prospect, tags, recent_activity: recentActivity ?? [], recent_email_events: recentEvents ?? [] })
      }

      case 'update_prospect': {
        const prospectId = String(body.prospect_id ?? '')
        if (!prospectId) return json({ error: 'prospect_id_required' }, 400)

        // Only fields explicitly provided are changed. Email is intentionally NOT
        // editable here (identity/matching field used by hub sync and unsubscribe
        // lookups) — same exclusion pattern as phone_number in the Zazi CRM bridge.
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
        const allowed = [
          'full_name', 'first_name', 'last_name', 'contact_type',
          'lead_type', 'lead_temperature', 'unsubscribed', 'consent_marketing',
        ]
        for (const key of allowed) {
          if (body[key] !== undefined) {
            updates[key] = typeof body[key] === 'string' ? (body[key] as string).trim() : body[key]
          }
        }
        if (Object.keys(updates).length === 1) return json({ error: 'no_updatable_fields_provided' }, 400)

        const { data, error } = await supabase
          .from('prospects')
          .update(updates)
          .eq('id', prospectId)
          .select('id, full_name, email, contact_type, lead_type, lead_temperature, updated_at')
          .single()
        if (error) throw error
        return json({ ok: true, prospect: data })
      }

      case 'add_contact_note': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const prospectId = String(body.prospect_id ?? '')
        const note = String(body.note ?? '').trim()
        if (!prospectId) return json({ error: 'prospect_id_required' }, 400)
        if (!note) return json({ error: 'note_required' }, 400)

        const { data: prospect, error: pErr } = await supabase
          .from('prospects').select('id').eq('id', prospectId).maybeSingle()
        if (pErr) throw pErr
        if (!prospect) return json({ error: 'prospect_not_found' }, 404)

        // Strictly additive — inserts a new contact_activities row, never edits
        // or overwrites any existing activity entry.
        const { data: inserted, error } = await supabase.from('contact_activities').insert({
          user_id: ownerId,
          prospect_id: prospectId,
          activity_type: 'note',
          notes: note,
          outcome: null,
        }).select('id, created_at').single()
        if (error) throw error

        return json({ ok: true, prospect_id: prospectId, activity_id: inserted.id, created_at: inserted.created_at })
      }

      case 'create_prospect': {
        // Directly creates/updates a prospect via upsert-by-email, mirroring
        // save-prospect's core write — but deliberately does NOT call
        // execute-automation or execute-sequence. Creating a contact through
        // this bridge never triggers a welcome email or any other send;
        // that stays a conscious, separate action in the app itself.
        const email = body.email ? String(body.email).toLowerCase().trim() : ''
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!email || !emailRegex.test(email)) return json({ error: 'valid_email_required' }, 400)

        const insert: Record<string, unknown> = {
          email,
          last_activity_at: new Date().toISOString(),
          source: body.source ? String(body.source).slice(0, 60) : 'claude_mcp',
        }
        const optionalFields = ['first_name', 'last_name', 'full_name', 'contact_type', 'lead_type', 'lead_temperature']
        for (const key of optionalFields) {
          if (body[key] !== undefined && body[key] !== null) {
            insert[key] = typeof body[key] === 'string' ? (body[key] as string).trim() : body[key]
          }
        }
        if (body.phone_number) insert.phone_number = String(body.phone_number).slice(0, 40)

        const { data, error } = await supabase
          .from('prospects')
          .upsert(insert, { onConflict: 'email' })
          .select('id, email, full_name, first_name, contact_type, lead_type, lead_temperature, created_at, updated_at')
          .single()
        if (error) throw error
        return json({ ok: true, prospect: data })
      }

      case 'tag_prospect': {
        // NOTE: tags.user_id is NOT NULL. The equivalent tagging code in
        // save-prospect and process-scheduled-broadcasts omits user_id
        // entirely and wraps the insert in a non-fatal try/catch — meaning
        // both of those have likely been silently failing on every call in
        // production (confirmed 2026-08-09: all 81 existing tag rows have
        // user_id populated, consistent with only ever being created via
        // the app's own UI, never via those two backend paths). Resolving
        // and setting the owner id here avoids repeating that bug.
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const prospectId = String(body.prospect_id ?? '')
        const tagName = body.tag_name ? String(body.tag_name).trim() : ''
        if (!prospectId) return json({ error: 'prospect_id_required' }, 400)
        if (!tagName) return json({ error: 'tag_name_required' }, 400)

        const { data: prospect, error: pErr } = await supabase
          .from('prospects').select('id').eq('id', prospectId).maybeSingle()
        if (pErr) throw pErr
        if (!prospect) return json({ error: 'prospect_not_found' }, 404)

        // Upsert-by-name, now with user_id set. As of 2026-08-09 tags.name
        // also has a real UNIQUE constraint (added this session — it was
        // previously missing, which caused a separate onConflict failure
        // and let duplicate-named tag rows accumulate).
        const { data: tag, error: tagErr } = await supabase
          .from('tags')
          .upsert({ name: tagName, user_id: ownerId }, { onConflict: 'name' })
          .select('id, name')
          .single()
        if (tagErr) throw tagErr

        const { error: linkErr } = await supabase
          .from('prospect_tags')
          .upsert({ prospect_id: prospectId, tag_id: tag.id }, { onConflict: 'prospect_id,tag_id' })
        if (linkErr) throw linkErr

        return json({ ok: true, prospect_id: prospectId, tag: tag.name })
      }

      case 'list_broadcasts': {
        const status = body.status ? String(body.status) : null
        const brand = body.brand ? String(body.brand) : null
        const limit = Number.isInteger(Number(body.limit)) && Number(body.limit) > 0
          ? Math.min(Number(body.limit), 100) : 25

        let query = supabase.from('broadcasts')
          .select('id, subject, brand, status, from_name, segment_id, scheduled_at, sent_at, total_recipients, total_sent, total_failed, created_at')
          .order('created_at', { ascending: false })
          .limit(limit)
        if (status) query = query.eq('status', status)
        if (brand) query = query.eq('brand', brand)

        const { data, error } = await query
        if (error) throw error
        return json({ ok: true, count: data?.length ?? 0, broadcasts: data ?? [] })
      }

      case 'create_broadcast': {
        // GUARDRAIL ENFORCED IN THE TOOL ITSELF, not just in instructions:
        // status is hard-coded to 'draft' below and cannot be overridden by
        // any input field. This bridge will never create a 'scheduled' or
        // 'sending' broadcast — process-scheduled-broadcasts (the cron that
        // actually dispatches real email) only ever picks up rows already
        // at status='scheduled', so a draft row sitting here is inert until
        // a human schedules or sends it from inside the app.
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const subject = body.subject ? String(body.subject).trim() : ''
        const content = body.content ? String(body.content) : ''
        if (!subject) return json({ error: 'subject_required' }, 400)
        if (!content) return json({ error: 'content_required' }, 400)

        const insert: Record<string, unknown> = {
          user_id: ownerId,
          subject,
          content,
          status: 'draft', // hard-coded — see note above
          from_name: body.from_name ? String(body.from_name).trim() : 'Vanto Zazi',
          brand: body.brand ? String(body.brand) : 'aplgo',
        }
        if (body.preview_text) insert.preview_text = String(body.preview_text).trim()
        if (body.reply_to) insert.reply_to = String(body.reply_to).trim()
        if (body.segment_id) insert.segment_id = String(body.segment_id)

        const { data, error } = await supabase
          .from('broadcasts')
          .insert(insert)
          .select('id, subject, status, brand, from_name, segment_id, created_at')
          .single()
        if (error) throw error
        return json({ ok: true, broadcast: data, note: 'Saved as a draft only. Open it in the app to schedule or send.' })
      }

      case 'list_sequences': {
        const status = body.status ? String(body.status) : null
        const limit = Number.isInteger(Number(body.limit)) && Number(body.limit) > 0
          ? Math.min(Number(body.limit), 100) : 25

        let query = supabase.from('email_sequences')
          .select('id, name, description, status, brand, steps, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(limit)
        if (status) query = query.eq('status', status)

        const { data, error } = await query
        if (error) throw error

        // Summarize steps rather than returning full HTML content.
        const sequences = (data ?? []).map((s: any) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          status: s.status,
          brand: s.brand,
          step_count: Array.isArray(s.steps) ? s.steps.length : 0,
          steps_summary: Array.isArray(s.steps)
            ? s.steps.map((st: any) => st.type === 'send_email'
              ? { type: 'send_email', subject: st.subject || '(untitled)' }
              : { type: 'wait', duration_hours: st.duration_hours })
            : [],
          created_at: s.created_at,
          updated_at: s.updated_at,
        }))

        return json({ ok: true, count: sequences.length, sequences, note: 'Read-only — enrolling contacts into a sequence is not exposed via MCP, since it triggers automated sends.' })
      }

      case 'list_inbox_accounts': {
        // Read-only. Lists the connected Gmail accounts (inbox_accounts
        // rows) for the configured owner — the mailboxes referenced by
        // the user — so Claude/the user can see status, last_sync_at, and
        // pick an account_id to pass to sync_gmail_inbox if needed.
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const includeInactive = body.include_inactive === true
        let query = supabase.from('inbox_accounts')
          .select('id, email_address, label, provider, status, is_active, last_sync_at, sync_error')
          .eq('user_id', ownerId)
          .order('email_address', { ascending: true })
        if (!includeInactive) query = query.eq('is_active', true)

        const { data, error } = await query
        if (error) throw error
        return json({ ok: true, count: data?.length ?? 0, accounts: data ?? [] })
      }

      case 'sync_gmail_inbox': {
        // Triggers a REAL fetch from Gmail (via the same connector gateway
        // gmail-sync uses) and upserts results into inbox_messages. This
        // bridge has no user JWT, so gmail-sync's own HTTP endpoint (which
        // requires one) cannot be proxied to directly — this reimplements
        // its list -> full-fetch -> decode -> upsert logic, scoped by the
        // resolved DEFAULT_OWNER_EMAIL owner instead, matching the pattern
        // already used for reply_to_inbox_message.
        //
        // SAFEGUARD: deliberately does NOT include gmail-sync's "learning"
        // branch (auto-star / auto-move-to-spam based on stored signals) —
        // that mutates the user's real Gmail mailbox, not just this app's
        // database. This tool only fetches and stores; it never writes back
        // to Gmail.
        //
        // Multi-account support: with no account_id, loops over every active
        // inbox_accounts row for the owner (all connected mailboxes) and
        // returns a per-account result. Pass account_id (from
        // list_inbox_accounts) to sync just one.
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const lovableKey = Deno.env.get('LOVABLE_API_KEY')
        if (!lovableKey) return json({ error: 'missing_gateway_key' }, 500)

        const requestedAccountId = body.account_id ? String(body.account_id) : null

        // SAFEGUARD (2026-08-13): a "sync all accounts" call with a high
        // per-account max_results timed out in testing — looping over N
        // accounts x max_results messages each, with 1-2+ Gmail gateway
        // round trips per message (list, full fetch, sometimes an
        // attachment fetch for body decoding), can exceed the Edge
        // Function's execution window before finishing. When that happens
        // the platform kills the function mid-response, which surfaces to
        // the caller as an HTML error page instead of JSON. A single
        // account with max_results up to 50 was verified reliable; the
        // multi-account path (no account_id) caps the per-account batch
        // much lower regardless of what was requested, to keep the total
        // number of round trips bounded across however many accounts are
        // connected.
        const requestedMaxResults = Number.isInteger(Number(body.max_results)) && Number(body.max_results) > 0
          ? Number(body.max_results) : 25
        const maxResults = requestedAccountId
          ? Math.min(requestedMaxResults, 50)
          : Math.min(requestedMaxResults, 8)

        let acctQuery = supabase.from('inbox_accounts')
          .select('id, email_address, user_id, is_active')
          .eq('user_id', ownerId)
          .eq('is_active', true)
        if (requestedAccountId) acctQuery = acctQuery.eq('id', requestedAccountId)
        const { data: accounts, error: acctErr } = await acctQuery
        if (acctErr) throw acctErr
        if (!accounts?.length) {
          return json({ error: requestedAccountId ? 'account_not_found' : 'no_active_accounts' }, 404)
        }

        const results: Record<string, unknown>[] = []
        for (const account of accounts) {
          try {
            const connectionKey = await resolveGmailConnectionKey(account.email_address, lovableKey)
            const list = await gatewayGet(
              `/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent('in:inbox')}`,
              lovableKey,
              connectionKey,
            )
            const messages = list.messages || []
            let stored = 0
            const errors: string[] = []

            for (const m of messages) {
              try {
                const full = await gatewayGet(`/users/me/messages/${m.id}?format=full`, lovableKey, connectionKey)
                const headers = Object.fromEntries(
                  (full.payload?.headers || []).map((h: any) => [h.name.toLowerCase(), h.value]),
                )
                const sender = parseSender(headers.from || 'Unknown')
                const to = (headers.to || '').split(',').map(normalizeEmail).filter(Boolean)
                const cc = (headers.cc || '').split(',').map(normalizeEmail).filter(Boolean)
                const subject = headers.subject || '(no subject)'
                const date = new Date(Number(full.internalDate))
                const { text: textBody, html: htmlBody } = await extractBodies(full.payload, full.id, lovableKey, connectionKey)
                const preview = bodyPreview(textBody, htmlBody) || full.snippet || ''

                const upsert = {
                  user_id: ownerId,
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
                  is_read: !(full.labelIds || []).includes('UNREAD'),
                  is_starred: (full.labelIds || []).includes('STARRED'),
                  is_archived: !(full.labelIds || []).includes('INBOX'),
                  prospect_id: null,
                  category: null,
                  urgency: null,
                  intent: null,
                }

                const { data: upserted, error: upsertErr } = await supabase
                  .from('inbox_messages')
                  .upsert(upsert, { onConflict: 'account_id, message_id' })
                  .select('id')
                  .single()
                if (upsertErr) throw upsertErr
                stored++

                // Fire-and-forget AI classify — same enrichment step the
                // app's own cron uses. Read/DB-only; does not touch Gmail.
                if (upserted?.id) {
                  fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/inbox-classify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', apikey: Deno.env.get('SUPABASE_ANON_KEY')! },
                    body: JSON.stringify({ message_id: upserted.id }),
                  }).catch(() => {})
                }
              } catch (e) {
                errors.push(`${m.id}: ${(e as Error).message}`)
              }
            }

            // On any successful pass through the loop above (even a partial
            // one — errors[] tracks per-message failures separately), the
            // Gmail credential itself resolved correctly, so this account is
            // demonstrably reachable. Reset status to 'connected' here —
            // previously this only updated last_sync_at/sync_error and left
            // a stale 'needs_authorization' status in place even after a
            // fresh, working authorization, which was confusing to read.
            await supabase.from('inbox_accounts')
              .update({
                status: 'connected',
                last_sync_at: new Date().toISOString(),
                sync_error: errors.length ? errors.join('; ') : null,
              })
              .eq('id', account.id)

            results.push({
              account_id: account.id,
              email: account.email_address,
              fetched: messages.length,
              stored,
              errors: errors.length ? errors : undefined,
            })
          } catch (e) {
            const message = (e as Error).message
            await supabase.from('inbox_accounts')
              .update({ status: 'needs_authorization', sync_error: message })
              .eq('id', account.id)
            results.push({ account_id: account.id, email: account.email_address, error: message })
          }
        }

        return json({ ok: true, accounts_synced: results.length, results })
      }

      case 'list_inbox_messages': {
        // Read-only. Does NOT call gmail-sync or touch Gmail in any way —
        // only reads rows already synced into inbox_messages, whether by
        // the app's own per-user cron or by sync_gmail_inbox above. Scoped
        // to the single DEFAULT_OWNER_EMAIL account, same pattern as
        // add_contact_note/create_task/etc.
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const unreadOnly = body.unread_only === true
        const includeArchived = body.include_archived === true
        const search = body.search ? String(body.search) : null
        const limit = Number.isInteger(Number(body.limit)) && Number(body.limit) > 0
          ? Math.min(Number(body.limit), 100) : 25

        let query = supabase.from('inbox_messages')
          .select('id, account_id, sender, sender_name, subject, snippet, body_preview, date, is_read, is_starred, is_archived, prospect_id, category, urgency, intent')
          .eq('user_id', ownerId)
          .order('date', { ascending: false })
          .limit(limit)
        if (unreadOnly) query = query.eq('is_read', false)
        if (!includeArchived) query = query.eq('is_archived', false)
        if (search) query = query.or(`subject.ilike.%${search}%,sender.ilike.%${search}%,sender_name.ilike.%${search}%`)

        const { data, error } = await query
        if (error) throw error
        return json({ ok: true, count: data?.length ?? 0, messages: data ?? [] })
      }

      case 'reply_to_inbox_message': {
        // Deliberately narrow: single existing inbox_messages row only (no
        // bulk, no cold-send); recipient is always the original sender — no
        // address override; subject is always forced to "Re: <original
        // subject>"; ownership is enforced by comparing the message's owner
        // to the resolved DEFAULT_OWNER_EMAIL user (this bridge has no user
        // JWT to reuse gmail-send's own ownership check directly).
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const messageId = String(body.message_id ?? '')
        const bodyText = body.body_text ? String(body.body_text) : ''
        if (!messageId) return json({ error: 'message_id_required' }, 400)
        if (!bodyText) return json({ error: 'body_text_required' }, 400)

        const { data: parent, error: pErr } = await supabase
          .from('inbox_messages')
          .select('id, user_id, account_id, sender, subject, message_id, thread_id')
          .eq('id', messageId)
          .maybeSingle()
        if (pErr) throw pErr
        if (!parent) return json({ error: 'message_not_found' }, 404)

        // Ownership check — replaces gmail-send's JWT-based check, since this
        // bridge has no user JWT to pass through.
        if (parent.user_id !== ownerId) {
          return json({ error: 'forbidden', message: "Message does not belong to the configured owner account." }, 403)
        }

        const { data: account, error: aErr } = await supabase
          .from('inbox_accounts')
          .select('id, email_address, user_id')
          .eq('id', parent.account_id)
          .maybeSingle()
        if (aErr) throw aErr
        if (!account) return json({ error: 'account_not_found' }, 404)
        if (account.user_id !== ownerId) {
          return json({ error: 'forbidden', message: "Mailbox does not belong to the configured owner account." }, 403)
        }

        const lovableKey = Deno.env.get('LOVABLE_API_KEY')
        if (!lovableKey) return json({ error: 'missing_gateway_key' }, 500)

        let connectionKey: string
        try {
          connectionKey = await resolveGmailConnectionKey(account.email_address, lovableKey)
        } catch (e) {
          return json({ error: 'gmail_authorization_required', message: (e as Error).message }, 409)
        }

        // Fetch RFC822 Message-Id / References for proper threading.
        let inReplyTo: string | undefined
        let references: string | undefined
        try {
          const r = await fetch(
            `${GMAIL_GATEWAY_URL}/users/me/messages/${parent.message_id}?format=metadata&metadataHeaders=Message-Id&metadataHeaders=References`,
            { headers: { Authorization: `Bearer ${lovableKey}`, 'X-Connection-Api-Key': connectionKey } },
          )
          if (r.ok) {
            const meta = await r.json()
            const hs = Object.fromEntries((meta.payload?.headers ?? []).map((h: any) => [h.name.toLowerCase(), h.value]))
            if (hs['message-id']) {
              inReplyTo = hs['message-id']
              references = hs['references'] ? `${hs['references']} ${hs['message-id']}` : hs['message-id']
            }
          }
        } catch { /* non-fatal — reply still sends, just without perfect threading headers */ }

        const replySubject = /^re:/i.test(parent.subject ?? '') ? parent.subject : `Re: ${parent.subject ?? ''}`

        const raw = buildReplyMime({
          from: account.email_address,
          to: parent.sender,
          subject: replySubject,
          text: bodyText,
          inReplyTo,
          references,
        })

        const sendBody: Record<string, unknown> = { raw: b64url(raw) }
        if (parent.thread_id) sendBody.threadId = parent.thread_id

        const sendRes = await fetch(`${GMAIL_GATEWAY_URL}/users/me/messages/send`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${lovableKey}`,
            'X-Connection-Api-Key': connectionKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sendBody),
        })
        const sendText = await sendRes.text()
        if (!sendRes.ok) {
          console.error('reply_to_inbox_message gateway error', sendRes.status, sendText)
          return json({ error: 'gateway_failed', status: sendRes.status, detail: sendText }, 502)
        }

        // Log exactly like gmail-send does, so the reply shows up in Get Well
        // Mail's own Reply Inbox UI, not just in the raw Gmail thread.
        await supabase.from('inbox_action_log').insert({
          user_id: ownerId,
          message_id: parent.id,
          action_type: 'reply_sent',
          action_data: { to: parent.sender, subject: replySubject, thread_id: parent.thread_id ?? null, via: 'mcp' },
        })

        return json({ ok: true, to: parent.sender, subject: replySubject })
      }

      case 'send_prospect_email': {
        // Direct, unattended individual send — added 2026-08-11 at explicit
        // user request, deliberately WITHOUT a draft/review step (unlike
        // create_broadcast). To keep this safe to expose as a standing tool
        // rather than a one-off, every one of these guardrails is enforced
        // in code, not just in the tool description:
        //   - exactly ONE recipient per call, resolved by prospect_id/email
        //   - subject and body_html must be passed as literal, final text —
        //     this action does no generation or expansion of its own
        //   - refuses outright if the prospect is unsubscribed, or has
        //     consent_marketing explicitly set to false
        //   - uses the SAME per-brand Resend reply-account resolution as
        //     real broadcast/sequence sends (zazi_reply_accounts, exact
        //     user+brand match, no cross-brand fallback) — so this can't
        //     send "as" an unconfigured or wrong identity
        //   - every send is logged to zazi_outbound_sends (the same audit
        //     table process-scheduled-broadcasts writes to) AND to
        //     contact_activities, so there is always a record of exactly
        //     what was sent, to whom, and when
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const prospectId = body.prospect_id ? String(body.prospect_id) : null
        const email = body.email ? String(body.email).toLowerCase().trim() : null
        if (!prospectId && !email) return json({ error: 'prospect_id_or_email_required' }, 400)

        const subject = body.subject ? String(body.subject).trim() : ''
        const bodyHtml = body.body_html ? String(body.body_html) : ''
        if (!subject) return json({ error: 'subject_required' }, 400)
        if (!bodyHtml) return json({ error: 'body_html_required' }, 400)

        let pQuery = supabase.from('prospects')
          .select('id, email, first_name, unsubscribed, consent_marketing, unsubscribe_token')
          .limit(1)
        pQuery = prospectId ? pQuery.eq('id', prospectId) : pQuery.eq('email', email)
        const { data: prospect, error: pErr } = await pQuery.maybeSingle()
        if (pErr) throw pErr
        if (!prospect) return json({ error: 'prospect_not_found' }, 404)

        if (prospect.unsubscribed) {
          return json({ error: 'prospect_unsubscribed', message: 'This prospect has unsubscribed — cannot send.' }, 409)
        }
        if (prospect.consent_marketing === false) {
          return json({ error: 'no_marketing_consent', message: 'This prospect has not consented to marketing email.' }, 409)
        }

        const brand = body.brand ? String(body.brand) : 'aplgo'
        const replyAccount = await resolveReplyAccount(supabase, ownerId, brand)
        if (!replyAccount) {
          return json({ error: 'missing_brand_reply_account', message: `No active reply account configured for brand '${brand}'.` }, 500)
        }

        const resendKey = Deno.env.get('RESEND_API_KEY')
        if (!resendKey) return json({ error: 'missing_resend_key' }, 500)

        const fromName = body.from_name ? String(body.from_name).trim() : 'Vanto Zazi'
        const unsubscribeUrl = `${APP_URL}/unsubscribe?token=${prospect.unsubscribe_token || ''}`
        const personalizedContent = bodyHtml.replace(/\{\{first_name\}\}/g, prospect.first_name || 'Friend')

        // Signature — added 2026-08-11. Precedence:
        //   1. include_signature === false  -> no signature at all
        //   2. signature_html param passed  -> use that exact override instead of the default
        //   3. otherwise                    -> use the brand's default from zazi_reply_accounts.config_json
        // The unsubscribe footer is unconditional either way — it's a compliance
        // element, not a branding one, and stays outside all three cases above.
        const includeSignature = body.include_signature !== false
        const signatureOverride = typeof body.signature_html === 'string' ? body.signature_html : null
        const signature = includeSignature ? (signatureOverride ?? replyAccount.signatureHtml ?? '') : ''

        const html = `${personalizedContent}${signature}<p style="font-size: 11px; color: #999; margin-top: 16px;">You're receiving this email because you're subscribed.<br/><a href="${unsubscribeUrl}" style="color:#999; text-decoration: underline;">Unsubscribe</a></p>`

        const resend = new Resend(resendKey)
        let sendResult: any
        try {
          sendResult = await resend.emails.send({
            from: `${fromName} <${replyAccount.email}>`,
            reply_to: replyAccount.email,
            to: [prospect.email],
            subject,
            html,
          })
        } catch (e) {
          console.error('send_prospect_email resend error', e)
          return json({ error: 'send_failed', message: (e as Error).message }, 502)
        }

        // Audit trail — mirrors process-scheduled-broadcasts' trackOutboundSend.
        await supabase.from('zazi_outbound_sends').insert({
          user_id: ownerId,
          account_id: replyAccount.id,
          recipient_email: prospect.email,
          subject,
          brand,
          prospect_id: prospect.id,
          provider_message_id: sendResult?.data?.id ?? null,
          sent_at: new Date().toISOString(),
        })
        await supabase.from('contact_activities').insert({
          user_id: ownerId,
          prospect_id: prospect.id,
          activity_type: 'email_sent',
          notes: `Sent via Claude MCP: "${subject}"`,
          outcome: null,
        })

        return json({ ok: true, to: prospect.email, subject, provider_message_id: sendResult?.data?.id ?? null })
      }

      case 'create_task': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }
        const title = body.title ? String(body.title).trim() : ''
        if (!title) return json({ error: 'title_required' }, 400)

        const insert: Record<string, unknown> = { user_id: ownerId, title, status: 'pending' }
        if (body.description) insert.description = String(body.description)
        if (body.priority) insert.priority = String(body.priority)
        if (body.due_date) insert.due_date = String(body.due_date)

        const { data, error } = await supabase
          .from('plan_tasks')
          .insert(insert)
          .select('id, title, status, priority, due_date, created_at')
          .single()
        if (error) throw error
        return json({ ok: true, task: data })
      }

      // NEW: list_tasks — read-only. Filter by status and/or a single
      // calendar day (matches due_date). Scoped to the resolved owner.
      case 'list_tasks': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const status = body.status ? String(body.status) : null
        const dateStr = body.date ? String(body.date) : null
        const limit = Number.isInteger(Number(body.limit)) && Number(body.limit) > 0
          ? Math.min(Number(body.limit), 100) : 50

        let query = supabase.from('plan_tasks')
          .select('id, title, description, status, priority, due_date, completed_at, created_at')
          .eq('user_id', ownerId)
          .order('due_date', { ascending: true, nullsFirst: false })
          .limit(limit)

        if (status) query = query.eq('status', status)
        if (dateStr) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return json({ error: 'invalid_date_expected_yyyy_mm_dd' }, 400)
          }
          query = query.gte('due_date', `${dateStr}T00:00:00.000Z`).lte('due_date', `${dateStr}T23:59:59.999Z`)
        }

        const { data, error } = await query
        if (error) throw error
        return json({ ok: true, tasks: data ?? [], count: data?.length ?? 0 })
      }

      // NEW: complete_task — sets status = 'done' and stamps completed_at,
      // mirroring the app's own useTasks().update() behavior.
      case 'complete_task': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const id = body.id ? String(body.id) : ''
        if (!id) return json({ error: 'id_required' }, 400)

        const { data: existing, error: fetchErr } = await supabase
          .from('plan_tasks').select('id').eq('id', id).eq('user_id', ownerId).maybeSingle()
        if (fetchErr) throw fetchErr
        if (!existing) return json({ error: 'task_not_found' }, 404)

        const { data, error } = await supabase
          .from('plan_tasks')
          .update({ status: 'done', completed_at: new Date().toISOString() })
          .eq('id', id)
          .select('id, title, status, completed_at')
          .single()
        if (error) throw error
        return json({ ok: true, task: data })
      }

      // NEW: delete_task — HARD delete. plan_tasks has no deleted_at column
      // in this app, so there is no soft-delete convention to follow here;
      // matches the app's own useTasks().remove().
      case 'delete_task': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const id = body.id ? String(body.id) : ''
        if (!id) return json({ error: 'id_required' }, 400)

        const { data: existing, error: fetchErr } = await supabase
          .from('plan_tasks').select('id').eq('id', id).eq('user_id', ownerId).maybeSingle()
        if (fetchErr) throw fetchErr
        if (!existing) return json({ error: 'task_not_found' }, 404)

        const { error } = await supabase.from('plan_tasks').delete().eq('id', id)
        if (error) throw error
        return json({ ok: true, deleted_id: id })
      }

      case 'create_reminder': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }
        const title = body.title ? String(body.title).trim() : ''
        const reminderTime = body.reminder_time ? String(body.reminder_time) : ''
        if (!title) return json({ error: 'title_required' }, 400)
        if (!reminderTime) return json({ error: 'reminder_time_required' }, 400)

        const insert: Record<string, unknown> = {
          user_id: ownerId,
          title,
          reminder_time: reminderTime,
          is_done: false,
        }
        if (body.description) insert.description = String(body.description)

        const { data, error } = await supabase
          .from('plan_reminders')
          .insert(insert)
          .select('id, title, reminder_time, is_done, created_at')
          .single()
        if (error) throw error
        return json({ ok: true, reminder: data })
      }

      // NEW: list_reminders — read-only. Filter by is_done and/or a single
      // calendar day (matches reminder_time). Scoped to the resolved owner.
      case 'list_reminders': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const isDone = typeof body.is_done === 'boolean' ? body.is_done : null
        const dateStr = body.date ? String(body.date) : null
        const limit = Number.isInteger(Number(body.limit)) && Number(body.limit) > 0
          ? Math.min(Number(body.limit), 100) : 50

        let query = supabase.from('plan_reminders')
          .select('id, title, description, reminder_time, is_done, created_at')
          .eq('user_id', ownerId)
          .order('reminder_time', { ascending: true })
          .limit(limit)

        if (isDone !== null) query = query.eq('is_done', isDone)
        if (dateStr) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return json({ error: 'invalid_date_expected_yyyy_mm_dd' }, 400)
          }
          query = query.gte('reminder_time', `${dateStr}T00:00:00.000Z`).lte('reminder_time', `${dateStr}T23:59:59.999Z`)
        }

        const { data, error } = await query
        if (error) throw error
        return json({ ok: true, reminders: data ?? [], count: data?.length ?? 0 })
      }

      // NEW: complete_reminder — sets is_done = true.
      case 'complete_reminder': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const id = body.id ? String(body.id) : ''
        if (!id) return json({ error: 'id_required' }, 400)

        const { data: existing, error: fetchErr } = await supabase
          .from('plan_reminders').select('id').eq('id', id).eq('user_id', ownerId).maybeSingle()
        if (fetchErr) throw fetchErr
        if (!existing) return json({ error: 'reminder_not_found' }, 404)

        const { data, error } = await supabase
          .from('plan_reminders')
          .update({ is_done: true })
          .eq('id', id)
          .select('id, title, is_done')
          .single()
        if (error) throw error
        return json({ ok: true, reminder: data })
      }

      // NEW: delete_reminder — HARD delete. plan_reminders has no
      // deleted_at column.
      case 'delete_reminder': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const id = body.id ? String(body.id) : ''
        if (!id) return json({ error: 'id_required' }, 400)

        const { data: existing, error: fetchErr } = await supabase
          .from('plan_reminders').select('id').eq('id', id).eq('user_id', ownerId).maybeSingle()
        if (fetchErr) throw fetchErr
        if (!existing) return json({ error: 'reminder_not_found' }, 404)

        const { error } = await supabase.from('plan_reminders').delete().eq('id', id)
        if (error) throw error
        return json({ ok: true, deleted_id: id })
      }

      case 'create_meeting': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }
        const title = body.title ? String(body.title).trim() : ''
        const startTime = body.start_time ? String(body.start_time) : ''
        if (!title) return json({ error: 'title_required' }, 400)
        if (!startTime) return json({ error: 'start_time_required' }, 400)

        const insert: Record<string, unknown> = { user_id: ownerId, title, start_time: startTime }
        if (body.description) insert.description = String(body.description)
        if (body.end_time) insert.end_time = String(body.end_time)
        if (body.location) insert.location = String(body.location)
        if (body.attendees) insert.attendees = body.attendees

        const { data, error } = await supabase
          .from('plan_meetings')
          .insert(insert)
          .select('id, title, start_time, end_time, location, created_at')
          .single()
        if (error) throw error
        return json({ ok: true, meeting: data })
      }

      // NEW: list_meetings — read-only. Filter by a single calendar day
      // (matches start_time). Scoped to the resolved owner. Note: no
      // is_done filter is exposed — plan_meetings has no confirmed
      // completion field in this app (same as Get Well Hub).
      case 'list_meetings': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const dateStr = body.date ? String(body.date) : null
        const limit = Number.isInteger(Number(body.limit)) && Number(body.limit) > 0
          ? Math.min(Number(body.limit), 100) : 50

        let query = supabase.from('plan_meetings')
          .select('id, title, description, start_time, end_time, location, notes, attendees, created_at')
          .eq('user_id', ownerId)
          .order('start_time', { ascending: true })
          .limit(limit)

        if (dateStr) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            return json({ error: 'invalid_date_expected_yyyy_mm_dd' }, 400)
          }
          query = query.gte('start_time', `${dateStr}T00:00:00.000Z`).lte('start_time', `${dateStr}T23:59:59.999Z`)
        }

        const { data, error } = await query
        if (error) throw error
        return json({ ok: true, meetings: data ?? [], count: data?.length ?? 0 })
      }

      // NEW: delete_meeting — HARD delete. plan_meetings has no deleted_at
      // column either.
      case 'delete_meeting': {
        const ownerId = await resolveOwnerUserId()
        if (!ownerId) {
          return json({ error: 'owner_not_configured', message: 'Set DEFAULT_OWNER_EMAIL secret on this function.' }, 500)
        }

        const id = body.id ? String(body.id) : ''
        if (!id) return json({ error: 'id_required' }, 400)

        const { data: existing, error: fetchErr } = await supabase
          .from('plan_meetings').select('id').eq('id', id).eq('user_id', ownerId).maybeSingle()
        if (fetchErr) throw fetchErr
        if (!existing) return json({ error: 'meeting_not_found' }, 404)

        const { error } = await supabase.from('plan_meetings').delete().eq('id', id)
        if (error) throw error
        return json({ ok: true, deleted_id: id })
      }

      case 'get_analytics_summary': {
        // Read-only aggregate — mirrors the /dashboard/analytics page's queries.
        const { count: totalProspects } = await supabase
          .from('prospects').select('*', { count: 'exact', head: true })
        const { count: unsubscribedCount } = await supabase
          .from('prospects').select('*', { count: 'exact', head: true }).eq('unsubscribed', true)

        // resend-webhook stores event_type prefixed, e.g. "email.sent",
        // "email.opened" — confirmed against its own insert call.
        const eventTypes = ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained']
        const counts: Record<string, number> = {}
        for (const t of eventTypes) {
          const { count } = await supabase
            .from('email_events').select('*', { count: 'exact', head: true }).eq('event_type', `email.${t}`)
          counts[t] = count ?? 0
        }

        const openRate = counts.sent ? Number(((counts.opened / counts.sent) * 100).toFixed(2)) : 0
        const clickRate = counts.sent ? Number(((counts.clicked / counts.sent) * 100).toFixed(2)) : 0
        const bounceRate = counts.sent ? Number(((counts.bounced / counts.sent) * 100).toFixed(2)) : 0

        return json({
          ok: true,
          total_prospects: totalProspects ?? 0,
          unsubscribed: unsubscribedCount ?? 0,
          email_event_counts: counts,
          open_rate_pct: openRate,
          click_rate_pct: clickRate,
          bounce_rate_pct: bounceRate,
        })
      }

      default:
        return json({ error: 'unknown_action', action }, 400)
    }
  } catch (e) {
    console.error('mcp-bridge error', action, e)
    return json({ error: 'internal_error', message: (e as Error).message }, 500)
  }
})
