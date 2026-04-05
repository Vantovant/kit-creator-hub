# Vanto Zazi Mail — Page-by-Page Specification

**Version:** 1.0  
**Date:** 5 April 2026

---

## Route Map

| Route | Page | Component File |
|-------|------|---------------|
| `/auth` | Login / Signup | `src/pages/AuthPage.tsx` |
| `/dashboard` | Home Dashboard | `src/app/dashboard/page.tsx` |
| `/dashboard/subscribers` | Subscriber Management | `src/app/dashboard/subscribers/page.tsx` |
| `/dashboard/broadcasts` | Broadcast List | `src/app/dashboard/broadcasts/page.tsx` |
| `/dashboard/broadcasts/new` | Broadcast Editor | `src/app/dashboard/broadcasts/new/page.tsx` |
| `/dashboard/broadcasts/ab-test` | A/B Testing | `src/app/dashboard/broadcasts/ab-test/page.tsx` |
| `/dashboard/sequences` | Email Sequences | `src/app/dashboard/sequences/page.tsx` |
| `/dashboard/automations` | Automation List | `src/app/dashboard/automations/page.tsx` |
| `/dashboard/automations/builder` | Automation Builder | `src/app/dashboard/automations/builder/page.tsx` |
| `/dashboard/templates` | Template Library | `src/app/dashboard/templates/page.tsx` |
| `/dashboard/segments` | Segments & Tags | `src/app/dashboard/segments/page.tsx` |
| `/dashboard/forms` | Forms & Links | `src/app/dashboard/forms/page.tsx` |
| `/dashboard/analytics` | Analytics Dashboard | `src/app/dashboard/analytics/page.tsx` |
| `/dashboard/integrations` | Integrations Marketplace | `src/app/dashboard/integrations/page.tsx` |
| `/dashboard/knowledge-base` | Knowledge Base | `src/app/dashboard/knowledge-base/page.tsx` |
| `/dashboard/plan` | Plan Hub | `src/app/dashboard/plan/page.tsx` |
| `/dashboard/replies` | Reply Inbox | `src/app/dashboard/replies/page.tsx` |
| `/dashboard/settings` | Settings | `src/app/dashboard/settings/page.tsx` |
| `/forms/welcome` | Public Welcome Form | `src/pages/WelcomeForm.tsx` |
| `/forms/sequence/:id` | Public Sequence Form | `src/pages/SequenceForm.tsx` |
| `/forms/vantoos-beta` | VantoOS Beta Form | `src/pages/VantoOSBetaForm.tsx` |
| `/unsubscribe` | Unsubscribe | `src/pages/UnsubscribePage.tsx` |

---

## 1. Auth Page (`/auth`)

**File:** `src/pages/AuthPage.tsx`

**Features:**
- Toggle between Login and Sign Up modes
- Email/password input fields
- Form validation
- Redirects to `/dashboard` on success
- Error display for invalid credentials

**Data:** Supabase Auth API (no custom table)

---

## 2. Dashboard Home (`/dashboard`)

**File:** `src/app/dashboard/page.tsx`

**Layout:** 4 stat cards (top) → 2 columns (recent broadcasts + new subscribers) → growth chart

**Stats Cards:**
| Card | Source |
|------|--------|
| Total Subscribers | `prospects` count where `unsubscribed = false` |
| Emails Sent | `email_events` count where `event_type = 'sent'` |
| Open Rate | `opened / sent × 100` from `email_events` |
| Click Rate | `clicked / sent × 100` from `email_events` |

**Recent Broadcasts:** Last 5 from `broadcasts` table, ordered by `created_at` desc  
**New Subscribers:** Last 5 from `prospects` table, ordered by `created_at` desc  
**Growth Chart:** Recharts area chart from `prospects` grouped by day

---

## 3. Subscribers (`/dashboard/subscribers`)

**File:** `src/app/dashboard/subscribers/page.tsx`

**Features:**
- Paginated table (25/page) with search
- Columns: checkbox, name, email, engagement score, source, tags, date, actions
- Tag management (add/remove per subscriber)
- Import modal (CSV drag-drop with field mapping)
- Export modal (CSV/JSON)
- Delete and unsubscribe actions

**Data Tables:** `prospects`, `prospect_tags`, `tags`

---

## 4. Broadcasts (`/dashboard/broadcasts`)

**File:** `src/app/dashboard/broadcasts/page.tsx`

**Features:**
- List view with status badges (draft, scheduled, sending, sent, failed)
- Per-broadcast stats expansion (opens, clicks, bounces from `email_events`)
- Delete drafts/failed
- "New Broadcast" button → navigates to editor

