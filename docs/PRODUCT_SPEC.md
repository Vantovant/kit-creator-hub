# Vanto Zazi Mail — Product Specification

**Version:** 1.0  
**Last Updated:** 8 March 2026  
**Status:** Foundation Stage (Beta)

---

## 1. Product Overview

**Vanto Zazi Mail** is a creator-first email marketing platform built for creators, educators, and entrepreneurs — particularly in the South African context. It enables users to build audiences, send powerful email campaigns, automate communication, and manage their daily workflow from a single dashboard.

The platform is designed as a private, self-hosted marketing operating system with integrated productivity tools (Plan Hub), a Knowledge Base with AI-powered search (Zazi Copilot), and multi-step email automation.

### Vision

> Built in Africa. Designed for creators. Powered by clarity, automation, and ownership.

### Target Users

- Content creators and newsletter operators
- Network marketing (MLM) teams (e.g. APLGO)
- Educators running online courses
- Entrepreneurs managing audience relationships
- Executive beta testers (VantoOS Executive Beta cohort)

---

## 2. Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| UI Components | shadcn/ui (Radix primitives), Lucide icons |
| Charts | Recharts |
| Backend | Lovable Cloud (Supabase) — PostgreSQL, Edge Functions, Storage |
| Email Delivery | Resend (via webhook integration) |
| AI | Lovable AI (Gemini / GPT models via edge functions) |
| Auth | Supabase Auth (email/password) |

### Database Schema (Core Tables)

| Table | Purpose |
|-------|---------|
| `prospects` | Subscriber/contact records with email, name, engagement score, unsubscribe status |
| `prospect_tags` | Many-to-many join between prospects and tags |
| `tags` | User-defined tags with colour codes |
| `broadcasts` | Email campaigns — subject, content, status, schedule, delivery stats |
| `email_events` | Webhook-ingested events: sent, delivered, opened, clicked, bounced, complained |
| `email_sequences` | Multi-step drip sequences with step definitions (JSON) |
| `automations` | Event-driven workflows with trigger configs and step chains |
| `automation_queue` | Scheduled automation deliveries per subscriber |
| `email_templates` | Reusable email templates with categories and premium flag |
| `segments` | Dynamic audience segments with filter rules (JSON) |
| `ab_tests` | A/B test variants, metrics, and results |
| `profiles` | User profile data (display name, company, timezone) |
| `user_roles` | Role-based access (admin / user enum) |
| `kb_sources` | Knowledge Base uploaded files — collection, version, processing status |
| `kb_chunks` | Full-text-search indexed chunks from KB sources |
| `kb_ingestion_jobs` | Processing job tracking for KB ingestion pipeline |
| `kb_query_log` | Copilot query/response audit log with feedback |
| `plan_tasks` | Personal tasks with priority, status, due date, estimated minutes |
| `plan_reminders` | Time-based reminders |
| `plan_meetings` | Calendar meetings with attendees and location |
| `plan_notes` | Daily notes with structured mode and link references |

### Edge Functions

| Function | Purpose |
|----------|---------|
| `send-broadcast` | Sends email broadcast via Resend to segment/all subscribers |
| `process-scheduled-broadcasts` | Cron-triggered processing of scheduled broadcasts |
| `execute-sequence` | Processes sequence step queue |
| `batch-enroll-sequence` | Enrols a batch of subscribers into a sequence |
| `execute-automation` | Processes automation queue items |
| `run-ab-test` | Runs A/B test variant delivery and winner selection |
| `resend-webhook` | Ingests Resend email event webhooks |
| `save-prospect` | Public endpoint for form submissions |
| `unsubscribe` | Handles one-click unsubscribe |
| `kb-ingest` | Processes uploaded KB files into searchable chunks |
| `copilot-answer` | RAG-based Q&A against Knowledge Base |
| `ai-assistant` | General AI workflow assistant |
| `plan-intake` | Voice/text intake for Plan Hub items |
| `plan-ai-extract-actions` | AI extraction of tasks/reminders/meetings from text |

### Storage Buckets

| Bucket | Usage |
|--------|-------|
| `zazi_kb` | Knowledge Base document files (PDF, DOCX, TXT, CSV) |

---

## 3. Feature Specification

### 3.1 Authentication & Access

- Email/password authentication via Supabase Auth
- Protected routes — all `/dashboard/*` pages require login
- Role-based access control via `user_roles` table with `has_role()` security definer function
- RLS policies on all tables

### 3.2 Dashboard (Home)

**Route:** `/dashboard`

- **Stats cards:** Total Subscribers, Emails Sent, Open Rate, Click Rate
- **Recent Broadcasts:** Last 5 broadcasts with status badges
- **New Subscribers:** Last 5 subscriber signups with time-ago display
- **Subscriber Growth Chart:** Cumulative area chart (Recharts)
- All data fetched from live database in parallel

### 3.3 Subscribers

