// Vanto Zazi Mail ("Get Well Mail") — standalone MCP server
// Connects Claude to the app via a locked-down Supabase Edge Function
// ("mcp-bridge") instead of a direct database connection.
// Mirrors the architecture of Vantovant/getwellhub-mcp and the Vanto Zazi
// CRM ("Get Well Grow") mcp-server.
//
// AUTH NOTE: claude.ai's custom-connector UI (on personal/non-Team plans)
// only supports OAuth — there is no field to enter a raw Bearer token or
// custom header. So this file also implements a minimal, self-contained
// OAuth 2.0 authorization-code + PKCE flow. There is no separate user
// database: the "password" on the /authorize consent screen IS your
// existing MCP_API_KEY. Once you type it in once, Claude stores the
// resulting token and reuses it — you won't need to log in again.

import crypto from "crypto";
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Configuration (set these as environment variables wherever you host this)
// ---------------------------------------------------------------------------
const BRIDGE_URL = "https://wwuenmmocxtwwgylngui.supabase.co/functions/v1/mcp-bridge";
const BRIDGE_TOKEN = process.env.MCP_BRIDGE_TOKEN; // must match the mcp-bridge edge function's MCP_BRIDGE_TOKEN secret
const MCP_API_KEY = process.env.MCP_API_KEY;       // shared secret you invent, protects THIS server
const PORT = process.env.PORT || 3000;

if (!BRIDGE_TOKEN) {
  console.error("Missing MCP_BRIDGE_TOKEN environment variable. Set it to match the mcp-bridge edge function secret.");
  process.exit(1);
}
if (!MCP_API_KEY) {
  console.error("Missing MCP_API_KEY environment variable. Set any secret string you choose.");
  process.exit(1);
}

async function callBridge(action, payload = {}) {
  const res = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-mcp-token": BRIDGE_TOKEN,
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || data?.error || `Bridge call failed with status ${res.status}`);
  }
  return data;
}

// ---------------------------------------------------------------------------
// Minimal OAuth 2.0 authorization server (authorization_code + PKCE, S256)
// No user accounts — the single "password" is MCP_API_KEY. Access tokens are
// self-signed (HMAC using MCP_API_KEY as the secret) so they survive server
// restarts without needing a database. Only in-flight authorization codes
// and registered client_ids live in memory (a restart mid-login just means
// clicking "Connect" again in Claude).
// ---------------------------------------------------------------------------
const codeStore = new Map();   // code -> { clientId, redirectUri, codeChallenge, expiresAt }
const clientStore = new Map(); // clientId -> { redirectUris }

function getBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  return `${proto}://${host}`;
}
function b64url(input) {
  return Buffer.from(input).toString("base64url");
}
function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}
function issueAccessToken(clientId) {
  const payload = { cid: clientId, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body, MCP_API_KEY)}`;
}
function verifyAccessToken(token) {
  const [body, sig] = String(token).split(".");
  if (!body || !sig) return null;
  const expected = sign(body, MCP_API_KEY);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
function pkceVerify(codeVerifier, codeChallenge) {
  if (!codeVerifier || !codeChallenge) return false;
  const hash = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  return hash === codeChallenge;
}

// ---------------------------------------------------------------------------
// MCP server + tools
// Deliberately read-mostly / safety-scoped for this first version:
//   - No broadcast send/schedule capability exposed.
//   - No automation/sequence trigger capability.
//   - No delete of any kind.
//   - update_prospect only ever touches fields explicitly provided; email is
//     not editable here (identity/matching field).
//   - add_contact_note is strictly additive.
// ---------------------------------------------------------------------------
function buildServer() {
  const server = new McpServer({
    name: "vanto-zazi-mail-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "list_prospects",
    {
      title: "List subscribers/prospects",
      description:
        "Read Vanto Zazi Mail subscribers (prospects table), optionally filtered by " +
        "contact_type, lead_type, lead_temperature, unsubscribed status, or free-text " +
        "search on name/email. Returns up to 100. Read-only.",
      inputSchema: {
        contact_type: z.string().optional().describe("Filter by contact type, e.g. subscriber, customer"),
        lead_type: z.string().optional().describe("Filter by lead type"),
        lead_temperature: z.string().optional().describe("Filter by temperature, e.g. hot, warm, cold"),
        unsubscribed: z.boolean().optional().describe("Filter by unsubscribed status"),
        search: z.string().optional().describe("Free-text search on name or email"),
        limit: z.number().int().positive().max(100).optional().describe("Max results, default 25, max 100"),
      },
    },
    async (args) => {
      const data = await callBridge("list_prospects", args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_prospect",
    {
      title: "Get a single subscriber/prospect",
      description:
        "Full detail for one prospect by id or email, plus their last 10 activity log " +
        "entries and last 10 email events (sent/opened/clicked/bounced/etc). Read-only.",
      inputSchema: {
        prospect_id: z.string().optional().describe("UUID of the prospect"),
        email: z.string().optional().describe("Email address of the prospect"),
      },
    },
    async (args) => {
      const data = await callBridge("get_prospect", args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "update_prospect",
    {
      title: "Update a subscriber/prospect",
      description:
        "Edit specific fields on a prospect. Only the fields you provide are changed " +
        "— everything else is left untouched. Email is intentionally not editable here " +
        "(identity/matching field used by hub sync and unsubscribe lookups).",
      inputSchema: {
        prospect_id: z.string().describe("UUID of the prospect to update"),
        full_name: z.string().optional(),
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        contact_type: z.string().optional(),
        lead_type: z.string().optional(),
        lead_temperature: z.string().optional().describe("e.g. hot, warm, cold"),
        unsubscribed: z.boolean().optional(),
        consent_marketing: z.boolean().optional(),
      },
    },
    async (args) => {
      const data = await callBridge("update_prospect", args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "add_contact_note",
    {
      title: "Log an activity / note for a prospect",
      description:
        "Append a new entry to a prospect's activity timeline (contact_activities " +
        "table). Strictly additive — never edits or removes existing activity entries.",
      inputSchema: {
        prospect_id: z.string().describe("UUID of the prospect"),
        note: z.string().describe("The note/activity text to log"),
      },
    },
    async (args) => {
      const data = await callBridge("add_contact_note", args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "list_broadcasts",
    {
      title: "List email broadcasts/campaigns",
      description:
        "Read email broadcasts, optionally filtered by status (draft/scheduled/sending/" +
        "sent/failed) or brand. Returns up to 100 with delivery stats. Read-only — " +
        "creating or sending broadcasts is not exposed via MCP.",
      inputSchema: {
        status: z.string().optional().describe("Filter by status, e.g. draft, scheduled, sent, failed"),
        brand: z.string().optional().describe("Filter by brand, e.g. vanto, aplgo"),
        limit: z.number().int().positive().max(100).optional().describe("Max results, default 25, max 100"),
      },
    },
    async (args) => {
      const data = await callBridge("list_broadcasts", args);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.registerTool(
    "get_analytics_summary",
    {
      title: "Get email performance analytics summary",
      description:
        "Aggregate subscriber and email performance metrics: total subscribers, " +
        "unsubscribed count, event counts (sent/delivered/opened/clicked/bounced/" +
        "complained), and open/click/bounce rates. Read-only, mirrors the in-app " +
        "Analytics page.",
      inputSchema: {},
    },
    async () => {
      const data = await callBridge("get_analytics_summary");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  return server;
}

// ---------------------------------------------------------------------------
// HTTP app
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- OAuth discovery documents ---
app.get("/.well-known/oauth-authorization-server", (req, res) => {
  const base = getBaseUrl(req);
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/authorize`,
    token_endpoint: `${base}/token`,
    registration_endpoint: `${base}/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
});

app.get("/.well-known/oauth-protected-resource", (req, res) => {
  const base = getBaseUrl(req);
  res.json({
    resource: `${base}/mcp`,
    authorization_servers: [base],
  });
});

// --- Dynamic client registration (RFC 7591) ---
app.post("/register", (req, res) => {
  const clientId = crypto.randomUUID();
  const redirectUris = req.body?.redirect_uris || [];
  clientStore.set(clientId, { redirectUris });
  res.status(201).json({
    client_id: clientId,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    redirect_uris: redirectUris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code"],
    response_types: ["code"],
  });
});

// --- Authorization endpoint: simple "type your API key" consent screen ---
app.get("/authorize", (req, res) => {
  const { response_type, client_id, redirect_uri, state, code_challenge, code_challenge_method } = req.query;
  if (response_type !== "code" || !client_id || !redirect_uri || !code_challenge) {
    return res.status(400).send("Invalid authorization request.");
  }
  res.send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Authorize Claude — Vanto Zazi Mail</title></head>
<body style="font-family: system-ui, sans-serif; max-width: 420px; margin: 80px auto; color: #222;">
  <h2>Authorize Claude</h2>
  <p>Enter your Vanto Zazi Mail <code>MCP_API_KEY</code> to let Claude connect.</p>
  <form method="POST" action="/authorize">
    <input type="hidden" name="client_id" value="${client_id}" />
    <input type="hidden" name="redirect_uri" value="${redirect_uri}" />
    <input type="hidden" name="state" value="${state ?? ""}" />
    <input type="hidden" name="code_challenge" value="${code_challenge}" />
    <input type="hidden" name="code_challenge_method" value="${code_challenge_method ?? "S256"}" />
    <input type="password" name="api_key" placeholder="Your MCP_API_KEY" required
      style="width:100%; padding:10px; margin:16px 0; box-sizing:border-box; font-size:16px;" />
    <button type="submit" style="padding:10px 20px; font-size:16px; cursor:pointer;">Authorize</button>
  </form>
</body></html>`);
});

