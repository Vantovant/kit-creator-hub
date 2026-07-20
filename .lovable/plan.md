Context loaded. Here's the plan.

# Zazi Mail — Superhuman + Nimble CRM Upgrade

Bring your VantoOS Email Module (Superhuman-style triage) and Nimble-style contact intelligence into Zazi Mail, so your personal Gmail becomes a live source that feeds prospects, sequences, tags, and Plan Hub tasks.

## Goals

1. **Superhuman layer** — a `/dashboard/inbox` workspace with keyboard-driven triage, AI smart extract, snooze/waiting/handled states — mirroring your VantoOS EmailPage.
2. **Nimble CRM layer** — every Gmail sender/reply is auto-matched to a `prospect`. If none exists, one is created. Contact card shows full history (emails, sequences, tags, activities).
3. **Registration harvester** — Gmail messages that look like "new registration" notifications are parsed → prospect created/updated → auto-enrolled into the correct email sequence.
4. **Reply harvester** — replies to any of your Gmail conversations (not just Zazi outbound) → tag prospect (`Replied_YYYY_MM`), create a Plan Hub task, surface in Reply Inbox.

## Categories & Scope

| Layer | Category | Change type |
|-------|----------|-------------|
| Gmail OAuth + sync | Backend / infra | New |
| Inbox UI (Superhuman) | UI | New page |
| Contact 360 panel (Nimble) | UI | New component |
| Registration → sequence rules | Backend + Email delivery | New engine |
| Reply → tag + task | Backend + Permissions/RLS | New engine |
| Existing Reply Inbox (`/dashboard/replies`) | UI | Kept — becomes "Campaign replies" tab of new Inbox |

Nothing in the Zazi Mail broadcast / sequence sending path changes. Existing `zazi_inbound_replies` (campaign replies) is preserved.

## Architecture

```text
   ┌────────────────┐    OAuth      ┌──────────────────────┐
   │  Your Gmail    │──────────────▶│ gmail-auth-start /   │
   │  (any account) │               │ gmail-auth-callback  │
   └────────┬───────┘               └──────────┬───────────┘
            │ Gmail API                        │ store tokens
            ▼                                  ▼
   ┌────────────────┐  every 2 min   ┌──────────────────────┐
   │ gmail-sync     │◀───pg_cron─────│ inbox_accounts       │
   │ (edge fn)      │                │ inbox_oauth_tokens   │
   └────────┬───────┘                └──────────────────────┘
            │ upsert
            ▼
   ┌────────────────────────────────────────────────────────┐
   │ inbox_messages (metadata, snippet, is_read, category)  │
   └────────┬───────────────────────────────────────────────┘
            │ classify (AI)
            ▼
   ┌────────────────────────┐   registration?     ┌───────────────────────┐
   │ inbox-classify         │────────────────────▶│ save-prospect +       │
   │  detects:              │                     │ auto-enroll sequence  │
   │  - registration        │                     └───────────────────────┘
   │  - reply               │   reply?            ┌───────────────────────┐
   │  - general             │────────────────────▶│ tag prospect +        │
   │  → inbox_extracts      │                     │ create plan_task      │
   └────────────────────────┘                     └───────────────────────┘
            │
            ▼
   ┌────────────────────────────────────────────────────────┐
   │ /dashboard/inbox   (Superhuman-style UI)               │
   │  ├─ EmailList  ├─ EmailDetail  ├─ SmartExtractPanel    │
   │  ├─ Contact360 (Nimble side-panel)                     │
   │  └─ CommandBar (⌘K), keyboard shortcuts                │
   └────────────────────────────────────────────────────────┘
```

## Database (new tables — all admin-only RLS + GRANTs)

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `inbox_accounts` | Connected Gmail accounts | `email_address`, `status`, `history_id`, `last_sync_at`, `label` |
| `inbox_oauth_tokens` | Token vault | `access_token_encrypted`, `refresh_token_encrypted`, `expires_at`, `scopes` |
| `inbox_messages` | Synced Gmail metadata | `message_id`, `thread_id`, `sender`, `subject`, `snippet`, `is_read`, `is_starred`, `snoozed_until`, `waiting_on`, `category`, `urgency`, `intent`, `handled_at`, `prospect_id` |
| `inbox_extracts` | AI classification cache | `detected_type` (registration/reply/general), `confidence`, `entities_json`, `suggested_actions_json`, `prompt_version` |
| `inbox_action_log` | Audit trail | `message_id`, `action_type` (enrolled/tagged/task_created/handled/snoozed), `related_id` |
| `inbox_registration_rules` | Detection rules | `source_pattern` (from address / subject regex), `sequence_id`, `default_tag`, `is_active` |

## Edge Functions (new)

| Function | Job |
|----------|-----|
| `gmail-auth-start` | Build Google OAuth URL, return to UI |
| `gmail-auth-callback` | Exchange code → store tokens, create `inbox_accounts` row |
| `gmail-sync` | Incremental history sync (idempotent upsert). Runs via pg_cron every 2 min per active account |
| `gmail-get` | On-demand full body fetch |
| `gmail-disconnect` | Revoke tokens, soft-delete account |
| `inbox-classify` | AI smart-extract: registration / reply / general. Writes `inbox_extracts`. Applies auto-actions per `inbox_registration_rules` |
| `inbox-auto-enroll` | Called by `inbox-classify` when a registration is detected: idempotent `save-prospect` + sequence enrollment via existing `execute-sequence` path |
| `inbox-reply-router` | Called by `inbox-classify` for replies: matches prospect by sender email, applies `Replied_YYYY_MM` tag, inserts a `plan_task` row referencing the message |

Existing `ingest-reply` (Zazi Mail campaign replies) stays untouched — it still owns the `zazi_inbound_replies` table.

## Registration Detection

