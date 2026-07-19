# Vanto Zazi Mail — Product Specification

**Version:** 2.0  
**Date:** 5 April 2026  
**Status:** Foundation Stage (Beta) — Active Development

---

## 1. Product Overview

**Vanto Zazi Mail** is a creator-first email marketing platform built for creators, educators, and entrepreneurs — particularly in the South African context. It enables users to build audiences, send powerful email campaigns, automate communication, and manage their daily workflow from a single dashboard.

The platform is designed as a private, self-hosted marketing operating system with integrated productivity tools (Plan Hub), a Knowledge Base with AI-powered search (Zazi Copilot), multi-step email automation, and a Reply Inbox for campaign response management.

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
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS v3 |
| UI Components | shadcn/ui (Radix primitives), Lucide icons |
| Charts | Recharts |
| Backend | Lovable Cloud (Supabase) — PostgreSQL, Edge Functions, Storage |
| Email Delivery | Resend (via webhook integration) |
| AI | Lovable AI (Gemini / GPT models via edge functions) |
| Auth | Supabase Auth (email/password) |

### Database Schema (Core Tables)

| Table | Purpose |
|-------|---------|
| `prospects` | Subscriber/contact records with email, name, engagement score, APLGO fields, unsubscribe status |
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
| `activity_goals` | Daily activity targets per type |
| `contact_activities` | Logged activities tied to prospects |
| `kb_sources` | Knowledge Base uploaded files — collection, version, processing status |
| `kb_chunks` | Full-text-search indexed chunks from KB sources |
| `kb_ingestion_jobs` | Processing job tracking for KB ingestion pipeline |
| `kb_query_log` | Copilot query/response audit log with feedback |
| `plan_tasks` | Personal tasks with priority, status, due date, estimated minutes |
| `plan_reminders` | Time-based reminders |
| `plan_meetings` | Calendar meetings with attendees and location |
| `plan_notes` | Daily notes with structured mode and link references |
| `zazi_reply_accounts` | Connected reply monitoring accounts with brand mapping |
| `zazi_outbound_sends` | Tracks every outbound email for reply matching |
| `zazi_inbound_replies` | Matched inbound replies with triage status and intent |
| `zazi_reply_actions` | Audit log for reply triage actions |

### Edge Functions (17 total)

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
| `smart-import` | AI-assisted CSV field mapping and import |
| `kb-ingest` | Processes uploaded KB files into searchable chunks |
| `copilot-answer` | RAG-based Q&A against Knowledge Base |
| `ai-assistant` | General AI workflow assistant |
| `plan-intake` | Voice/text intake for Plan Hub items |
| `plan-ai-extract-actions` | AI extraction of tasks/reminders/meetings from text |
| `ingest-reply` | Webhook endpoint for inbound reply ingestion and matching |
| `integration-webhook` | Receives inbound webhooks from third-party providers |

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
- Import/Export modal: CSV drag-and-drop upload with field mapping, CSV/JSON download
- Individual subscriber delete
- Unsubscribe toggle
- APLGO-specific fields: aplgo_id, associate_status, go_status, sponsor_name, lead_path, focus_area

### 3.4 Broadcasts

**Route:** `/dashboard/broadcasts`

- List view of all broadcasts with status badges (draft, scheduled, sending, sent, failed)
- Per-broadcast stats expansion: opens, clicks, bounces
- Delete functionality
- **New Broadcast** (`/dashboard/broadcasts/new`): Visual email editor, segment targeting, template selection, schedule or send immediately

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
- **Automation Builder** (`/dashboard/automations/builder`): Visual workflow builder with step configuration

### 3.7 Email Sequences

**Route:** `/dashboard/sequences`

- Multi-step drip email sequences (e.g. RESET & RISE 90-Day Momentum Run — 107 steps)
- Create/edit sequence with name, description, brand
- Step editor: subject, content, delay (days), and order
- Batch enrol subscribers into sequences
- Sequence status: draft / active / paused
- Public join forms per sequence

### 3.8 Templates

**Route:** `/dashboard/templates`

- Template library with category filtering and search
- Create/edit templates: name, subject, content, category
- Premium template flag, gradient preview badges
- Duplicate template functionality

### 3.9 Segments

**Route:** `/dashboard/segments`

- Dynamic audience segments with filter rules
- Filter conditions: tag-based, date-based, engagement-score-based
- Segment subscriber count preview
- Tag management tab within segments page

### 3.10 Forms & Landing Pages

**Route:** `/dashboard/forms`

- Lists all sequences as joinable forms
- Welcome form (`/forms/welcome`), VantoOS Beta form (`/forms/vantoos-beta`)
- Copy-to-clipboard link sharing

### 3.11 Analytics

**Route:** `/dashboard/analytics`

