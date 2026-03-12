# Reply Inbox (Zazi Mail Email CMS) — Technical Specification

**Version:** 1.0  
**Last Updated:** 12 March 2026  
**Status:** Fully Implemented · Production-Ready

---

## 1. Overview

The Reply Inbox (`/dashboard/replies`) is a **campaign-reply-only workspace** that surfaces inbound emails matched to Zazi Mail outbound sends (sequences or broadcasts). It is **NOT** a general inbox — unmatched mail is silently discarded.

**Purpose:** Enable the user to triage, tag, and act on subscriber responses without leaving the marketing dashboard.

**Design Principle:** Reply-only rule — only emails that can be cryptographically or contextually linked to a tracked outbound send are shown.

---

## 2. Architecture

### 2.1 Database Tables

#### `zazi_reply_accounts`

Tracks connected reply monitoring accounts with brand mapping.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | No | — | Owner (admin) |
| `provider` | TEXT | No | `'resend'` | Email provider |
| `account_email` | TEXT | No | — | Monitored email address (e.g. `vanto@reply.onlinecourseformlm.com`) |
| `brand` | TEXT | No | `'aplgo'` | Brand this account handles (`aplgo` or `vantoos`) |
| `is_active` | BOOLEAN | No | `true` | Whether account is currently monitoring |
| `last_sync_at` | TIMESTAMPTZ | Yes | — | Last successful sync timestamp |
| `sync_status` | TEXT | No | `'idle'` | Current status: `idle`, `active`, `error` |
| `config_json` | JSONB | Yes | `'{}'` | Provider-specific configuration |
| `created_at` | TIMESTAMPTZ | No | `now()` | Record creation |
| `updated_at` | TIMESTAMPTZ | No | `now()` | Last modification |

**RLS:** Admin-only (uses `has_role(auth.uid(), 'admin')`)

**Critical Role:** The `send-broadcast` and `execute-sequence` edge functions enforce that an active reply account must exist for the selected brand before sending. If no matching account is found, the send **fails fast** with `missing_brand_reply_account` error. This prevents untracked outbound communications.

---

#### `zazi_outbound_sends`

Tracks every outbound email with provider message IDs for reply matching.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | No | — | Sender |
| `account_id` | UUID | Yes | — | Reply account used for this send |
| `prospect_id` | UUID | Yes | — | Recipient prospect |
| `sequence_id` | UUID | Yes | — | If sent via sequence |
| `sequence_step_index` | INT | Yes | — | Which step in the sequence |
| `broadcast_id` | UUID | Yes | — | If sent via broadcast |
| `sent_at` | TIMESTAMPTZ | No | `now()` | When the email was sent |
| `brand` | TEXT | No | `'aplgo'` | Brand context |
| `provider_message_id` | TEXT | Yes | — | Resend's message ID (primary matching key) |
| `provider_thread_id` | TEXT | Yes | — | Provider's thread/conversation ID |
| `recipient_email` | TEXT | No | — | Recipient email address |
| `subject` | TEXT | No | — | Email subject line |
| `created_at` | TIMESTAMPTZ | No | `now()` | Record creation |

**RLS:** Admin-only  
**Indexes:** On `provider_message_id`, `provider_thread_id`, `recipient_email`

**Population:** Rows are inserted by `send-broadcast` and `execute-sequence` edge functions immediately after each Resend API call succeeds.

---

#### `zazi_inbound_replies`