app.post("/authorize", (req, res) => {
  const { client_id, redirect_uri, state, code_challenge, code_challenge_method, api_key } = req.body;
  if (api_key !== MCP_API_KEY) {
    return res.status(401).send("Incorrect API key. Go back in your browser and try again.");
  }
  const code = crypto.randomUUID();
  codeStore.set(code, {
    clientId: client_id,
    redirectUri: redirect_uri,
    codeChallenge: code_challenge,
    codeChallengeMethod: code_challenge_method || "S256",
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  const url = new URL(redirect_uri);
  url.searchParams.set("code", code);
  if (state) url.searchParams.set("state", state);
  res.redirect(url.toString());
});

// --- Token endpoint ---
app.post("/token", (req, res) => {
  const { grant_type, code, redirect_uri, code_verifier } = req.body;
  if (grant_type !== "authorization_code") {
    return res.status(400).json({ error: "unsupported_grant_type" });
  }
  const entry = codeStore.get(code);
  if (!entry || entry.expiresAt < Date.now()) {
    return res.status(400).json({ error: "invalid_grant", error_description: "Code expired or unknown — please authorize again." });
  }
  if (entry.redirectUri !== redirect_uri) {
    return res.status(400).json({ error: "invalid_grant", error_description: "redirect_uri mismatch" });
  }
  if (!pkceVerify(code_verifier, entry.codeChallenge)) {
    return res.status(400).json({ error: "invalid_grant", error_description: "PKCE verification failed" });
  }
  codeStore.delete(code);
  res.json({
    access_token: issueAccessToken(entry.clientId),
    token_type: "Bearer",
    expires_in: 60 * 60 * 24 * 365,
  });
});

// --- MCP endpoint: accepts either the raw MCP_API_KEY (for curl/testing) or
//     a valid self-issued OAuth access token (for Claude's connector) ---
app.post("/mcp", async (req, res) => {
  const auth = req.headers["authorization"];
  const queryKey = req.query.key;

  let authorized = auth === `Bearer ${MCP_API_KEY}` || queryKey === MCP_API_KEY;
  if (!authorized && auth?.startsWith("Bearer ")) {
    authorized = !!verifyAccessToken(auth.slice(7));
  }
  if (!authorized) {
    res.set("WWW-Authenticate", `Bearer resource_metadata="${getBaseUrl(req)}/.well-known/oauth-protected-resource"`);
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const server = buildServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
    });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("MCP request error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Vanto Zazi Mail MCP server listening on port ${PORT}`);
});