**Route:** `/dashboard/subscribers`

- Paginated table (25 per page) with search by name/email
- Tag management — add/remove tags per subscriber
- Engagement score display with fire icon
- Bulk selection with checkbox column
- Import/Export modal:
  - **Import:** CSV drag-and-drop upload with field mapping
  - **Export:** CSV/JSON download of subscriber data
- Individual subscriber delete
- Unsubscribe toggle

### 3.4 Broadcasts

**Route:** `/dashboard/broadcasts`

- List view of all broadcasts with status badges (draft, scheduled, sending, sent, failed)
- Per-broadcast stats expansion: opens, clicks, bounces
- Delete functionality
- **New Broadcast** (`/dashboard/broadcasts/new`):
  - Visual email editor with rich-text toolbar
  - Subject line, from name, reply-to, preview text
  - Brand selector (Vanto / APLGO)
  - Segment targeting
  - Template selection
  - Schedule or send immediately
  - HTML content with signature injection

### 3.5 A/B Testing

**Route:** `/dashboard/broadcasts/ab-test`

- Create A/B test variants (subject line or content variations)
- Configure test size percentage and duration
- Winning metric selection (open rate / click rate)
- Automatic winner determination and send

### 3.6 Automations

**Route:** `/dashboard/automations`

- List of automations with status (active/paused/draft)
- Trigger types: subscribe, tag added, purchase, link click, date
- **Automation Builder** (`/dashboard/automations/builder`):
  - Visual workflow builder
  - Step configuration: send email, wait, add tag, condition
  - Trigger configuration
  - Activate/pause/delete

### 3.7 Email Sequences

**Route:** `/dashboard/sequences`

- Multi-step drip email sequences
- Create/edit sequence with name, description, brand
- Step editor: subject, content, delay (days), and order
- Batch enrol subscribers into sequences
- Sequence status: draft / active / paused
- Public join forms per sequence (`/forms/sequence/:id`)

### 3.8 Templates

**Route:** `/dashboard/templates`

- Template library with category filtering and search
- Create/edit templates: name, subject, content, category
- Premium template flag
- Gradient preview badges
- Duplicate template functionality

### 3.9 Segments

**Route:** `/dashboard/segments`

- Dynamic audience segments with filter rules
- Filter conditions: tag-based, date-based, engagement-score-based
- Segment subscriber count preview
- Tag management tab within segments page
- Used for broadcast targeting

### 3.10 Forms & Landing Pages

**Route:** `/dashboard/forms`

- Lists all sequences as joinable forms
- Shareable public URLs (`/forms/sequence/:id`)
- Welcome form (`/forms/welcome`) for general signups
- VantoOS Beta form (`/forms/vantoos-beta`) for executive beta cohort
- Copy-to-clipboard link sharing

### 3.11 Analytics

**Route:** `/dashboard/analytics`

- Aggregate email performance metrics:
  - Total subscribers, emails sent
  - Delivered, bounced, opened, clicked, complained counts
  - Open rate, click rate, bounce rate, complaint rate
- Engagement score breakdown chart
- Delivery performance pie chart
- Real event data from `email_events` table

### 3.12 Integrations

**Route:** `/dashboard/integrations`

- Integration marketplace UI with categories
- Pre-configured integration cards (Zapier, Stripe, Calendly, Slack, WordPress, etc.)
- Connect/disconnect toggle per integration
- Search and filter by category

### 3.13 Knowledge Base

**Route:** `/dashboard/knowledge-base`

- **8 Collections:** APLGO Business, Products, Pricing/PV, Scripts/Templates, Compliance, Online Course, MLM Motivation, Personality Code
- File upload (PDF, DOCX, TXT, CSV) to Supabase Storage
- Automatic ingestion pipeline: upload → chunk → full-text index
- File versioning (auto-increment per filename+collection)
- Status tracking: queued → processing → ready / failed
- Re-process capability
- **Ask KB panel:** Test search queries against the Knowledge Base with RAG
- Feedback loop (helpful / not helpful) logged to `kb_query_log`
- Missing knowledge overview per collection

### 3.14 Plan Hub (Command Centre)

**Route:** `/dashboard/plan`

- **6 Tabs:** Today, Tasks, Reminders, Meetings, Calendar, Notes
- **Today Tab:** Unified daily view of tasks, reminders, and meetings
- **Tasks:** Create, edit, complete, delete. Priority levels, due dates, estimated time, project assignment
- **Reminders:** Time-based with done/undone toggle
- **Meetings:** Start time, location, attendees, notes
- **Calendar:** Monthly calendar view with event dots
- **Notes:** Daily journal with structured/freeform modes, link attachment
- **Command Bar (⌘K):** Global keyboard shortcut for quick actions
- **Voice Input:** Mic button for dictation and AI-powered intent extraction (creates tasks/reminders/meetings from speech)
- **Insider Panel:** Desktop side panel with contextual AI tips