Stores matched inbound replies with status, intent, and audit trail.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `user_id` | UUID | No | — | Owner (from matched outbound) |
| `account_id` | UUID | Yes | — | Reply account that received this |
| `prospect_id` | UUID | Yes | — | Matched prospect |
| `matched_outbound_id` | UUID | Yes | — | FK → `zazi_outbound_sends.id` |
| `matched_sequence_id` | UUID | Yes | — | FK → `email_sequences.id` |
| `matched_sequence_step_index` | INT | Yes | — | Sequence step number |
| `matched_broadcast_id` | UUID | Yes | — | FK → `broadcasts.id` |
| `provider_message_id` | TEXT | Yes | — | Inbound message ID (for dedup) |
| `in_reply_to` | TEXT | Yes | — | `In-Reply-To` header value |
| `references_header` | TEXT | Yes | — | `References` header value |
| `thread_id` | TEXT | Yes | — | Provider thread ID |
| `sender_email` | TEXT | No | — | Reply sender's email |
| `sender_name` | TEXT | Yes | — | Reply sender's display name |
| `subject` | TEXT | Yes | — | Reply subject line |
| `snippet` | TEXT | Yes | — | First 200 chars of body text |
| `body_text` | TEXT | Yes | — | Full plain-text body |
| `body_html` | TEXT | Yes | — | Full HTML body |
| `reply_status` | TEXT | No | `'new'` | Status: `new`, `waiting`, `snoozed`, `handled` |
| `intent_tag` | TEXT | Yes | — | AI or manual intent classification |
| `handled_at` | TIMESTAMPTZ | Yes | — | When marked as handled |
| `handled_by` | UUID | Yes | — | Who handled it |
| `waiting_on` | TEXT | Yes | — | What we're waiting for (free text) |
| `snoozed_until` | TIMESTAMPTZ | Yes | — | When to resurface |
| `is_read` | BOOLEAN | No | `false` | Read/unread state |
| `is_starred` | BOOLEAN | No | `false` | Star/flag state |
| `internal_notes` | TEXT | Yes | — | Private admin notes |
| `received_at` | TIMESTAMPTZ | No | `now()` | When reply was received |
| `created_at` | TIMESTAMPTZ | No | `now()` | Record creation |

**RLS:** Admin-only  
**Realtime:** Enabled via `ALTER PUBLICATION supabase_realtime ADD TABLE public.zazi_inbound_replies`

---

#### `zazi_reply_actions`

Audit log for all actions taken on replies.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `gen_random_uuid()` | Primary key |
| `reply_id` | UUID | No | — | FK → `zazi_inbound_replies.id` |
| `user_id` | UUID | No | — | Who performed the action |
| `action_type` | TEXT | No | — | e.g. `marked_handled`, `created_task`, `set_intent`, `snoozed` |
| `action_data` | JSONB | Yes | `'{}'` | Action-specific metadata |
| `created_at` | TIMESTAMPTZ | No | `now()` | When action was performed |

**RLS:** Admin-only

---

### 2.2 Edge Function: `ingest-reply`

**File:** `supabase/functions/ingest-reply/index.ts`  
**JWT:** `verify_jwt = false` (receives external webhooks)  
**Endpoint:** `https://{SUPABASE_URL}/functions/v1/ingest-reply`

#### Webhook Verification (Fail-Closed)

Three verification paths, checked in order:

1. **Svix HMAC** — If `svix-id`, `svix-timestamp`, `svix-signature` headers present:
   - Decode `RESEND_WEBHOOK_SECRET` or `WEBHOOK_REPLY_SECRET` from base64
   - Compute `HMAC-SHA256(svixId.svixTimestamp.body)`
   - Compare against `v1,{signature}` values in header
   - Reject if no match

2. **Shared Secret** — If `x-webhook-secret` header present:
   - Compare against `WEBHOOK_REPLY_SECRET` environment variable
   - Reject if mismatch

3. **No verification** — Reject with `401` unless `ALLOW_INSECURE_WEBHOOKS=true`

#### Inbound Payload Schema

```json
{
  "from_email": "subscriber@example.com",
  "from_name": "John Doe",
  "subject": "Re: Your Weekly Update",
  "text_body": "Thanks for the info...",
  "html_body": "<p>Thanks for the info...</p>",
  "message_id": "<unique-message-id@provider.com>",
  "in_reply_to": "<original-message-id@resend.dev>",
  "references": "<msg1@resend.dev> <msg2@resend.dev>",
  "thread_id": "thread-abc123",
  "to_email": "vanto@reply.onlinecourseformlm.com"
}
```

#### Processing Pipeline

