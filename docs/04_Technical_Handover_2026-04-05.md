# Vanto Zazi Mail — Technical Handover

**Version:** 1.0  
**Date:** 5 April 2026

---

## 1. Project Structure

```
├── src/
│   ├── App.tsx                         # Router definitions
│   ├── main.tsx                        # Entry point
│   ├── index.css                       # Global styles + design tokens
│   ├── app/dashboard/                  # Dashboard pages (14 routes)
│   ├── pages/                          # Public pages (Auth, Forms, Unsubscribe)
│   ├── components/
│   │   ├── dashboard/                  # Shared dashboard components
│   │   ├── email/                      # Command Centre
│   │   ├── plan/                       # Plan Hub tab components
│   │   ├── replies/                    # Reply Inbox components
│   │   ├── segments/                   # Smart Audience Builder
│   │   └── ui/                         # shadcn/ui primitives
│   ├── hooks/                          # Custom hooks (auth, data, replies)
│   ├── integrations/supabase/          # Auto-generated client + types
│   └── lib/                            # Utilities, AI context, CSV parser, sequences
├── supabase/
│   ├── config.toml                     # Supabase project config
│   ├── functions/                      # 17 edge functions
│   └── migrations/                     # Database migrations (read-only)
├── public/imports/                     # Sample CSV files
└── docs/                              # Documentation (this folder)
```

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | React | 18.3.x |
| Language | TypeScript | 5.8.x |
| Build | Vite | 7.3.x |
| Styling | Tailwind CSS | 3.4.x |
| UI Components | shadcn/ui (Radix) | Latest |
| Icons | Lucide React | 0.475.x |
| Charts | Recharts | 3.7.x |
| Routing | React Router DOM | 7.13.x |
| Backend | Supabase (Lovable Cloud) | 2.95.x |
| Spreadsheets | xlsx | 0.18.x |
| Sanitization | DOMPurify | 3.3.x |

---

## 3. Database Architecture

### 3.1 Table Count: 26 tables

**Core Marketing:**
- `prospects` — Subscriber records (email, name, APLGO fields, engagement score)
- `prospect_tags` — Many-to-many prospect ↔ tag join
- `tags` — User-defined tags with colours
- `broadcasts` — Email campaigns
- `email_events` — Delivery/engagement webhook events
- `email_sequences` — Multi-step drip sequence definitions
- `automations` — Event-driven workflow definitions
- `automation_queue` — Scheduled per-subscriber deliveries
- `email_templates` — Reusable email templates
- `segments` — Dynamic audience filter rules
- `ab_tests` — A/B test configuration and results

**Reply System:**
- `zazi_reply_accounts` — Connected reply monitoring accounts
- `zazi_outbound_sends` — Outbound email tracking for reply matching
- `zazi_inbound_replies` — Matched inbound replies (realtime enabled)
- `zazi_reply_actions` — Reply triage audit log

**Knowledge Base:**
- `kb_sources` — Uploaded files with processing status
- `kb_chunks` — Full-text indexed content chunks
- `kb_ingestion_jobs` — Processing pipeline jobs
- `kb_query_log` — Copilot Q&A audit log

**Plan Hub:**
- `plan_tasks` — Tasks with priority, status, due date
- `plan_reminders` — Time-based reminders
- `plan_meetings` — Calendar meetings
- `plan_notes` — Daily journal entries

**System:**
- `profiles` — User profile data
- `user_roles` — Role-based access (admin/user enum)
- `activity_goals` — Daily activity targets
- `contact_activities` — Logged prospect activities

### 3.2 Database Functions

| Function | Purpose |
|----------|---------|
| `has_role(_user_id, _role)` | Security definer — checks user role without recursive RLS |
| `get_segment_prospects(segment_filters)` | Returns prospects matching segment filter JSON |
| `recalculate_engagement_scores()` | Batch recalculation of engagement scores |
| `search_kb_chunks(search_query, collection_filter, max_results)` | Full-text search on KB chunks |

### 3.3 RLS Policies

All tables have Row-Level Security enabled. Admin tables use `has_role(auth.uid(), 'admin')`. The `user_roles` table is separate from `profiles` to prevent privilege escalation.

