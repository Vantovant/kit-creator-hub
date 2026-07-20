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

// Robot / no-reply senders — never link the sender itself as a contact.
// Instead, extract the enrollee/subject named in the body.
const ROBOT_PATTERNS = [
  /^robot@/i,
  /^no-?reply@/i,
  /^donotreply@/i,
  /^notifications?@/i,
  /^mailer-daemon@/i,
  /^postmaster@/i,
  /^system@/i,
  /^bounce@/i,
];
function isRobotSender(email: string) {
  return ROBOT_PATTERNS.some((r) => r.test(String(email || "")));
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function messageBody(msg: any): string {
  const text = String(msg.body_text || "").trim();
  const htmlText = msg.body_html ? stripHtml(msg.body_html) : "";
  const textLooksLikeFallback = /^this is the body in plain text for non-html mail clients\.?$/i.test(text);
  if (htmlText && (textLooksLikeFallback || htmlText.length > text.length)) return htmlText;
  return String(text || htmlText || msg.body_preview || msg.snippet || "");
}

function matchesRule(msg: any, rule: any): boolean {
  const from = String(msg.sender || "").toLowerCase();
  const subject = String(msg.subject || "").toLowerCase();
  const body = messageBody(msg).toLowerCase();
  const tests: boolean[] = [];
  if (rule.from_pattern) tests.push(from.includes(String(rule.from_pattern).toLowerCase()));
  if (rule.subject_pattern) tests.push(subject.includes(String(rule.subject_pattern).toLowerCase()));
  if (rule.body_pattern) tests.push(body.includes(String(rule.body_pattern).toLowerCase()));
  return tests.length > 0 && tests.every(Boolean);
}


async function aiClassify(msg: any, lovableKey: string) {
  const robot = isRobotSender(msg.sender);
  const body = messageBody(msg);
  const prompt = `You classify inbound Gmail messages for a CRM.
Return STRICT JSON:
{"type":"registration|reply|general","confidence":0.0-1.0,"summary":"1 line","entities":{"email":"","first_name":"","phone":"","level":"","intent":"","enrollee_name":"","enrollee_id":""}}

- "registration" = a system/business notification that a NEW person signed up, registered, ordered, or joined. If the sender is a robot/system, the enrollee is NOT the sender — extract the newly-enrolled person's name & ID from the body into entities.enrollee_name / entities.enrollee_id (do NOT put the robot email in entities.email).
- "reply" = a human replying to a prior conversation (interest, question, objection, unsubscribe request).
- "general" = anything else (newsletter, receipt, spam).

SENDER_IS_ROBOT: ${robot}
FROM: ${msg.sender}
SUBJECT: ${msg.subject}
BODY: ${body.slice(0, 5000)}`;

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

  const senderIsRobot = isRobotSender(msg.sender);

  // Suggested actions (always attached, whether auto-acted or not)
  const suggested: any[] = [];
  if (detected_type === "registration") {
    const enrolleeName = entities.enrollee_name || entities.first_name || null;
    const label = enrolleeName
      ? `Enroll ${enrolleeName} in "${matchedRule?.rule_name || "sequence"}"`
      : (matchedRule ? `Enroll in "${matchedRule.rule_name}" sequence` : "Enroll in a sequence");
    suggested.push({
      kind: "enroll_sequence",
      label,
      sequence_id: matchedRule?.sequence_id || null,
      tag: matchedRule?.default_tag || "new_enrollment",
    });
  } else if (detected_type === "reply") {
    suggested.push({ kind: "tag_reply", label: `Tag Replied_${new Date().toISOString().slice(0, 7).replace("-", "_")}` });
    suggested.push({ kind: "create_task", label: `Create Plan task for this reply` });
  }
  if (!senderIsRobot && !msg.prospect_id) {
    suggested.push({ kind: "add_contact", label: `Add ${msg.sender_name || msg.sender} to contacts` });
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
      prompt_version: "phase5-v1",
    }, { onConflict: "message_id" })
    .select("*")
    .single();

  // 3) Auto-actions when confidence >= threshold
  const threshold = matchedRule ? Number(matchedRule.min_confidence) : 0.85;
  const canAct = confidence >= threshold;

  if (canAct && detected_type === "registration") {
    try {
      const enrolleeName = entities.enrollee_name || entities.first_name || null;
      const enrolleeId = entities.enrollee_id || null;
      let enrolleeEmail = entities.email && !isRobotSender(entities.email)
        ? String(entities.email).toLowerCase()
        : null;

      // Robot enrollments: only Name + APLGO ID are trustworthy.
      // Do NOT invent phone/email — mark needs_enrichment so UI nudges the user.
      const enrolleePhone = senderIsRobot ? null : (entities.phone || null);
      const needsEnrichment = senderIsRobot && !enrolleeEmail;

      if (senderIsRobot && !enrolleeEmail) {
        const slug = enrolleeId
          ? `id-${enrolleeId}`
          : (enrolleeName ? enrolleeName.toLowerCase().replace(/[^a-z0-9]+/g, "-") : `unknown-${msg.id.slice(0,8)}`);
        enrolleeEmail = `${slug}@aplgo.enrollment.pending`;
      } else if (!enrolleeEmail) {
        enrolleeEmail = String(msg.sender).toLowerCase();
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const spRes = await fetch(`${supabaseUrl}/functions/v1/save-prospect`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "apikey": anonKey },
        body: JSON.stringify({
          email: enrolleeEmail,
          first_name: enrolleeName,
          source: matchedRule?.rule_name || (senderIsRobot ? "aplgo_new_enrollment" : "inbox_ai_registration"),
          sequence_id: matchedRule?.sequence_id || null,
          phone_number: enrolleePhone,
          aplgo_id: enrolleeId,
          needs_enrichment: needsEnrichment,
          additional_notes: `Auto-enrolled from Gmail: ${msg.subject}${enrolleeId ? ` (ID ${enrolleeId})` : ""}`,
        }),
      });
      const spBody = await spRes.text();

      // Also apply a "new_enrollment" tag when we have a prospect id in the response
      try {
        const parsed = JSON.parse(spBody);
        const pid = parsed?.prospect?.id || parsed?.id;
        if (pid) {
          const tagId = await ensureTag(supabase, "new_enrollment");
          await supabase.from("prospect_tags").upsert(
            { prospect_id: pid, tag_id: tagId },
            { onConflict: "prospect_id, tag_id", ignoreDuplicates: true },
          );
        }
      } catch { /* ignore */ }

      await supabase.from("inbox_action_log").insert({
        user_id: msg.user_id,
        message_id: msg.id,
        action_type: "enrolled",
        action_data: {
          rule: matchedRule?.rule_name || null,
          sequence_id: matchedRule?.sequence_id || null,
          enrollee_email: enrolleeEmail,
          enrollee_name: enrolleeName,
          enrollee_id: enrolleeId,
          sender_is_robot: senderIsRobot,
          response: spBody.slice(0, 500),
        },
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
        description: `${summary}\n\n${messageBody(msg).slice(0, 300)}`,
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
