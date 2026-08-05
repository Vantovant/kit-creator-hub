// Vanto Zazi Mail ("Get Well Mail") — standalone MCP server
// Connects Claude to the app via a locked-down Supabase Edge Function
// ("mcp-bridge") instead of a direct database connection.
// Mirrors the architecture of Vantovant/getwellhub-mcp and the Vanto Zazi
// CRM ("Get Well Grow") mcp-server.

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
// MCP server + tools
// Deliberately read-mostly / safety-scoped for this first version:
//   - No broadcast send/schedule capability exposed (sending real email to
//     the full subscriber list stays behind the app's own admin-role check
//     in send-broadcast, not this bridge).
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
// HTTP transport (stateless streamable HTTP, one server instance per request)
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const auth = req.headers["authorization"];
  const queryKey = req.query.key;
  const authorized =
    auth === `Bearer ${MCP_API_KEY}` || queryKey === MCP_API_KEY;
  if (!authorized) {
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