```
1. Verify webhook signature (fail-closed)
      ↓
2. Resolve reply account from to_email
   → SELECT FROM zazi_reply_accounts WHERE account_email = to_email AND is_active = true
   → If no match → skip (200 OK, reason: "unknown_reply_account")
      ↓
3. Match to outbound send (4-tier, scoped by account_id then user_id):
   a. in_reply_to header → provider_message_id (exact match)
   b. references header → extract all message IDs → match any provider_message_id
   c. thread_id → provider_thread_id (exact match)
   d. Subject fallback → normalized subject + sender_email + sent within 60 days
      (account_id-scoped ONLY, no user_id fallback — prevents cross-account leaks)
   → If no match → skip (200 OK, reason: "no_outbound_match")
      ↓
4. Deduplicate by provider_message_id
   → If exists in zazi_inbound_replies → return { status: "duplicate" }
      ↓
5. Look up prospect_id
   → From matched outbound, or fallback to prospects.email match
      ↓
6. Insert into zazi_inbound_replies
   → reply_status = "new", is_read = false
      ↓
7. Return { status: "ingested", id: reply_id }
```

#### Security Properties

- **Brand isolation:** Each reply account is locked to a specific brand. Outbound matching is scoped by `account_id` first.
- **No phantom replies:** Unmatched inbound mail is silently discarded — never stored, never shown.
- **Deduplication:** `provider_message_id` uniqueness check prevents double-ingestion from webhook retries.
- **Message ID normalization:** Angle brackets and whitespace stripped from all message IDs before comparison.

---

## 3. Frontend Architecture

### 3.1 Page Layout (`/dashboard/replies`)

**File:** `src/app/dashboard/replies/page.tsx`

```
┌──────────────────────────────────────────────────────┐
│  DashboardHeader: "Reply Inbox"                      │
├──────────────────────────────────────────────────────┤
│  Toolbar: [reply count] | [Command Centre] [Settings]│
├──────────────────────────────────────────────────────┤
│  ReplyFilters: All | Unread | New | Waiting | Snoozed | Handled │
├─────────────────┬────────────────────────────────────┤
│  ReplyList      │  ReplyDetail                       │
│  (380px fixed)  │  (flexible)                        │
│                 │                                    │
│  ┌────────────┐ │  ┌──────────────────────────────┐  │
│  │ Reply 1    │ │  │ Header: subject, sender      │  │
│  │ Reply 2  ← │ │  │ Source context: seq/broadcast │  │
│  │ Reply 3    │ │  │ Body (HTML or plaintext)      │  │
│  │ ...        │ │  │ Intent tags                   │  │
│  └────────────┘ │  │ Internal notes                │  │
│                 │  ├──────────────────────────────┤  │
│                 │  │ Actions: Task|Reminder|Meeting│  │
│                 │  │ Waiting | Snooze | Handled    │  │
│                 │  └──────────────────────────────┘  │
└─────────────────┴────────────────────────────────────┘
```

**Responsive Behavior:**
- Desktop (≥1024px): Side-by-side list + detail panels
- Mobile (<1024px): List view. Selecting a reply shows detail full-screen with back button.

### 3.2 Component Tree

```
src/app/dashboard/replies/page.tsx          # Page container, keyboard handler, Plan Hub integration
├── src/components/replies/ReplyFilters.tsx  # Filter bar (All/Unread/New/Waiting/Snoozed/Handled)
├── src/components/replies/ReplyList.tsx     # Scrollable reply list with status icons + badges
├── src/components/replies/ReplyDetail.tsx   # Full reply view with actions, intent tags, notes
├── src/components/replies/ReplySettings.tsx # Settings sheet (reply account management)
├── src/components/email/CommandCentre.tsx   # Plan Hub drawer (Tasks/Reminders/Meetings)
└── src/hooks/useReplies.ts                 # Data hook: fetch, filter, CRUD, realtime
    src/hooks/useReplyAccounts.ts            # Reply account CRUD hook
```

### 3.3 Data Hook: `useReplies`

**File:** `src/hooks/useReplies.ts`

