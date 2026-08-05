import { createClient } from 'npm:@supabase/supabase-js@2'

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

        const { data: recentEvents } = await supabase
          .from('email_events')
          .select('event_type, created_at')
          .eq('prospect_id', prospect.id)
          .order('created_at', { ascending: false })
          .limit(10)

        return json({ ok: true, prospect, recent_activity: recentActivity ?? [], recent_email_events: recentEvents ?? [] })
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
          .select('id, full_name, email, contact_type, lead_type, lead_temperature, unsubscribed, updated_at')
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

      case 'list_broadcasts': {
        const status = body.status ? String(body.status) : null
        const brand = body.brand ? String(body.brand) : null
        const limit = Number.isInteger(Number(body.limit)) && Number(body.limit) > 0
          ? Math.min(Number(body.limit), 100) : 25

        // Read-only — creating or sending broadcasts is not exposed via MCP.
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

      case 'get_analytics_summary': {
        // Read-only aggregate — mirrors the /dashboard/analytics page's queries.
        const { count: totalProspects } = await supabase
          .from('prospects').select('*', { count: 'exact', head: true })
        const { count: unsubscribedCount } = await supabase
          .from('prospects').select('*', { count: 'exact', head: true }).eq('unsubscribed', true)

        const eventTypes = ['sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained']
        const counts: Record<string, number> = {}
        for (const t of eventTypes) {
          const { count } = await supabase
            .from('email_events').select('*', { count: 'exact', head: true }).eq('event_type', t)
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
