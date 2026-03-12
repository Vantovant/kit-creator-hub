# Integrations — Technical Specification

**Version:** 1.0  
**Last Updated:** 12 March 2026  
**Status:** UI Scaffold Complete · Backend Not Implemented

---

## 1. Overview

The Integrations page (`/dashboard/integrations`) provides a marketplace-style interface for connecting third-party services to Vanto Zazi Mail. It enables data sync, webhook-driven automation, and cross-platform workflows.

**Current State:** Frontend-only with hardcoded integration cards. No database persistence, no OAuth flows, no actual API connections.

---

## 2. Architecture

### 2.1 Database Schema (To Be Created)

```sql
CREATE TABLE public.user_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  provider TEXT NOT NULL,              -- e.g. 'zapier', 'stripe', 'slack'
  status TEXT NOT NULL DEFAULT 'disconnected', -- disconnected | connected | error | syncing
  credentials_json JSONB DEFAULT '{}', -- encrypted tokens, API keys (server-side only)
  config_json JSONB DEFAULT '{}',      -- provider-specific settings (channels, sync preferences)
  webhook_url TEXT,                    -- generated inbound webhook URL for this integration
  webhook_secret TEXT,                 -- HMAC secret for verifying inbound webhooks
  connected_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage integrations"
  ON public.user_integrations FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_user_integrations_provider ON public.user_integrations(user_id, provider);
```

### 2.2 Edge Functions (To Be Created)

| Function | JWT | Purpose |
|----------|-----|---------|
| `connect-integration` | Yes | Initiates OAuth or stores API key; returns redirect URL or success |
| `integration-callback` | No | OAuth callback handler; exchanges code for tokens, stores in DB |
| `disconnect-integration` | Yes | Revokes tokens, sets status to disconnected |
| `sync-integration` | Yes | Manual sync trigger; fetches data from provider |
| `integration-webhook` | No | Receives inbound webhooks from providers (Zapier, Stripe, etc.) |

### 2.3 Storage

No storage buckets required. Credentials stored in `credentials_json` column (server-side access only via edge functions with service role key).

---

## 3. Integration Registry

### 3.1 Supported Integrations

Each integration has a **type** that determines its connection flow:

| Type | Flow | Examples |
|------|------|----------|
| `oauth2` | Redirect → Authorize → Callback → Store tokens | Shopify, Slack, Google Analytics, Zoom, Canva |
| `api_key` | User inputs API key → Validate → Store | Zapier, Transistor.fm |
| `webhook` | Generate unique URL → User pastes into provider | Zapier (inbound), WooCommerce |
| `embed` | SDK/script injection (no auth needed) | WordPress (embed forms only) |

### 3.2 Full Integration Catalog

#### Zapier (Priority: HIGH — Recommended First Implementation)
- **Type:** `webhook` (inbound) + `api_key` (outbound)
- **Category:** Automation
- **Connection Flow:**
  1. Generate unique webhook URL: `https://{SUPABASE_URL}/functions/v1/integration-webhook?provider=zapier&integration_id={id}`
  2. User copies URL into Zapier trigger
  3. Zapier sends POST payloads to our webhook
- **Inbound Events:** New subscriber, tag change, form submission (from Zapier)
- **Outbound Triggers:** New subscriber added, broadcast sent, tag applied
- **Config Schema:**
  ```json
  {
    "webhook_url": "string (auto-generated)",
    "allowed_events": ["new_subscriber", "tag_added", "broadcast_sent"],
    "outbound_zap_urls": ["string"] 
  }
  ```
- **Implementation Notes:** Simplest integration — no OAuth required. Webhook-only. Validate via shared secret in `X-Zapier-Secret` header.

#### Stripe
- **Type:** `api_key` (Restricted Key) + `webhook`
- **Category:** Payments
- **Connection Flow:**
  1. User provides Stripe Restricted API Key (with read permissions for customers, charges, subscriptions)
  2. System validates key via `GET /v1/balance`
  3. Generate webhook endpoint; user registers it in Stripe Dashboard
- **Inbound Events:** `checkout.session.completed`, `customer.subscription.created`, `invoice.payment_succeeded`, `customer.created`
- **Actions on Events:**
  - `customer.created` → Create prospect with source `stripe`
  - `checkout.session.completed` → Tag subscriber with product name, update `lead_type` to `Customer`
  - `invoice.payment_succeeded` → Increment engagement score +5
  - `customer.subscription.created` → Apply tag `paying-subscriber`