Rules table `inbox_registration_rules` seeded with your APLGO/VantoOS patterns, e.g.:
- `from ILIKE '%registration@aplgo%'` → sequence `Registered_not_activated`
- `subject ILIKE '%new registration%'` → sequence `Welcome_APLGO`
- Free-text catch-all handled by AI classifier with confidence ≥ 0.8, else surfaces as "Suggested actions" in SmartExtractPanel for one-click confirm.

Parser extracts email, first_name, phone (E.164), level/rank from the Gmail body → sends to existing `save-prospect` edge function → sequence auto-enroll happens through the current pipeline. No duplicate prospects (phone_normalized dedupe key already in place).

## Reply Handling (Nimble-style)

For any inbound Gmail message where sender email matches an existing prospect OR replies to a thread we sent from Gmail:
1. Upsert prospect (create if new).
2. Tag: `Replied_YYYY_MM` + optional `intent_tag` (interested / objection / question) from AI.
3. Create `plan_task` — title: "Reply from {name}: {subject}" — linked to `inbox_messages.id`.
4. Log `inbox_action_log` → visible as HandledStamp in EmailDetail.
5. Reply surfaces both in `/dashboard/inbox` (all replies) and `/dashboard/replies` (campaign-only, existing behavior).

## Frontend

New pages/components:

```text
src/app/dashboard/inbox/page.tsx           # Superhuman-style orchestrator
src/components/inbox/
  ├─ AccountSwitcher.tsx                   # Multi-Gmail dropdown, unified view
  ├─ EmailList.tsx                         # Rows w/ star, badges, handled stamp
  ├─ EmailDetail.tsx                       # Body + toolbar + SmartExtractPanel
  ├─ SmartExtractPanel.tsx                 # AI actions: enroll, tag, create task
  ├─ Contact360.tsx                        # NIMBLE side panel: prospect card,
  │                                        #   tags, sequences, past emails,
  │                                        #   activities, engagement score
  ├─ CommandBar.tsx                        # ⌘K palette (archive/snooze/task/…)
  ├─ CheatSheet.tsx                        # Keyboard shortcuts modal
  ├─ HandledStamp.tsx                      # Audit chip (reads inbox_action_log)
  └─ KeyCoach.tsx                          # Context hint strip
src/hooks/useInbox.ts                      # fetch/filter/realtime/mutations
src/hooks/useInboxAccounts.ts              # OAuth account CRUD
src/services/inboxService.ts               # DB layer (mirrors emailService.ts)
```

Sidebar gets one new entry: **Inbox** (with unread badge). `/dashboard/replies` renamed to "Campaign Replies" — kept as-is for reply-only surface.

Keyboard shortcuts (single-key, from your VantoOS spec): `J/K` navigate, `Enter` open, `E` archive, `S` snooze, `T` task, `M` meeting, `R` reminder, `H` handled, `?` cheat sheet, `⌘K` command bar.

## Secrets Needed

- `GOOGLE_OAUTH_CLIENT_ID`
- `GOOGLE_OAUTH_CLIENT_SECRET`
- `GOOGLE_OAUTH_REDIRECT_URI` = `https://dashboard.onlinecourseformlm.com/inbox/callback`
- `INBOX_TOKEN_ENCRYPTION_KEY` (AES-GCM for token vault)

I'll request them via `add_secret` when we start Phase 1.

## Rollout Plan (phased, each independently shippable)

**Phase 0 — Foundations (½ day)**
- Create tables + RLS + GRANTs
- Add Sidebar "Inbox" nav (empty state)
- Register secrets

**Phase 1 — Gmail Connect + Sync (1 day)**
- `gmail-auth-start` / `gmail-auth-callback` / `gmail-sync` / `gmail-disconnect`
- AccountSwitcher UI + connect flow
- pg_cron every 2 min

**Phase 2 — Superhuman UI (1–1.5 days)**
- EmailList + EmailDetail + CommandBar + shortcuts + snooze/waiting/handled
- HandledStamp + inbox_action_log
- CheatSheet + KeyCoach

**Phase 3 — Nimble Contact 360 (½ day)**
- Contact360 side panel: prospect data, tags, active sequences, engagement score, past `zazi_outbound_sends` + `email_events`, activities
- One-click "Enroll in sequence", "Add tag", "Log activity"

**Phase 4 — Registration harvester (½ day)**
- `inbox-classify` + `inbox-auto-enroll`
- Seed `inbox_registration_rules` for APLGO + VantoOS
- SmartExtractPanel confirm UI for low-confidence hits

**Phase 5 — Reply harvester + Plan Hub bridge (½ day)**
- `inbox-reply-router`
- Auto-tag + create `plan_task`
- Show tasks inline in EmailDetail

**Phase 6 — QA + go-live (½ day)**
- Static harness (mirrors your existing save-prospect QA pattern)
- Live gate test with .test leads
- Enable pg_cron sync

**Total: ~5 working days**, shippable end of Phase 2 for immediate Superhuman value.

## Guardrails

- Gmail sync is **read-only** (`gmail.readonly` scope). No send/modify from this module — sending stays with Resend + Zazi Mail.
- Auto-enroll runs only when detection confidence ≥ 0.85 AND source matches a seeded rule; otherwise it's a one-click suggestion.
- All auto-enrollments write to `inbox_action_log` for full audit.
- Bounces/complaints suppression pipeline (already live in Zazi Mail) is honored before any auto-enroll fires.
- No changes to existing `zazi_*` tables or the Reply Inbox routing.

## Approve to proceed

Reply with **APPROVE PHASE 0-1** and I'll start with the DB migration + Gmail OAuth wiring. If you want to trim scope (e.g., skip multi-account for v1, or defer Contact360 to phase 7), tell me and I'll adjust before writing any code.