- Aggregate email performance metrics
- Engagement score breakdown chart
- Delivery performance pie chart
- Real event data from `email_events` table

### 3.12 Integrations

**Route:** `/dashboard/integrations`

- Integration marketplace UI with categories
- Pre-configured integration cards (Zapier, Stripe, Calendly, Slack, etc.)
- Connect/disconnect toggle per integration

### 3.13 Knowledge Base

**Route:** `/dashboard/knowledge-base`

- **8 Collections:** APLGO Business, Products, Pricing/PV, Scripts/Templates, Compliance, Online Course, MLM Motivation, Personality Code
- File upload (PDF, DOCX, TXT, CSV) with automatic ingestion pipeline
- File versioning, status tracking, re-process capability
- **Ask KB panel:** RAG-based Q&A with feedback loop

### 3.14 Plan Hub (Command Centre)

**Route:** `/dashboard/plan`

- **6 Tabs:** Today, Tasks, Reminders, Meetings, Calendar, Notes
- Command Bar (⌘K), Voice Input with AI extraction
- Insider Panel with contextual AI tips

### 3.15 Reply Inbox

**Route:** `/dashboard/replies`

- Campaign-reply-only workspace (not a general inbox)
- 3-panel layout: filters, reply list, reply detail
- 4-tier reply matching (in_reply_to → references → thread_id → subject fallback)
- Intent tag classification (10 tags)
- Plan Hub integration (create Task/Reminder/Meeting from replies)
- Command Centre drawer
- Keyboard shortcuts (J/K/T/R/M/W/S/H/X/U/Esc)
- Realtime updates via postgres_changes

### 3.16 Settings

**Route:** `/dashboard/settings`

- **Tabs:** Profile, Email, Notifications, Appearance
- Profile: Display name, company, website, timezone
- Email: From name, reply-to, brand, email signature (live preview)
- Appearance: Dark/light mode toggle

### 3.17 AI Workflow Assistant

- Floating chat widget on all dashboard pages (except Plan)
- Context-aware assistance for email writing, automation setup, subscriber management

### 3.18 Unsubscribe

**Route:** `/unsubscribe`

- Token-based one-click unsubscribe with confirmation screen

---

## 4. Email Delivery Pipeline

```
User creates broadcast → Save to `broadcasts` table (status: draft/scheduled)
                       ↓
Schedule triggers `process-scheduled-broadcasts` edge function (cron)
                       ↓
`send-broadcast` function:
  1. Verify active reply account for brand (fail-fast)
  2. Resolve segment → get subscriber list
  3. For each subscriber: call Resend API
  4. Create zazi_outbound_sends record per email
  5. Update broadcast stats (total_sent, total_failed)
  6. Set status to "sent"
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
- **Webhook verification** — Svix HMAC, shared secret, and provider-specific signatures
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

| Brand | Use Case |
|-------|----------|
| **Vanto** | Primary brand for newsletters and creator content |
| **APLGO** | Network marketing team communications |

Brand selection is available on broadcasts, sequences, and templates.

---

## 8. Active Sequences (as of 5 April 2026)

| Sequence | Steps | Status | Description |
|----------|-------|--------|-------------|
| RESET & RISE: 90-Day Momentum Run | 107 | Active | 90-day email journey driving APLGO downlines to WhatsApp group for the 90-day campaign |

### Subscriber Levels Imported (APLGO Downlines)

| Level | File | Status |
|-------|------|--------|
| Level 1 | Current_Associates_APL_37.xlsx | ✅ Checked for new recruits |
| Level 2 | Current_Associates_APL_36.xlsx | ✅ Checked for new recruits |
| Level 3 | Current_Associates_APL_38.xlsx | ✅ Checked |
| Level 4 | Current_Associates_APL_39.xlsx | ✅ Checked |
| Level 5 | Current_Associates_APL_40.xlsx | ✅ Checked |
| Level 6 | Current_Associates_APL_35.xlsx | ✅ Imported |
| Level 7 | Current_Associates_APL_34.xlsx | ✅ Imported |
| Level 8 | Current_Associates_APL_31.xlsx | ✅ Imported |
| Level 9 | Current_Associates_APL_30.xlsx | ✅ Imported |
| Level 10 | Current_Associates_APL_29.xlsx | ✅ Imported |
| Level 11 | Current_Associates_APL_28.xlsx | ✅ Imported |
| Level 12 | Current_Associates_APL_27.xlsx | ✅ Imported |
| Level 13 | (pending) | ❌ Not yet imported |

### Special Enrollments

- **Masiya Amos Baloyi** (amosbaloyi@gmail.com) — Upline and 90-day campaign author. Enrolled on Day 4, caught up with Days 1-3 immediately.

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
- Reply composing (send response from inbox)
- Reply assignment and team routing
- Snooze resurface cron job

---

© 2026 Vanto. All rights reserved.