- **Config Schema:**
  ```json
  {
    "api_key_last4": "string",
    "webhook_signing_secret": "string",
    "sync_customers": true,
    "auto_tag_purchases": true,
    "tag_prefix": "stripe-"
  }
  ```

#### Slack
- **Type:** `oauth2` OR Lovable Connector (preferred)
- **Category:** Communication
- **Connection Flow:** Use Lovable Connector (`connector_id: slack`) if available. Otherwise OAuth2 with Bot Token.
- **Required Scopes:** `chat:write`, `channels:read`
- **Features:**
  - Send notification to channel on: new subscriber, broadcast sent, sequence completed, import finished
  - Channel selector in config
- **Config Schema:**
  ```json
  {
    "channel_id": "string",
    "notify_new_subscriber": true,
    "notify_broadcast_sent": true,
    "notify_import_complete": true,
    "notify_sequence_complete": false
  }
  ```

#### Shopify
- **Type:** `oauth2` (Custom App) OR `api_key` (Admin API Access Token)
- **Category:** E-commerce
- **Connection Flow:**
  1. User provides store URL + Admin API Access Token
  2. Validate via `GET /admin/api/2024-01/shop.json`
  3. Register webhook for `customers/create`, `orders/paid`
- **Sync Capabilities:**
  - Pull customers → create prospects with source `shopify`
  - Order events → tag with product names, update `lead_type`
- **Config Schema:**
  ```json
  {
    "store_url": "string",
    "api_version": "2024-01",
    "sync_customers": true,
    "sync_orders": true,
    "auto_tag_products": true
  }
  ```

#### Calendly
- **Type:** `api_key` (Personal Access Token)
- **Category:** Scheduling
- **Connection Flow:**
  1. User provides Personal Access Token
  2. Validate via `GET /api/v2/users/me`
  3. Register webhook subscription for `invitee.created`
- **Actions on Events:**
  - `invitee.created` → Create/update prospect, set `meeting_time`, apply tag `calendly-booked`
  - Create `plan_meeting` entry in Plan Hub
- **Config Schema:**
  ```json
  {
    "webhook_signing_key": "string",
    "auto_create_meeting": true,
    "default_tag": "calendly-booked"
  }
  ```

#### Google Analytics
- **Type:** `oauth2` (Google OAuth)
- **Category:** Analytics
- **Connection Flow:** OAuth2 with Google. Requires `analytics.readonly` scope.
- **Features:**
  - Pull UTM campaign data to correlate with email broadcasts
  - Display GA metrics alongside email metrics on Analytics page
- **Config Schema:**
  ```json
  {
    "property_id": "string",
    "sync_utm_data": true
  }
  ```
- **Priority:** LOW — complex OAuth, limited immediate value

#### Teachable
- **Type:** `api_key`
- **Category:** Courses
- **Connection Flow:**
  1. User provides Teachable API Key
  2. Validate via `GET /api/v1/users`
- **Actions:**
  - Sync enrolled students → create prospects with source `teachable`
  - Course enrollment → apply tag with course name
  - Course completion → update `lead_type` to `Customer`, bump engagement
- **Config Schema:**
  ```json
  {
    "school_url": "string",
    "sync_students": true,
    "auto_tag_courses": true
  }
  ```

#### WordPress
- **Type:** `embed` (no auth — form embed codes)
- **Category:** CMS
- **Features:**
  - Generate embeddable HTML/JS snippets for signup forms
  - Snippets POST to `save-prospect` edge function
  - No API connection needed — purely outbound embed
- **Config Schema:**
  ```json
  {
    "embed_forms": [
      { "form_id": "welcome", "embed_code": "string" }
    ]
  }
  ```

#### Canva
- **Type:** `oauth2` (Canva Connect API)
- **Category:** Design
- **Features:**
  - Browse Canva designs from email editor
  - Import design as email template image
- **Priority:** LOW — Canva Connect API has limited availability

#### Zoom
- **Type:** `oauth2` (Zoom OAuth)
- **Category:** Video
- **Features:**
  - Create webinar/meeting links from Plan Hub
  - Registration webhook → create prospect
- **Priority:** MEDIUM

