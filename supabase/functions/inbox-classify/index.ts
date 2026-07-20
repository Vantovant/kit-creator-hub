// ============================================================
// ZAZI MAIL INBOX — AI Classifier + Auto-Router (Phase 3)
// ============================================================
// POST { message_id }
// 1. Loads inbox_messages row
// 2. Matches against inbox_registration_rules (fast path, high confidence)
// 3. Falls back to Lovable AI (openai/gpt-5.5) for classification + entity extraction
// 4. Writes inbox_extracts
// 5. Auto-acts when confidence >= rule.min_confidence:
//    - registration -> save-prospect (with sequence_id) + inbox_action_log(enrolled)
//    - reply        -> tag Replied_YYYY_MM + create plan_tasks + inbox_action_log(tagged/task_created)
// 6. Otherwise leaves suggested_actions_json for UI confirm.
// ============================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function matchesRule(msg: any, rule: any): boolean {
  const from = String(msg.sender || "").toLowerCase();
  const subject = String(msg.subject || "").toLowerCase();
  const body = String(msg.body_preview || msg.snippet || "").toLowerCase();
  const tests: boolean[] = [];
  if (rule.from_pattern) tests.push(from.includes(String(rule.from_pattern).toLowerCase()));
  if (rule.subject_pattern) tests.push(subject.includes(String(rule.subject_pattern).toLowerCase()));
  if (rule.body_pattern) tests.push(body.includes(String(rule.body_pattern).toLowerCase()));
  return tests.length > 0 && tests.every(Boolean);
}

