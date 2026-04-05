# Vanto Zazi Mail — Outstanding Tasks & Technical Debt

**Version:** 1.0  
**Date:** 5 April 2026

---

## 1. Outstanding Features (Not Yet Implemented)

### HIGH Priority

| Feature | Area | Description |
|---------|------|-------------|
| AI intent auto-detection | Reply Inbox | Auto-classify reply intent on ingestion using AI |
| Snooze resurface cron | Reply Inbox | Cron job to resurface snoozed replies when `snoozed_until` passes |
| Level 13 import | Subscribers | Final APLGO downline level not yet imported |
| Integrations backend | Integrations | All integration cards are UI-only — no database, no OAuth, no webhooks |
| Reply composing | Reply Inbox | Send outbound replies from within the inbox (currently read-only) |

### MEDIUM Priority

| Feature | Area | Description |
|---------|------|-------------|
| Bulk reply actions | Reply Inbox | Select multiple replies → mark handled/archive |
| Reply search | Reply Inbox | Search by sender, subject, body text |
| Filter badge counts | Reply Inbox | Show count badges on filter tabs |
| Sequence analytics | Sequences | Per-sequence open/click/bounce metrics |
| Automation conditions | Automations | Advanced branching and conditional logic |
| Landing page builder | Forms | Drag-and-drop form/page builder |

### LOW Priority

| Feature | Area | Description |
|---------|------|-------------|
| Reply assignment | Reply Inbox | Assign replies to team members (multi-user) |
| Threaded reply view | Reply Inbox | Group replies by thread_id |
| Attachment handling | Reply Inbox | Store and display inbound attachments |
| Revenue tracking | Analytics | Commerce/payment integration metrics |
| Cohort analysis | Analytics | Advanced subscriber cohort breakdowns |
| Mobile Plan Hub | Plan Hub | Responsive improvements for mobile |

---

## 2. Technical Debt

### Code Quality

| Issue | Location | Impact |
|-------|----------|--------|
| README tech stack is outdated | `README.md` | States "Next.js" and "Bun" — actually React + Vite |
| Large page components | Various `page.tsx` files | Some pages exceed 500 lines — should extract sub-components |
| Hardcoded integration cards | `integrations/page.tsx` | Integration list should come from database or config |
| No test coverage | Entire project | Zero unit/integration tests |
| No error boundaries | App-wide | Unhandled errors crash the entire app |

### Database

| Issue | Table | Impact |
|-------|-------|--------|
| No indexes on prospects.email | `prospects` | Slow lookups on large subscriber lists |
| No indexes on automation_queue.send_at | `automation_queue` | Slow cron queries for pending items |
| engagement_score is static | `prospects` | Only recalculated on demand, not automatically |
| No cascade delete on sequences | `email_sequences` | Deleting a sequence doesn't clean up automation_queue |

### Security

| Issue | Severity | Description |
|-------|----------|-------------|
| Integration credentials storage | Medium | `INTEGRATIONS_SPEC.md` describes storing API keys in JSONB — needs encryption at rest |
| No rate limiting on public forms | Medium | `save-prospect` endpoint has no rate limiting |
| No CSRF protection on forms | Low | Public forms rely on edge function validation only |

### Performance

| Issue | Impact | Solution |
|-------|--------|----------|
| Dashboard loads all data sequentially | Slow initial load | Parallel data fetching (partially done) |
| No pagination on broadcasts | Memory issues at scale | Add server-side pagination |
| KB chunks loaded without limit | Memory spike on large KBs | Add pagination to chunk queries |
| No caching on repeated KB queries | Redundant AI calls | Cache frequent copilot responses |

---

## 3. Known Bugs

| Bug | Severity | Status |
|-----|----------|--------|
| Dark mode resets on browser data clear | Low | By design (localStorage) — could persist to profile |
| Reply filters don't show counts | Low | `counts` prop exists but never populated |
| Sequence form doesn't validate step order | Low | Steps can be saved with duplicate order_index |

---

## 4. Infrastructure Gaps

| Gap | Description |
|-----|-------------|
| No monitoring/alerting | No system for edge function failures or delivery issues |
| No backup strategy | Database backups rely entirely on Lovable Cloud defaults |
| No staging environment | All development happens against production |
| No CI/CD pipeline | No automated testing or deployment checks |
| No email deliverability monitoring | No tracking of sender reputation or deliverability rates |

---

## 5. Active Campaigns Requiring Attention

| Campaign | Status | Action Needed |
|----------|--------|---------------|
| RESET & RISE 90-Day | Active (Day 4) | Monitor daily sends, ensure queue processing |
| Level 13 import | Pending | User has not yet provided the file |
| WhatsApp group link | Active | Link: `https://chat.whatsapp.com/JAuEcoRs8jRC443tfPQG1h` — monitor for expiry |

---

## 6. Recommended Next Steps (Priority Order)

1. **Import Level 13** — Complete the APLGO downline import
2. **Add snooze resurface cron** — Small effort, high value for Reply Inbox
3. **Implement AI intent detection** — Auto-classify replies on ingestion
4. **Add error boundaries** — Prevent full-app crashes
5. **Add basic tests** — At minimum, edge function unit tests
6. **Build Zapier integration** — Simplest integration, highest ROI (connects to 5000+ apps)
7. **Add sequence analytics** — Track per-sequence performance metrics

---

© 2026 Vanto. All rights reserved.