#### Transistor.fm
- **Type:** `api_key`
- **Category:** Podcasts
- **Features:**
  - Fetch episode list for embedding in emails
  - Generate embed player HTML
- **Priority:** LOW

#### WooCommerce
- **Type:** `api_key` (Consumer Key + Consumer Secret)
- **Category:** E-commerce
- **Features:**
  - Same as Shopify but via WooCommerce REST API
  - Webhook registration for `order.completed`, `customer.created`
- **Priority:** MEDIUM

---

## 4. Connection Flows

### 4.1 API Key Flow

```
User clicks "Connect" → Modal opens with:
  - API key input field
  - Link to provider docs for generating key
  - "Test Connection" button
    ↓
Frontend calls `connect-integration` edge function:
  POST { provider, api_key }
    ↓
Edge function:
  1. Validates key against provider API
  2. If valid: stores in user_integrations.credentials_json (encrypted)
  3. Sets status = 'connected', connected_at = now()
  4. Returns { success: true, config_options: {...} }
    ↓
Frontend shows success + config options panel
```

### 4.2 OAuth2 Flow

```
User clicks "Connect" → Frontend calls `connect-integration`:
  POST { provider }
    ↓
Edge function:
  1. Generates state token, stores in DB
  2. Returns { redirect_url: "https://provider.com/oauth/authorize?..." }
    ↓
Frontend redirects to provider OAuth page
    ↓
User authorizes → Provider redirects to:
  /api/integration-callback?code=XXX&state=YYY
    ↓
`integration-callback` edge function:
  1. Validates state token
  2. Exchanges code for access_token + refresh_token
  3. Stores tokens in user_integrations.credentials_json
  4. Sets status = 'connected'
  5. Redirects to /dashboard/integrations?connected=provider
```

### 4.3 Webhook Flow

```
User clicks "Connect" → Frontend calls `connect-integration`:
  POST { provider }
    ↓
Edge function:
  1. Creates user_integrations row
  2. Generates unique webhook URL + HMAC secret
  3. Returns { webhook_url, webhook_secret }
    ↓
Frontend displays webhook URL with "Copy" button
User pastes URL into provider's webhook settings
    ↓
Provider sends POST to webhook URL
    ↓
`integration-webhook` edge function:
  1. Validates HMAC signature
  2. Parses provider-specific payload
  3. Executes mapped action (create prospect, apply tag, etc.)
```

---

## 5. Webhook Processing (`integration-webhook`)

### 5.1 Inbound Payload Handling

```typescript
// Routing logic
switch (provider) {
  case 'zapier':
    // Zapier sends arbitrary JSON — map to actions via config
    break;
  case 'stripe':
    // Verify Stripe signature: Stripe-Signature header
    // Parse event.type → map to action
    break;
  case 'shopify':
    // Verify HMAC: X-Shopify-Hmac-Sha256 header
    // Parse topic from X-Shopify-Topic header
    break;
  case 'calendly':
    // Verify webhook signature
    // Parse event → invitee.created
    break;
}
```

### 5.2 Action Mapping

All webhook events map to one or more internal actions:

| Action | Description | Implementation |
|--------|-------------|----------------|
| `create_prospect` | Upsert into prospects table | Use safeMerge dedup strategy (phone_normalized primary, email secondary) |
| `update_prospect` | Update specific fields | Partial update, never overwrite with nulls |
| `apply_tag` | Add tag to prospect | Create tag if not exists, then insert prospect_tag |
| `remove_tag` | Remove tag from prospect | Delete from prospect_tags |
| `enroll_sequence` | Add to email sequence | Call batch-enroll-sequence edge function |
| `create_meeting` | Add to Plan Hub | Insert into plan_meetings |
| `log_activity` | Record contact activity | Insert into contact_activities |
| `send_notification` | Notify via Slack/email | Call Slack connector or internal notification |

---

## 6. UI Components (To Be Created)

### 6.1 Component Architecture

```
src/components/integrations/
├── IntegrationCard.tsx          # Individual integration card with status
├── IntegrationConnectModal.tsx  # API key input / OAuth redirect trigger
├── IntegrationSettingsModal.tsx # Provider-specific configuration
├── IntegrationStatusBadge.tsx   # Live connection health indicator
├── WebhookURLDisplay.tsx        # Copyable webhook URL with secret
├── IntegrationSyncButton.tsx    # Manual sync trigger with loading state
└── IntegrationEventLog.tsx      # Recent webhook events / sync history
```