**State:**
- `replies: InboundReply[]` — filtered list from database
- `loading: boolean` — fetch in progress
- `selectedId: string | null` — currently selected reply
- `selected: InboundReply | null` — derived from selectedId

**Filters (ReplyFilter type):**
| Filter | Query |
|--------|-------|
| `all` | No filter |
| `unread` | `is_read = false` |
| `new` | `reply_status = 'new'` |
| `waiting` | `reply_status = 'waiting'` |
| `snoozed` | `reply_status = 'snoozed'` |
| `handled` | `reply_status = 'handled'` |

**Mutations:**
| Method | Action | Database Update |
|--------|--------|-----------------|
| `markRead(id)` | Mark as read | `is_read = true` |
| `toggleStar(id)` | Toggle star | `is_starred = !current` |
| `setStatus(id, status, extra?)` | Change triage status | `reply_status`, `handled_at`, `waiting_on`, `snoozed_until` |
| `setIntentTag(id, tag)` | Set intent classification | `intent_tag` |
| `addNote(id, note)` | Update internal notes | `internal_notes` |
| `logAction(replyId, type, data?)` | Audit log entry | INSERT into `zazi_reply_actions` |

**Realtime:**
- Subscribed to `postgres_changes` on `zazi_inbound_replies` table
- Any INSERT/UPDATE/DELETE triggers a full refetch
- Channel name: `zazi-replies-realtime`

**Optimistic Updates:**
- `markRead`, `toggleStar`, `setIntentTag`, `addNote` update local state immediately before DB write
- `setStatus` triggers a full refetch after DB write (status changes may affect filter visibility)

---

### 3.4 ReplyList Component

**File:** `src/components/replies/ReplyList.tsx`

**Per-reply display:**
- Status icon (left): Mail (new), Clock (waiting), AlertCircle (snoozed), CheckCircle2 (handled)
- Sender name or email (bold if unread)
- Subject line (truncated)
- Snippet (first line of body, truncated)
- Time-ago badge (now/5m/2h/3d)
- Star toggle button (right)
- Badges: status (Waiting/Handled/Snoozed), intent_tag, Sequence/Broadcast source

**Visual States:**
- Unread: `bg-primary/5`, bold sender name
- Selected: `bg-accent`
- Default: no background

---

### 3.5 ReplyDetail Component

**File:** `src/components/replies/ReplyDetail.tsx`

**Sections:**

1. **Header** — Subject, sender name + email, star toggle, back button (mobile)

2. **Source Context Bar** — Sequence/Broadcast badge, step number, received date, current status badge

3. **Body** — HTML rendered via `dangerouslySetInnerHTML` or plaintext in `<pre>` fallback

4. **Intent Tags** — 10 selectable tags (toggle buttons):
   - `interested`, `objection`, `support`, `unsubscribe_risk`
   - `onboarding`, `payment_issue`, `meeting_request`, `follow_up`
   - `customer_care`, `general_info`
   - Active tag highlighted with primary color

5. **Internal Notes** — Textarea with save-on-blur (not per-keystroke). Local state tracks edits, only writes to DB when focus leaves the field.

6. **Action Bar** — Bottom toolbar with 6 actions:

| Button | Shortcut | Action | Visual |
|--------|----------|--------|--------|
| Task | `T` | Create `plan_task` with reply context | Default muted |
| Reminder | `R` | Create `plan_reminder` (1hr from now) | Default muted |
| Meeting | `M` | Create `plan_meeting` (24hr from now) | Default muted |
| Waiting | `W` | Set status to `waiting` | Amber |
| Snooze | `S` | Set status to `snoozed` (24hr) | Default muted |
| Handled | `H` | Set status to `handled` | Green |

**Auto-read:** When a reply is selected and rendered in ReplyDetail, it automatically marks as read (single source of truth — `useEffect` on `reply.id`).

---

### 3.6 ReplySettings Component

**File:** `src/components/replies/ReplySettings.tsx`

A right-side `Sheet` panel containing:

1. **Explainer** — How Reply Capture works (info box)

2. **Connected Reply Accounts** — List of configured `zazi_reply_accounts`:
   - Email address
   - Brand badge
   - Sync status badge
   - Last sync timestamp
   - Active/inactive toggle (`Switch`)
   - Delete button

3. **Add Reply Account Form:**
   - Email input
   - Brand selector (`aplgo` / `vantoos`)
   - "Add Account" button

4. **Webhook Endpoint Display:**
   - Auto-generated URL using `VITE_SUPABASE_PROJECT_ID`
   - Format: `https://{project_id}.supabase.co/functions/v1/ingest-reply`
   - Displayed as copyable code block

---

### 3.7 Command Centre (Plan Hub Drawer)

**File:** `src/components/email/CommandCentre.tsx`

A full-width right-side `Sheet` that embeds the Plan Hub directly inside the Reply Inbox:

- **Trigger:** "Command Centre" button in toolbar
- **Auto-open:** Opens automatically when a Plan action (Task/Reminder/Meeting) is created from a reply
- **Tabs:** Today, Tasks, Reminders, Meetings, Calendar, Notes
- **Prefill:** When opened from a reply action, auto-switches to the relevant tab (e.g., Tasks tab after creating a task)

**Keyboard shortcuts hook** (`useEmailPlanShortcuts`): `T`/`M`/`R` keys open Command Centre with prefilled type.

---

## 4. Keyboard Shortcuts

All shortcuts are **single-key** and only active when no input/textarea/select is focused.

| Key | Action | Context |
|-----|--------|---------|
| `J` | Navigate to next reply | Reply list |
| `K` | Navigate to previous reply | Reply list |
| `Enter` | Open selected reply | Reply list |
| `Escape` | Deselect / back to list | Detail view |
| `T` | Create task from reply | Reply selected |
| `R` | Create reminder from reply | Reply selected |
| `M` | Create meeting from reply | Reply selected |
| `W` | Mark as Waiting | Reply selected |
| `S` | Snooze (24hr) | Reply selected |
| `H` | Mark as Handled | Reply selected |
| `X` | Toggle star | Reply selected |
| `U` | Toggle Unread filter | Any |

---

## 5. Reply → Plan Hub Integration

When a Plan action is created from a reply:

1. **Task creation:**
   - Title: `"Follow up: {sender_name} — {subject}"` (max 120 chars)
   - Description: `"Reply from {email}\n{snippet}"` (max 300 chars)
   - Inserted into `plan_tasks` via `useTasks().create()`

2. **Reminder creation:**
   - Same title/description format
   - `reminder_time` set to 1 hour from now
   - Inserted into `plan_reminders` via `useReminders().create()`

3. **Meeting creation:**
   - Same title/description format
   - `start_time` set to 24 hours from now
   - Inserted into `plan_meetings` via `useMeetings().create()`

4. **Audit:** All actions logged to `zazi_reply_actions` with `action_type` and `action_data`

5. **Command Centre auto-opens** to the relevant tab

---

## 6. Email Infrastructure

### 6.1 Reply Domain

- **Domain:** `reply.onlinecourseformlm.com`
- **MX Record:** Points to `inbound-smtp.resend.com` (Resend inbound routing)
- **Purpose:** Dedicated subdomain for marketing replies — isolated from personal inbox

### 6.2 Outbound Send Tracking

Every email sent by `send-broadcast` or `execute-sequence` creates a `zazi_outbound_sends` record with:
- `provider_message_id` — Resend's unique message ID (returned from API)
- `provider_thread_id` — Thread grouping (if available)
- `recipient_email` — Who received it
- `subject` — For subject-based fallback matching
- `account_id` — Which reply account was used
- `brand` — Brand context

### 6.3 Brand Resolution (Fail-Fast)

Before any outbound send:
```
1. Look up active zazi_reply_accounts for user_id + brand
2. If no active account found → ABORT with "missing_brand_reply_account"
3. Use account_id for outbound tracking
4. Set from/reply-to to account's email address
```