async function aiClassify(msg: any, lovableKey: string) {
  const prompt = `You classify inbound Gmail messages for a CRM.
Return STRICT JSON: {"type":"registration|reply|general","confidence":0.0-1.0,"summary":"1 line","entities":{"email":"","first_name":"","phone":"","level":"","intent":""}}
- "registration" = a system/business notification that a new person signed up, registered, ordered, or joined.
- "reply" = a human replying to a prior conversation (interest, question, objection, unsubscribe request).
- "general" = anything else (newsletter, receipt, spam).

FROM: ${msg.sender}
SUBJECT: ${msg.subject}
BODY: ${(msg.body_preview || msg.snippet || "").slice(0, 1200)}`;

  const r = await fetch(AI_URL, {
    method: "POST",
    headers: { "Lovable-API-Key": lovableKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-5.5",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    }),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`AI ${r.status}: ${text}`);
  const parsed = JSON.parse(text);
  return JSON.parse(parsed.choices[0].message.content);
}

async function ensureTag(supabase: any, name: string): Promise<string> {
  const { data: existing } = await supabase.from("tags").select("id").eq("name", name).maybeSingle();
  if (existing) return existing.id;
  const { data: created } = await supabase.from("tags").insert({ name, color: "#3b82f6" }).select("id").single();
  return created.id;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (!lovableKey) return json({ error: "missing LOVABLE_API_KEY" }, 500);

  let payload: any = {};
  try { payload = await req.json(); } catch { /* */ }
  const messageId = payload?.message_id;
  if (!messageId) return json({ error: "message_id required" }, 400);

  const { data: msg, error: msgErr } = await supabase
    .from("inbox_messages").select("*").eq("id", messageId).maybeSingle();
  if (msgErr || !msg) return json({ error: "message_not_found" }, 404);

  const actions: string[] = [];

  // Load user rules
  const { data: rules } = await supabase
    .from("inbox_registration_rules")
    .select("*")
    .eq("user_id", msg.user_id)
    .eq("is_active", true)
    .order("priority", { ascending: true });

  let detected_type: "registration" | "reply" | "general" = "general";
  let confidence = 0;
  let summary = "";
  let entities: Record<string, any> = {};
  let matchedRule: any = null;

  // 1) Rule fast-path
  for (const rule of (rules || [])) {
    if (matchesRule(msg, rule)) {
      matchedRule = rule;
      detected_type = "registration";
      confidence = Math.max(Number(rule.min_confidence) || 0.85, 0.9);
      summary = `Matched rule: ${rule.rule_name}`;
      entities = { email: msg.sender, from_rule: rule.rule_name };
      break;
    }
  }

  // 2) AI fallback if no rule
  if (!matchedRule) {
    try {
      const ai = await aiClassify(msg, lovableKey);
      detected_type = (ai.type || "general").toLowerCase();
      confidence = Number(ai.confidence) || 0;
      summary = ai.summary || "";
      entities = ai.entities || {};
    } catch (e: any) {
      summary = `ai_error: ${e.message}`;
    }
  }

  // Suggested actions (always attached, whether auto-acted or not)
  const suggested: any[] = [];
  if (detected_type === "registration") {
    suggested.push({
      kind: "enroll_sequence",
      label: matchedRule ? `Enroll in "${matchedRule.rule_name}" sequence` : "Enroll in a sequence",
      sequence_id: matchedRule?.sequence_id || null,
      tag: matchedRule?.default_tag || null,
    });
  } else if (detected_type === "reply") {
    suggested.push({ kind: "tag_reply", label: `Tag Replied_${new Date().toISOString().slice(0, 7).replace("-", "_")}` });
    suggested.push({ kind: "create_task", label: `Create Plan task for this reply` });
  }

  const { data: extract } = await supabase
    .from("inbox_extracts")
    .upsert({
      user_id: msg.user_id,
      message_id: msg.id,
      detected_type,
      confidence,
      summary,
      entities_json: entities,
      suggested_actions_json: suggested,
      requires_user_confirmation: confidence < 0.85,
      prompt_version: "phase3-v1",
    }, { onConflict: "message_id" })
    .select("*")
    .single();

  // 3) Auto-actions when confidence >= threshold
  const threshold = matchedRule ? Number(matchedRule.min_confidence) : 0.85;
  const canAct = confidence >= threshold;

  if (canAct && detected_type === "registration") {
    try {
      const email = String(entities.email || msg.sender).toLowerCase();
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const spRes = await fetch(`${supabaseUrl}/functions/v1/save-prospect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": anonKey },
        body: JSON.stringify({
          email,
          first_name: entities.first_name || null,
          source: matchedRule?.rule_name || "inbox_ai_registration",
          sequence_id: matchedRule?.sequence_id || null,
          phone_number: entities.phone || null,
          additional_notes: `Auto-enrolled from Gmail: ${msg.subject}`,
        }),
      });
      const spBody = await spRes.text();
      await supabase.from("inbox_action_log").insert({
        user_id: msg.user_id,
        message_id: msg.id,
        action_type: "enrolled",
        action_data: { rule: matchedRule?.rule_name || null, sequence_id: matchedRule?.sequence_id || null, response: spBody.slice(0, 500) },
      });
      actions.push("enrolled");
    } catch (e: any) {
      actions.push(`enroll_failed:${e.message}`);
    }
  }

  if (canAct && detected_type === "reply" && msg.prospect_id) {
    try {
      const tagName = `Replied_${new Date().toISOString().slice(0, 7).replace("-", "_")}`;
      const tagId = await ensureTag(supabase, tagName);
      await supabase.from("prospect_tags").upsert(
        { prospect_id: msg.prospect_id, tag_id: tagId },
        { onConflict: "prospect_id, tag_id", ignoreDuplicates: true },
      );
      await supabase.from("plan_tasks").insert({
        user_id: msg.user_id,
        title: `Reply from ${msg.sender_name || msg.sender}: ${msg.subject || "(no subject)"}`,
        description: `${summary}\n\n${(msg.body_preview || msg.snippet || "").slice(0, 300)}`,
        source: "inbox_reply",
        priority: "high",
      });
      await supabase.from("inbox_action_log").insert({
        user_id: msg.user_id,
        message_id: msg.id,
        action_type: "tagged",
        action_data: { tag: tagName },
      });
      await supabase.from("inbox_action_log").insert({
        user_id: msg.user_id,
        message_id: msg.id,
        action_type: "task_created",
        action_data: { title: msg.subject },
      });
      actions.push("tagged", "task_created");
    } catch (e: any) {
      actions.push(`reply_route_failed:${e.message}`);
    }
  }

  // Persist inferred category/intent on the message for UI badges
  await supabase.from("inbox_messages").update({
    category: detected_type,
    intent: entities.intent || null,
    urgency: canAct ? "auto" : "review",
  }).eq("id", msg.id);

  return json({ ok: true, extract, actions, canAct, confidence, detected_type });
});