### 6.2 Integration Card States

| State | Visual | Badge | Actions Available |
|-------|--------|-------|-------------------|
| `disconnected` | Default card | — | [Connect] |
| `connected` | Green border | ✅ Connected | [Settings] [Sync] [Disconnect] |
| `syncing` | Pulse animation | 🔄 Syncing | [Settings] (disabled sync) |
| `error` | Red border | ❌ Error | [Reconnect] [Settings] [Disconnect] |

### 6.3 Connect Modal Variants

**API Key Modal:**
- Provider logo + name
- API key input (password type, with show/hide toggle)
- Link to provider docs: "Get your API key →"
- [Test Connection] button → validates via edge function
- [Connect] button → stores and activates
- Error state with provider-specific troubleshooting

**OAuth Modal:**
- Provider logo + name
- Permissions/scopes list
- [Authorize with {Provider}] button → redirects
- Callback success/error toast

**Webhook Modal:**
- Provider logo + name
- Generated webhook URL (read-only input with copy button)
- Webhook secret (hidden by default, with reveal toggle)
- Step-by-step instructions for pasting into provider
- [Test Webhook] button → sends test payload

### 6.4 Settings Modal

Per-provider configuration panel:

- **Sync Preferences:** Toggle auto-sync, sync interval
- **Event Mapping:** Which provider events trigger which Zazi Mail actions
- **Tag Mapping:** Default tags to apply on sync
- **Notification Preferences:** Which events trigger Slack/email notifications
- **Webhook URL:** (for webhook-type integrations) Display + regenerate
- **Connection Health:** Last sync time, error count, event count

---

## 7. Data Flow: Provider → Zazi Mail

### 7.1 Stripe Example (Full Flow)

```
Stripe Dashboard: Customer makes purchase
    ↓
Stripe sends POST to integration-webhook:
  { type: "checkout.session.completed", data: { customer_email, line_items, amount } }
    ↓
integration-webhook edge function:
  1. Verify Stripe-Signature header with webhook_signing_secret
  2. Parse event type → checkout.session.completed
  3. Extract: email, name, product names, amount
  4. Upsert prospect (safeMerge): email match, set source='stripe'
  5. Apply tags: ['stripe-customer', 'product-{name}']
  6. Update lead_type → 'Customer'
  7. Log to contact_activities: type='purchase', notes='{product} - R{amount}'
  8. If Slack connected: POST notification to configured channel
  9. If sequence mapped: enroll in welcome-customer sequence
    ↓
Prospect record updated with purchase data + tags
Analytics page reflects new customer conversion
```

### 7.2 Zapier Example (Inbound)

```
Zapier Zap triggers (e.g., Google Sheets new row)
    ↓
Zapier sends POST to integration-webhook:
  { email: "user@example.com", name: "John", source: "google-sheets" }
    ↓
integration-webhook:
  1. Validate X-Zapier-Secret header
  2. Map fields to prospect schema
  3. Upsert prospect with safeMerge
  4. Apply default import tag from config
    ↓
New subscriber appears in Subscribers page
```

---

## 8. Security Considerations

### 8.1 Credential Storage
- API keys and OAuth tokens stored in `credentials_json` column
- Column is **never exposed to frontend** — only accessed via edge functions using service role key
- Frontend only sees: provider name, status, connected_at, last_sync_at, config (non-sensitive)

### 8.2 Webhook Verification
- Every provider webhook MUST be verified before processing:
  - **Stripe:** `Stripe-Signature` header with signing secret
  - **Shopify:** `X-Shopify-Hmac-Sha256` header
  - **Zapier:** Custom `X-Zapier-Secret` header matching stored secret
  - **Calendly:** Webhook signature verification
- Unverified webhooks return `401 Unauthorized`

### 8.3 RLS Policies
- `user_integrations` table uses admin-only RLS (same as other admin tables)
- Webhook edge function uses service role key (bypasses RLS) for prospect upserts
- Frontend queries use authenticated client (admin role required)

### 8.4 Token Refresh
- OAuth integrations must handle token expiry
- `connect-integration` edge function implements refresh logic
- Store `refresh_token` + `expires_at` in credentials_json
- On API call failure (401), attempt refresh before returning error