**Data Tables:** `broadcasts`, `email_events`

---

## 5. Broadcast Editor (`/dashboard/broadcasts/new`)

**File:** `src/app/dashboard/broadcasts/new/page.tsx`

**Features:**
- Subject line, from name, reply-to, preview text inputs
- Brand selector (Vanto / APLGO)
- Visual rich-text editor with toolbar
- Segment targeting dropdown (from `segments` table)
- Template selection
- Email signature injection
- Send Now or Schedule options

**Data Tables:** `broadcasts` (insert), `segments` (read), `email_templates` (read)

---

## 6. A/B Testing (`/dashboard/broadcasts/ab-test`)

**File:** `src/app/dashboard/broadcasts/ab-test/page.tsx`

**Features:**
- Create variant A and B (different subject/content)
- Test size percentage slider
- Duration selector (hours)
- Winning metric toggle (open rate / click rate)
- Start/view/delete tests
- Results display after completion

**Data Tables:** `ab_tests`, `broadcasts`

---

## 7. Sequences (`/dashboard/sequences`)

**File:** `src/app/dashboard/sequences/page.tsx`

**Features:**
- List all sequences with name, brand, step count, status
- Create new sequence → opens `SequenceForm`
- Edit existing sequence
- Batch enrol subscribers
- Activate/pause/delete

**Data Tables:** `email_sequences`, `automation_queue`

---

## 8. Sequence Form

**File:** `src/pages/SequenceForm.tsx`

**Features:**
- Name, description, brand inputs
- Step editor: add/remove/reorder steps
- Per-step: subject, content (HTML), delay in days
- Save as draft or activate

---

## 9. Automations (`/dashboard/automations`)

**File:** `src/app/dashboard/automations/page.tsx`

**Features:**
- List automations with status badges
- Filter by status
- Create / edit / delete

**Data Tables:** `automations`

---

## 10. Automation Builder (`/dashboard/automations/builder`)

**File:** `src/app/dashboard/automations/builder/page.tsx`

**Features:**
- Trigger configuration (subscribe, tag added, purchase, link click, date)
- Visual workflow step builder
- Step types: send email, wait, add tag, condition
- Save and activate

**Data Tables:** `automations` (upsert)

---

## 11. Templates (`/dashboard/templates`)

**File:** `src/app/dashboard/templates/page.tsx`

**Features:**
- Template grid with gradient preview cards
- Category filter and search
- Create / edit / duplicate / delete
- Premium flag toggle

**Data Tables:** `email_templates`

---

## 12. Segments (`/dashboard/segments`)

**File:** `src/app/dashboard/segments/page.tsx`

**Tabs:** Segments | Tags

**Segments Tab:**
- Create/edit segments with filter rules (JSON)
- Preview subscriber count
- Delete segments

**Tags Tab:**
- Create tags with name and colour
- Delete tags
- View tag usage count

**Data Tables:** `segments`, `tags`, `prospect_tags`

**Components:** `SmartAudienceBuilder`, `ConditionGroup`, `ConditionRow`, `AudiencePreview`

---

## 13. Forms (`/dashboard/forms`)

**File:** `src/app/dashboard/forms/page.tsx`

**Features:**
- Lists all active sequences as shareable form links
- Welcome form and VantoOS Beta form links
- Copy-to-clipboard for each URL

---

## 14. Analytics (`/dashboard/analytics`)

**File:** `src/app/dashboard/analytics/page.tsx`

**Features:**
- Stats cards: subscribers, sent, delivered, bounced, opened, clicked, complained
- Calculated rates: open rate, click rate, bounce rate, complaint rate
- Engagement score distribution chart (Recharts bar)
- Delivery performance pie chart

**Data Tables:** `email_events`, `prospects`

---

## 15. Integrations (`/dashboard/integrations`)

**File:** `src/app/dashboard/integrations/page.tsx`

**Features:**
- Marketplace grid of integration cards
- Categories: Automation, Payments, Communication, E-commerce, CMS, Analytics, etc.
- Search and filter
- Connect/disconnect toggle (UI only — backend not implemented)

**Status:** Frontend scaffold only

---

## 16. Knowledge Base (`/dashboard/knowledge-base`)

**File:** `src/app/dashboard/knowledge-base/page.tsx`

**Features:**
- 8 collection tabs
- File upload to Supabase Storage (`zazi_kb` bucket)
- Automatic ingestion pipeline (kb-ingest edge function)
- File status tracking (queued → processing → ready / failed)
- Re-process and delete files
- Ask KB panel with RAG-powered Q&A (copilot-answer edge function)
- Feedback logging (helpful / not helpful)