This ensures **every** outbound email is trackable for reply matching.

---

## 7. Working Features ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Reply list with filters | ✅ Working | All/Unread/New/Waiting/Snoozed/Handled |
| Reply detail view | ✅ Working | HTML + plaintext rendering |
| Keyboard shortcuts (J/K/T/R/M/W/S/H/X/U/Esc) | ✅ Working | Single-key, input-aware |
| Mark as read (auto on view) | ✅ Working | Single source of truth |
| Star toggle | ✅ Working | Optimistic update |
| Status management (Waiting/Snoozed/Handled) | ✅ Working | With audit logging |
| Intent tag classification | ✅ Working | 10 predefined tags |
| Internal notes (save-on-blur) | ✅ Working | No per-keystroke DB writes |
| Plan Hub integration (Task/Reminder/Meeting) | ✅ Working | Auto-prefill from reply context |
| Command Centre drawer | ✅ Working | Full Plan Hub embedded |
| Reply account management | ✅ Working | Add/remove/toggle accounts |
| Webhook endpoint display | ✅ Working | Auto-generated URL |
| Ingest webhook (ingest-reply) | ✅ Working | Svix HMAC verification |
| 4-tier reply matching | ✅ Working | in_reply_to → references → thread_id → subject |
| Deduplication | ✅ Working | provider_message_id check |
| Realtime updates | ✅ Working | postgres_changes subscription |
| Responsive layout | ✅ Working | List/detail split on desktop, stacked on mobile |
| Audit trail (zazi_reply_actions) | ✅ Working | All actions logged with metadata |

---

## 8. Not Yet Implemented / Known Gaps

| Feature | Status | Priority |
|---------|--------|----------|
| AI intent auto-detection | ❌ Not implemented | HIGH — Use AI to auto-classify reply intent on ingestion |
| Reply composing (send response) | ❌ Not implemented | MEDIUM — Currently read-only, no outbound reply from inbox |
| Snooze resurface logic | ❌ Not implemented | MEDIUM — `snoozed_until` is stored but no cron job to resurface |
| Bulk actions | ❌ Not implemented | LOW — Select multiple → mark handled/archive |
| Reply search | ❌ Not implemented | LOW — Search by sender, subject, body text |
| Filter badge counts | ❌ Not implemented | LOW — `counts` prop exists on ReplyFilters but not populated |
| Reply assignment (multi-user) | ❌ Not implemented | FUTURE — Assign replies to team members |
| Threaded view | ❌ Not implemented | FUTURE — Group replies by thread_id |
| Attachment handling | ❌ Not implemented | FUTURE — Inbound attachments not stored |

---

## 9. Environment Variables Required

| Secret | Purpose | Configured |
|--------|---------|------------|
| `SUPABASE_URL` | Database access from edge function | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS in edge function | ✅ Yes |
| `WEBHOOK_REPLY_SECRET` | Shared secret for webhook verification | ✅ Yes |
| `RESEND_WEBHOOK_SECRET` | Svix signing secret from Resend | ✅ Yes |

---

## 10. File Reference

| File | Purpose |
|------|---------|
| `src/app/dashboard/replies/page.tsx` | Page container with keyboard shortcuts and Plan integration |
| `src/components/replies/ReplyList.tsx` | Reply list with status icons, badges, star toggle |
| `src/components/replies/ReplyDetail.tsx` | Full reply view with body, intent tags, notes, action bar |
| `src/components/replies/ReplyFilters.tsx` | Filter bar component (6 filters) |
| `src/components/replies/ReplySettings.tsx` | Settings sheet for reply account management |
| `src/components/email/CommandCentre.tsx` | Plan Hub drawer with all 6 tabs |
| `src/hooks/useReplies.ts` | Data hook: fetch, filter, CRUD, realtime subscription |
| `src/hooks/useReplyAccounts.ts` | Reply account CRUD hook |
| `supabase/functions/ingest-reply/index.ts` | Webhook endpoint: verify, match, dedup, insert |

---

© 2026 Vanto. All rights reserved.
