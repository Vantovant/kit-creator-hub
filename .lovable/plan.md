
Context loaded. Here's the plan.

Category: UI + backend (contacts editor, schema alignment, hub sync).

# Contact Drawer v1 — parity with Vanto CRM

Today the right pane in `/dashboard/contacts` is **read-only** (name/email/phone shown as static text; only notes, tags, sequence enroll work). The Spec Kit v1 says the drawer must be the **single canonical editor** for a contact, with identical fields and payloads across every spoke so bidirectional hub sync stays lossless. This plan brings Zazi Mail into that contract.

## 1. Schema alignment (single migration)

Add the Spec Kit fields missing from `prospects`, keep everything else backwards compatible.

| Column | Type | Notes |
|---|---|---|
| `last_name` | text null | Split from `full_name` if empty |
| `whatsapp_display_name` | text null | Triggers "confirm name" banner if != name |
| `contact_source` | enum | `unknown\|facebook\|twilio\|maytapi\|manual\|google\|email` |
| `contact_confidence` | enum | `confirmed\|guessed\|unknown` |
| `name_needs_confirmation` | boolean default false | Surfaces the composer nudge |
| `phone_raw` | text null | Kept alongside `phone_normalized` |
| `stage_id` | uuid null | FK → new `pipeline_stages` (nullable = Unassigned) |
| `assigned_to` | uuid null | FK → `auth.users`; permission-gated |
| `temperature` | enum | Reuse existing `lead_temperature` (map `hot/warm/cold`) |
| `hub_contact_id` | uuid null | Set after first hub push |
| `hub_version` | int null | For 409-conflict last-writer-wins |
| `updated_at` | timestamptz | Already exists — becomes the merge tiebreaker |

Plus new `pipeline_stages(id, name, sort_order, is_default)` with 3 seed rows (New / Working / Won) and full RLS + GRANTs to `authenticated` + `service_role`.

`phone_normalized` stays derived (E.164, default `+27`) via a `BEFORE INSERT/UPDATE` trigger on `phone_raw`.

## 2. Drawer UI (right-side slide-over, 448px, backdrop blur)

Replace the current fixed right column with a portal drawer opened from:
- Contacts list row click
- Contact 360 panel in `/dashboard/inbox` ("Open in drawer")
- Command bar ⌘K → "Open contact…"

Eight stacked sections top → bottom, matching spec exactly:

```text
┌──────────────────────────────────────┐
│ 1. Header  ● VP  Vanto Phiri     [×] │
│    +27 82 … / vanto@x.com            │
├──────────────────────────────────────┤
│ 2. Core Identity   [edit inline]     │
│    Full name · Phone · Email         │
├──────────────────────────────────────┤
│ 3. Identity Bridge                   │
│    First/Last · WhatsApp name        │
│    Source · Confidence · confirm ☐   │
├──────────────────────────────────────┤
│ 4. Classification (Lead / Temp)      │
├──────────────────────────────────────┤
│ 5. Pipeline & Ownership              │
│    Stage · Assigned to  (RBAC gate)  │
├──────────────────────────────────────┤
│ 6. Notes & Tags (freeform + chips)   │
├──────────────────────────────────────┤
│ 7. Activity Timeline (last 50, RO)   │
├──────────────────────────────────────┤
│ 8. Footer  [Save] [Delete] [Next-Best]│
└──────────────────────────────────────┘
```

Rules baked in:
- Every field is inline-editable; save-on-blur (debounced 400ms) + explicit **Save** in footer.
- Validation matches spec: email lowercased on save; `phone_raw` required if email empty and vice versa; enums enforced client-side and server-side.
- Confirm-name banner appears whenever `whatsapp_display_name && whatsapp_display_name !== full_name`.
- Delete guarded by a typed-confirmation modal + only allowed if `has_role(auth.uid(),'admin')`.
- `Assigned to` dropdown gated by role — non-admins see it read-only.

New file: `src/components/contacts/ContactDrawer.tsx` (~450 lines). Retire the in-page `ContactDetail` block in `src/app/dashboard/contacts/page.tsx`; the page shrinks to filters + list only and opens the drawer.

## 3. Hub sync (Vantoos bridge)

Every save triggers a signed push through `suite-bridge-spoke` → hub, using the exact payload shape from image 4:

```json
{
  "app_key": "zazi_email",
  "local_id": "<spoke prospect uuid>",
  "hub_contact_id": "<uuid or null>",
  "hub_version": <int or null>,
  "identity": { "name":"…", "first_name":"…", "last_name":"…",
                "whatsapp_display_name":"…",
                "phone_normalized":"+27…", "email":"lowercase@x.com" },
  "attributes": { "lead_type":"…", "temperature":"…",
                  "contact_source":"…", "contact_confidence":"…",
                  "name_needs_confirmation": true|false,
                  "tags":[…], "notes":"…" },
  "updated_at": "ISO8601"
}
```

Wiring:
- New edge function `contact-hub-push` — takes prospect id, builds payload, calls `suite-bridge-spoke` locally (which already signs+forwards to `VANTOOS_HUB_URL`).
- On hub `409 conflict`: pull hub's newer version, overwrite local, bump `hub_version`, **do not** re-emit.
- Null-safe merge: never overwrite a non-null field with null unless the drawer explicitly sends `op:"clear"`.
- Inbound (hub → spoke) already routed through `suite-bridge-spoke`; add a new `kind: "contact_upsert"` handler that applies the same merge rule locally.

## 4. Cross-app wiring (Contact 360 in inbox)

`src/components/inbox/Contact360Panel.tsx` gets an **Open drawer** button that mounts the same `ContactDrawer` — one editor, everywhere, as the spec requires. The existing "Add to Contacts" and "Needs enrichment" nudges stay as entry points.

## 5. Files touched

- `supabase/migrations/xxxx_contact_drawer_v1.sql` (schema + triggers + RLS + GRANTs + seed stages)
- `supabase/functions/contact-hub-push/index.ts` (new)
- `supabase/functions/suite-bridge-spoke/index.ts` (add `contact_upsert` handler)
- `src/components/contacts/ContactDrawer.tsx` (new)
- `src/components/contacts/ContactDrawerFields/*.tsx` (8 section subcomponents)
- `src/app/dashboard/contacts/page.tsx` (strip right pane, open drawer)
- `src/components/inbox/Contact360Panel.tsx` (Open drawer button)

## 6. Out of scope (intentionally)

- Pipeline board UI (only the `stage_id` selector ships now)
- Bulk edit from list
- Merge / dedupe tool
- WhatsApp / Twilio / Maytapi ingestion — `contact_source` accepts the values, ingestion arrives with those spokes

## 7. Verification

- Static: TypeScript build + `tsgo` on new components.
- Playwright: open contacts, edit name/phone/email in drawer, assert row updates + toast shows "Synced to hub".
- Curl `contact-hub-push` locally, assert 200 + hub echoes back with `hub_contact_id`.
- Conflict test: bump `hub_version` from hub mock, save from drawer, assert local overwritten and no re-emit loop.

Approve and I'll ship it in one pass.