---

## 9. Event Logging (Future Enhancement)

```sql
CREATE TABLE public.integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id UUID REFERENCES user_integrations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,        -- 'webhook_received', 'sync_completed', 'error', 'action_executed'
  provider TEXT NOT NULL,
  payload_json JSONB DEFAULT '{}',
  action_taken TEXT,               -- 'prospect_created', 'tag_applied', etc.
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

This table enables:
- Debugging failed webhooks
- Audit trail of all integration actions
- "Recent Activity" feed in Integration Settings modal

---

## 10. Implementation Priority

| Phase | Integrations | Effort | Value |
|-------|-------------|--------|-------|
| **Phase 1** | Zapier (webhook) | 1 day | HIGH — connects to 5000+ apps |
| **Phase 2** | Stripe (API key + webhook) | 2 days | HIGH — payment tracking |
| **Phase 3** | Slack (Lovable Connector) | 0.5 day | MEDIUM — notifications |
| **Phase 4** | Calendly (API key + webhook) | 1 day | MEDIUM — meeting sync |
| **Phase 5** | Shopify / WooCommerce | 2 days | MEDIUM — e-commerce sync |
| **Phase 6** | WordPress (embed only) | 0.5 day | LOW — form embed codes |
| **Phase 7** | Google Analytics, Zoom, Canva, Teachable, Transistor | 3-5 days | LOW — nice-to-have |

---

## 11. Environment Variables Required

| Secret | Provider | How to Obtain |
|--------|----------|---------------|
| `STRIPE_WEBHOOK_SECRET` | Stripe | Stripe Dashboard → Webhooks → Signing Secret |
| `SHOPIFY_API_SECRET` | Shopify | Shopify Admin → Apps → API credentials |
| `SLACK_API_KEY` | Slack | Via Lovable Connector (preferred) |
| `CALENDLY_WEBHOOK_SECRET` | Calendly | Calendly Developer Portal |

**Note:** Per-user API keys (e.g., user's Stripe restricted key) are stored in `user_integrations.credentials_json`, NOT as environment variables.

---

## 12. Frontend Integration Points

### 12.1 Existing Pages Affected

| Page | Integration Feature |
|------|-------------------|
| **Subscribers** | Show integration source badge (Stripe, Shopify, Zapier) |
| **Analytics** | Display integration-attributed conversions |
| **Plan Hub** | Auto-created meetings from Calendly |
| **Broadcasts** | Slack notification on send completion |
| **Sequences** | Auto-enrollment from integration events |

### 12.2 API Surface (Frontend → Edge Functions)

```typescript
// Connect
POST /functions/v1/connect-integration
  Body: { provider: string, credentials?: { api_key: string } }
  Response: { success: boolean, redirect_url?: string, webhook_url?: string, config?: object }

// Disconnect
POST /functions/v1/disconnect-integration
  Body: { provider: string }
  Response: { success: boolean }

// Sync
POST /functions/v1/sync-integration
  Body: { provider: string }
  Response: { success: boolean, synced_count: number }

// Get status (via Supabase client)
SELECT * FROM user_integrations WHERE user_id = auth.uid()

// Webhook (external)
POST /functions/v1/integration-webhook?provider={provider}&integration_id={id}
  Headers: Provider-specific signature headers
  Body: Provider-specific payload
```

---

## 13. Testing Strategy

| Test | Method |
|------|--------|
| Webhook signature verification | Unit test with known payloads |
| Prospect upsert from webhook | Integration test with mock Stripe event |
| OAuth callback handling | Manual test with test OAuth app |
| API key validation | Edge function test with invalid/valid keys |
| Deduplication on webhook import | Test with existing prospect email/phone |
| Slack notification delivery | End-to-end with Lovable Connector |

---

## 14. Current File References

| File | Purpose |
|------|---------|
| `src/app/dashboard/integrations/page.tsx` | Main integrations page (UI only, needs backend wiring) |
| `supabase/functions/save-prospect/index.ts` | Existing prospect creation — reuse for integration imports |
| `supabase/functions/batch-enroll-sequence/index.ts` | Existing sequence enrollment — call from webhook handler |
| `src/lib/smart-tagging.ts` | Existing smart tagging rules — apply during integration imports |

---

© 2026 Vanto. All rights reserved.