**Data Tables:** `kb_sources`, `kb_chunks`, `kb_ingestion_jobs`, `kb_query_log`

---

## 17. Plan Hub (`/dashboard/plan`)

**File:** `src/app/dashboard/plan/page.tsx`

**Tabs:** Today | Tasks | Reminders | Meetings | Calendar | Notes

**Components:**
| Component | File |
|-----------|------|
| TodayTab | `src/components/plan/TodayTab.tsx` |
| TasksTab | `src/components/plan/TasksTab.tsx` |
| RemindersTab | `src/components/plan/RemindersTab.tsx` |
| MeetingsTab | `src/components/plan/MeetingsTab.tsx` |
| CalendarTab | `src/components/plan/CalendarTab.tsx` |
| NotesTab | `src/components/plan/NotesTab.tsx` |
| CommandBar | `src/components/plan/CommandBar.tsx` |
| CommandMic | `src/components/plan/CommandMic.tsx` |
| DictationMic | `src/components/plan/DictationMic.tsx` |
| VoiceCapture | `src/components/plan/VoiceCapture.tsx` |
| InsiderPanel | `src/components/plan/InsiderPanel.tsx` |

**Data Tables:** `plan_tasks`, `plan_reminders`, `plan_meetings`, `plan_notes`

---

## 18. Reply Inbox (`/dashboard/replies`)

**File:** `src/app/dashboard/replies/page.tsx`

**Layout:** Toolbar → Filters → List (380px) | Detail (flex)

**Components:**
| Component | File |
|-----------|------|
| ReplyFilters | `src/components/replies/ReplyFilters.tsx` |
| ReplyList | `src/components/replies/ReplyList.tsx` |
| ReplyDetail | `src/components/replies/ReplyDetail.tsx` |
| ReplySettings | `src/components/replies/ReplySettings.tsx` |
| CommandCentre | `src/components/email/CommandCentre.tsx` |

**Hooks:** `useReplies`, `useReplyAccounts`

**Data Tables:** `zazi_inbound_replies`, `zazi_outbound_sends`, `zazi_reply_accounts`, `zazi_reply_actions`

**Keyboard Shortcuts:** J/K (navigate), T/R/M (create task/reminder/meeting), W/S/H (waiting/snooze/handled), X (star), U (unread filter), Esc (back)

---

## 19. Settings (`/dashboard/settings`)

**File:** `src/app/dashboard/settings/page.tsx`

**Tabs:** Profile | Email | Notifications | Appearance

- **Profile:** display_name, company, website, timezone
- **Email:** from_name, reply_to, brand, signature (live preview)
- **Notifications:** toggles for digests, alerts, reports
- **Appearance:** dark/light mode

**Data Tables:** `profiles`

---

## 20. Public Forms

### Welcome Form (`/forms/welcome`)
**File:** `src/pages/WelcomeForm.tsx`  
Collects: name, email → calls `save-prospect` edge function

### Sequence Form (`/forms/sequence/:id`)
**File:** `src/pages/SequenceForm.tsx`  
Collects: name, email → calls `save-prospect` + enrolls in sequence

### VantoOS Beta Form (`/forms/vantoos-beta`)
**File:** `src/pages/VantoOSBetaForm.tsx`  
Extended form with company, website, goals

---

## 21. Unsubscribe (`/unsubscribe`)

**File:** `src/pages/UnsubscribePage.tsx`  
Token-based one-click unsubscribe → calls `unsubscribe` edge function

---

## Shared Layout & Components

| Component | File | Purpose |
|-----------|------|---------|
| DashboardLayout | `src/app/dashboard/layout.tsx` | Sidebar + header wrapper for all dashboard pages |
| Sidebar | `src/components/dashboard/Sidebar.tsx` | Navigation sidebar with section links |
| DashboardHeader | `src/components/dashboard/DashboardHeader.tsx` | Page title + dark mode toggle |
| ProtectedRoute | `src/components/dashboard/ProtectedRoute.tsx` | Auth guard for dashboard routes |
| ThemeProvider | `src/components/ThemeProvider.tsx` | Dark/light mode context |
| AIWorkflowAssistant | `src/components/dashboard/AIWorkflowAssistant.tsx` | Floating AI chat widget |
| SidebarContext | `src/components/dashboard/SidebarContext.tsx` | Sidebar collapse state |

---

© 2026 Vanto. All rights reserved.