### 3.4 Realtime

`zazi_inbound_replies` is added to `supabase_realtime` publication for live reply updates.

---

## 4. Edge Functions (17)

| Function | JWT | Trigger | Purpose |
|----------|-----|---------|---------|
| `send-broadcast` | Yes | Manual/API | Send broadcast emails via Resend |
| `process-scheduled-broadcasts` | No | Cron | Process scheduled broadcasts |
| `execute-sequence` | No | Cron/API | Process sequence automation queue |
| `batch-enroll-sequence` | Yes | Manual | Bulk enrol subscribers into sequences |
| `execute-automation` | No | Cron/API | Process automation queue items |
| `run-ab-test` | Yes | Manual | Execute A/B test delivery |
| `resend-webhook` | No | Webhook | Ingest Resend email events |
| `save-prospect` | No | Public form | Create subscriber from form submission |
| `unsubscribe` | No | Public link | One-click unsubscribe |
| `smart-import` | Yes | Manual | AI-assisted CSV import |
| `kb-ingest` | Yes | Manual | Process KB file into searchable chunks |
| `copilot-answer` | Yes | Manual | RAG Q&A against Knowledge Base |
| `ai-assistant` | Yes | Manual | General AI workflow assistant |
| `plan-intake` | Yes | Manual | Voice/text intake for Plan Hub |
| `plan-ai-extract-actions` | Yes | Manual | AI extraction of tasks/reminders/meetings |
| `ingest-reply` | No | Webhook | Inbound reply ingestion with 4-tier matching |
| `integration-webhook` | No | Webhook | Third-party integration webhooks |

---

## 5. Environment Variables / Secrets

### Client-side (in .env, auto-managed)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Edge Function Secrets (server-side)
| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Database access |
| `SUPABASE_SERVICE_ROLE_KEY` | Bypass RLS |
| `RESEND_API_KEY` | Email delivery via Resend |
| `RESEND_WEBHOOK_SECRET` | Svix signing for Resend webhooks |
| `WEBHOOK_REPLY_SECRET` | Shared secret for reply webhook verification |

---

## 6. Email Infrastructure

### Delivery Provider: Resend

- Broadcasts and sequences send via Resend API
- Webhook events (sent, delivered, opened, clicked, bounced, complained) ingested via `resend-webhook`
- Reply domain: `reply.onlinecourseformlm.com` (MX → Resend inbound)

### Outbound Tracking

Every email creates a `zazi_outbound_sends` record with `provider_message_id` for reply matching.

### Brand Resolution

Before any send, the system verifies an active `zazi_reply_accounts` entry exists for the selected brand. Missing account = send aborted.

---

## 7. Reply Matching (4-tier)

1. `In-Reply-To` header → `provider_message_id` on outbound sends
2. `References` header → any `provider_message_id`
3. `thread_id` → `provider_thread_id`
4. Subject + sender fallback (60-day window, account-scoped only)

Unmatched emails are silently discarded.

---

## 8. Authentication Flow

1. Supabase Auth (email/password)
2. Email verification required before login
3. `ProtectedRoute` component wraps all `/dashboard/*` routes
4. `useAuth` hook provides session state
5. Roles stored in `user_roles` table (not on profiles)

---

## 9. Key Libraries & Utilities

| File | Purpose |
|------|---------|
| `src/lib/utils.ts` | Tailwind class merge utility |
| `src/lib/csv-parser.ts` | CSV parsing for subscriber import |
| `src/lib/email-signature.ts` | Email signature HTML generation |
| `src/lib/smart-tagging.ts` | Auto-tagging rules for imports |
| `src/lib/ai-context.ts` | AI system prompts and context |
| `src/lib/ai-guidance.ts` | AI guidance configuration |
| `src/lib/sequences/expired-member-winback.ts` | Expired member sequence template |

---

## 10. Deployment

- **Frontend:** Lovable hosting with SPA fallback (no `_redirects` needed)
- **Backend:** Edge functions deploy automatically on code push
- **Database:** Migrations managed via Lovable Cloud
- **Published URL:** https://kit-clone-dashboard.lovable.app

---

© 2026 Vanto. All rights reserved.