### 3.15 Settings

**Route:** `/dashboard/settings`

- **Tabs:** Profile, Email, Notifications, Appearance
- Profile: Display name, company, website, timezone, avatar
- Email: From name, reply-to, brand, email signature (live preview)
- Notifications: Toggle email digest, new subscriber alerts, weekly reports
- Appearance: Dark/light mode toggle (persisted to localStorage)

### 3.16 AI Workflow Assistant

- Floating chat widget on all dashboard pages (except Plan)
- Powered by Lovable AI edge functions
- Context-aware assistance for email writing, automation setup, subscriber management

### 3.17 Unsubscribe

**Route:** `/unsubscribe`

- Token-based one-click unsubscribe
- Confirmation screen
- Updates prospect `unsubscribed` flag

---

## 4. Email Delivery Pipeline

```
User creates broadcast → Save to `broadcasts` table (status: draft/scheduled)
                       ↓
Schedule triggers `process-scheduled-broadcasts` edge function (cron)
                       ↓
`send-broadcast` function:
  1. Resolve segment → get subscriber list
  2. For each subscriber: call Resend API
  3. Update broadcast stats (total_sent, total_failed)
  4. Set status to "sent"
                       ↓
Resend fires webhooks → `resend-webhook` edge function
  → Inserts into `email_events` (sent, delivered, opened, clicked, bounced, complained)
                       ↓
Analytics page reads aggregated `email_events` for reporting
```

---

## 5. Security Model

- **Row-Level Security (RLS)** on all tables
- **`has_role()` security definer function** for role checks without recursive RLS
- **User roles table** (`user_roles`) separate from profiles — prevents privilege escalation
- **Unsubscribe tokens** per prospect for one-click unsubscribe
- **Protected routes** with auth check on every dashboard page
- **Edge function auth** — functions verify JWT where applicable
- **No client-side admin checks** — all role validation is server-side

---

## 6. Public Endpoints

| URL | Purpose |
|-----|---------|
| `/auth` | Login / signup page |
| `/forms/welcome` | General subscriber welcome form |
| `/forms/sequence/:id` | Sequence-specific join form |
| `/forms/vantoos-beta` | VantoOS Executive Beta application form |
| `/unsubscribe?token=xxx` | One-click email unsubscribe |

---

## 7. Brand Configuration

The platform supports multi-brand operation:

| Brand | Use Case |
|-------|----------|
| **Vanto** | Primary brand for newsletters and creator content |
| **APLGO** | Network marketing team communications |

Brand selection is available on broadcasts, sequences, and templates.

---

## 8. Reply Inbox (Zazi Mail Email CMS)

### Overview

The Reply Inbox (`/dashboard/replies`) is a campaign-reply workspace that surfaces **only** inbound emails matched to Zazi Mail outbound sends (sequences or broadcasts). It is NOT a general inbox.

### Database Tables

| Table | Purpose |
|---|---|
| `zazi_reply_accounts` | Connected reply monitoring accounts with brand mapping |
| `zazi_outbound_sends` | Tracks every outbound email with provider message IDs for reply matching |
| `zazi_inbound_replies` | Stores matched inbound replies with status, intent, and audit trail |
| `zazi_reply_actions` | Action log for handled/task/reminder/meeting actions on replies |

### Reply Matching (3-tier)

1. `in_reply_to` header → `provider_message_id` on outbound send
2. `thread_id` → `provider_thread_id` on outbound send
3. Fallback: `sender_email` + normalized subject match (high confidence only)

Unmatched emails are silently skipped — never shown in UI.

### UI Features

- **3-panel layout**: reply list (left), detail (right), Command Centre drawer (optional)
- **Filters**: All, Unread, New, Waiting, Snoozed, Handled
- **Intent tags**: interested, objection, support, unsubscribe_risk, onboarding, payment_issue, meeting_request, follow_up, customer_care, general_info
- **Email → Plan actions**: Create Task (T), Reminder (R), Meeting (M) — prefilled from reply context
- **Triage shortcuts**: J/K navigate, W waiting, S snooze, H handled, X star, U unread toggle, Esc back

### Edge Function: `ingest-reply`

Webhook endpoint that receives inbound email payloads, matches against `zazi_outbound_sends`, deduplicates, and inserts into `zazi_inbound_replies`. Rejects unmatched mail.

### Settings

Reply account configuration with brand mapping, webhook endpoint display, and connection health status.

---

## 9. Roadmap / Planned Features

- Third-party integration connections (Stripe payments, Zapier workflows)
- Advanced automation conditions and branching
- Landing page builder
- Revenue tracking and commerce features
- Mobile-responsive Plan Hub improvements
- Multi-user workspace collaboration
- Custom domain email sending
- Advanced analytics with cohort analysis
- AI reply summarization and intent detection
- Reply assignment and team routing

---

© 2026 Vanto. All rights reserved.
