# Kairos Executive — Outstanding Tasks, Known Issues & Technical Debt

> Last updated: 2026-04-05

---

## 1. Outstanding Tasks

| # | Task | Priority | Notes |
|---|------|----------|-------|
| 1 | **Android transcription — async polling path** | P0 | Storage-first upload + `transcription_jobs` polling is implemented. Backend `transcribe-audio` returns 502 due to upstream Whisper 403 (API key / billing issue). Must resolve OpenAI key access before Android transcription works end-to-end. |
| 2 | **Ensure `transcribe-audio` always writes job status** | P0 | Edge function must update `transcription_jobs` to `completed` or `failed` on every code path — including unexpected errors — so the frontend never hangs on "pending". |
| 3 | **Admin role migration** | P1 | Admin check currently uses hardcoded email (`ADMIN_EMAIL` in `AdminBetaTesters.tsx`). Must move to a proper `user_roles` table with `has_role()` security-definer function per RLS best practices. |
| 4 | **Push notifications for daily briefing** | P2 | `daily_briefing_time` setting is stored but no push notification delivery is implemented. Requires service worker + web push registration. |
| 5 | **Offline data cache** | P2 | PWA is installable (`manifest.json` exists) but there is no service-worker data caching strategy. Offline access shows empty state. |

---

## 2. Known Issues

| # | Issue | Severity | Details |
|---|-------|----------|---------|
| 1 | **Whisper API 403 on `transcribe-audio`** | Critical | The `OPENAI_API_KEY` used by the Edge Function is rejected by OpenAI with a 403. Root cause is either an invalid key, expired billing, or missing transcription endpoint access on the project. |
| 2 | **Android browser Speech API unreliable** | High | Web Speech API (`webkitSpeechRecognition`) on Android Chrome frequently returns empty or truncated transcripts. Mitigated by the Whisper server-fallback path, which is itself blocked by issue #1. |
| 3 | **`transcription_jobs` row left as `pending`** | High | When `transcribe-audio` fails with a 502, some error paths do not write `status = 'failed'` back to the DB, leaving the frontend polling indefinitely. |
| 4 | **Rescue page (`/rescue`) is a debug artifact** | Low | `Rescue.tsx` uses a separate Gemini-based transcription path (`rescue-transcribe` + `rescue-process`). Intended as a diagnostic tool, not user-facing. Should be hidden or removed before GA. |
| 5 | **Testimony data loss risk** | Medium | Testimonies are stored in `localStorage` (`testimony-store.ts`), not in the database. Clearing browser data or switching devices loses all testimony records. |

---

## 3. Coming Soon / Planned Features

| # | Feature | Status | Description |
|---|---------|--------|-------------|
| 1 | **Standalone testimony entries** | Planned | Allow free-form praise entries not tied to a specific answered prayer. |
| 2 | **Testimony category filtering** | Planned | Filter chips (Healing, Provision, Guidance, etc.) in the Memory tab's Testimonies timeline. |
| 3 | **Study breadcrumb trail** | Planned | Show clickable breadcrumb path (e.g. Romans 8:28 → James 1:2) in the Scripture study view so users can trace their cross-reference journey. |
| 4 | **Pattern analysis export** | Planned | Export Memory tab pattern analysis as a shareable PDF or summary. |
| 5 | **Audio file import** | Planned | Allow users to select/upload a pre-recorded audio file instead of recording live — especially useful on mobile. |
| 6 | **Multi-device sync for habits & mood** | Planned | Migrate habit tracking and mood check-in from `localStorage` to Supabase so data syncs across devices. |

---

## 4. Technical Debt

| # | Area | Description | Risk |
|---|------|-------------|------|
| 1 | **`localStorage` for core data** | Habits (`habit-engine.ts`), testimonies (`testimony-store.ts`), saved verses, reading history, and daily mood are all `localStorage`-only. Data is lost on device switch or browser clear. | High — data loss |
| 2 | **`transcribe-audio` function size** | 223 lines in a single file handling JSON + FormData + raw binary input modes, storage download, Whisper call, and job status writes. Should be decomposed into helpers. | Medium — maintainability |
| 3 | **Duplicate transcription paths** | Three separate transcription Edge Functions exist: `transcribe-audio` (Whisper), `rescue-transcribe` (Gemini via Lovable AI Gateway), and browser-native Web Speech API. No unified interface. | Medium — confusion |
| 4 | **Duplicate AI processing paths** | `process-transcript` (OpenAI) and `rescue-process` (Lovable AI Gateway / Gemini) do the same job with different providers and slightly different prompts. | Medium — drift risk |
| 5 | **No automated E2E tests for voice flow** | Playwright config exists but no tests cover the record → transcribe → process → save pipeline. Regressions are caught manually. | High — regression risk |
| 6 | **Hardcoded admin email** | `AdminBetaTesters.tsx` line 11 uses `const ADMIN_EMAIL = 'vanto@onlinecourseformlm.com'` for access control — trivially bypassable client-side. | High — security |
| 7 | **Mock data file** | `src/data/mock-data.ts` exists but its usage scope is unclear. Should be audited and removed if unused in production paths. | Low |
| 8 | **Scripture tab state size** | `ScriptureTab.tsx` manages book/chapter/verse selection, saved verses, reading history, search, and topical study all in one component with heavy `localStorage` I/O. Candidate for decomposition. | Medium — maintainability |

---

## 5. Rollback & Recovery Notes

| Item | Details |
|------|---------|
| **Rescue-related Edge Functions** | `rescue-transcribe` and `rescue-process` were deployed to the production Supabase project during Android debugging. They are independent functions and do not affect the main flow. Can be deleted via `supabase functions delete rescue-transcribe --project-ref <ref>`. |
| **`transcription_jobs` table** | Added during the async polling migration. Used only by the mobile fallback path. Main desktop flow does not depend on it. Safe to keep. |
| **Frontend diagnostic logs** | `[KAIROS-DIAG]` console logs remain in `VoiceRecorder.tsx` and `transcribe-audio`. Should be removed or gated behind a debug flag before GA. |

---

*This document should be updated as items are resolved or new issues are discovered.*
