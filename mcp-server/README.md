# Vanto Zazi Mail MCP Server ("Get Well Mail")

Standalone MCP server that connects Claude to Vanto Zazi Mail via a locked-down
Supabase Edge Function bridge (`supabase/functions/mcp-bridge`). No Lovable
tokens or direct database credentials are used by this server — it only holds
a shared secret (`MCP_BRIDGE_TOKEN`) that the bridge itself verifies.

## Architecture

```
Claude (custom connector) --HTTPS--> mcp-server (Railway, this folder)
                                          --HTTPS + x-mcp-token--> mcp-bridge (Supabase Edge Function)
                                                                       --service role--> Postgres
```

## Setup

1. Deploy `supabase/functions/mcp-bridge` to your Supabase project (via Lovable,
   so it actually redeploys — see the root README / technical report for why a
   plain `git push` alone is not enough).
2. Set these secrets on the **mcp-bridge** Supabase function:
   - `MCP_BRIDGE_TOKEN` — any strong random string you generate
   - `DEFAULT_OWNER_EMAIL` — the email of the auth user notes should be attributed to
   - Ensure `supabase/config.toml` has `[functions.mcp-bridge]` with `verify_jwt = false`
     (this function authenticates via `x-mcp-token`, not a Supabase user JWT)
3. Deploy this `mcp-server/` folder to Railway with **Root Directory** set to `mcp-server`.
4. Set these environment variables on the Railway service:
   - `MCP_BRIDGE_TOKEN` — must match the value set on the Supabase function
   - `MCP_API_KEY` — any strong random string you generate, protects this server
5. Add a custom connector in Claude pointing at `https://<your-railway-app>.up.railway.app/mcp`
   with header `Authorization: Bearer <MCP_API_KEY>`.

## Tools exposed

| Tool | Behavior | Safeguard |
|---|---|---|
| `list_prospects` | Filter subscribers by contact_type, lead_type, lead_temperature, unsubscribed, or free-text search. Up to 100. | Read-only |
| `get_prospect` | Full detail by id or email, plus last 10 activity entries and last 10 email events. | Read-only |
| `update_prospect` | Edit name, contact_type, lead_type, lead_temperature, unsubscribed, consent_marketing. | Only provided fields change; email intentionally excluded |
| `add_contact_note` | Append a timestamped entry to `contact_activities`. | Strictly additive, never overwrites |
| `list_broadcasts` | Filter campaigns by status or brand, with delivery stats. | Read-only — no send/schedule capability |
| `get_analytics_summary` | Aggregate subscriber + email performance metrics. | Read-only |

**Deliberately excluded from this first version:** any broadcast send/schedule
capability, automation/sequence triggering, and all deletes — sending stays
behind the app's own admin-role check in `send-broadcast`, not this bridge.
