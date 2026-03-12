import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// All known prospect fields
const KNOWN_FIELDS = [
  "email", "first_name", "full_name", "phone_number", "phone_normalized",
  "email_normalized", "source", "lead_type", "registration_status",
  "go_status", "associate_status", "communication_status", "lead_temperature",
  "city", "province", "state", "country", "date_captured", "interest_level",
  "focus_area", "lead_path", "sponsor_name", "assigned_to", "action_taken",
  "next_action", "meeting_time", "aplgo_id", "additional_notes", "tags",
];

// CRM-specific fields that indicate a CRM export
const CRM_FIELDS = [
  "lead_type", "registration_status", "go_status", "associate_status",
  "communication_status", "lead_temperature", "aplgo_id", "sponsor_name",
  "lead_path", "focus_area", "interest_level",
];

// Fuzzy mapping rules
const FUZZY_MAP: Record<string, string> = {
  "emailaddress": "email", "email_address": "email", "e-mail": "email", "mail": "email",
  "name": "full_name", "fullname": "full_name", "full_name": "full_name", "contact_name": "full_name",
  "firstname": "first_name", "first": "first_name", "fname": "first_name",
  "phone": "phone_number", "tel": "phone_number", "telephone": "phone_number",
  "mobile": "phone_number", "cell": "phone_number", "cellphone": "phone_number",
  "cell_number": "phone_number", "phone_no": "phone_number", "contact_number": "phone_number",
  "leadtype": "lead_type", "lead": "lead_type", "type": "lead_type",
  "registrationstatus": "registration_status", "reg_status": "registration_status",
  "gostatus": "go_status", "go": "go_status",
  "associatestatus": "associate_status", "associate": "associate_status",
  "communicationstatus": "communication_status", "comm_status": "communication_status",
  "temperature": "lead_temperature", "temp": "lead_temperature",
  "town": "city", "location": "city",
  "region": "province", "prov": "province",
  "date": "date_captured", "datecaptured": "date_captured", "capture_date": "date_captured",
  "captured": "date_captured", "signup_date": "date_captured", "created": "date_captured",
  "interest": "interest_level",
  "area": "focus_area", "focusarea": "focus_area",
  "path": "lead_path", "leadpath": "lead_path",
  "sponsor": "sponsor_name", "referrer": "sponsor_name", "referred_by": "sponsor_name",
  "assigned": "assigned_to", "owner": "assigned_to", "agent": "assigned_to",
  "action": "action_taken", "actiontaken": "action_taken",
  "nextaction": "next_action", "next_step": "next_action", "follow_up": "next_action",
  "meetingtime": "meeting_time", "meeting": "meeting_time", "meeting_date": "meeting_time",
  "aplgoid": "aplgo_id", "aplgo": "aplgo_id", "member_id": "aplgo_id",
  "notes": "additional_notes", "comment": "additional_notes", "comments": "additional_notes",
  "tag": "tags", "labels": "tags",
  "src": "source", "origin": "source", "channel": "source",
};

function fallbackMapping(headers: string[]): { mapping: Record<string, string>; context: string } {
  const mapping: Record<string, string> = {};
  let crmFieldCount = 0;

  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[^a-z0-9_]/g, "").trim();
    
    // Direct match
    if (KNOWN_FIELDS.includes(normalized)) {
      mapping[header] = normalized;
      if (CRM_FIELDS.includes(normalized)) crmFieldCount++;
      continue;
    }

    // Fuzzy match
    const fuzzy = FUZZY_MAP[normalized];
    if (fuzzy) {
      mapping[header] = fuzzy;
      if (CRM_FIELDS.includes(fuzzy)) crmFieldCount++;
      continue;
    }

    // Partial match
    for (const known of KNOWN_FIELDS) {
      if (normalized.includes(known) || known.includes(normalized)) {
        mapping[header] = known;
        if (CRM_FIELDS.includes(known)) crmFieldCount++;
        break;
      }
    }
  }

  const context = crmFieldCount >= 3 ? "crm_export" : "standard_email_list";
  return { mapping, context };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { headers, sample_rows } = await req.json();
    if (!headers || !Array.isArray(headers)) {
      throw new Error("headers array required");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    let mapping: Record<string, string> = {};
    let context = "standard_email_list";
    let confidence = "high";
    let method = "fallback";

    // Try AI mapping first
    if (LOVABLE_API_KEY) {
      try {
        const prompt = `You are a data mapping assistant. Given spreadsheet column headers and sample data, map each header to the correct database field.

Database fields: ${KNOWN_FIELDS.join(", ")}

CRM-specific fields: ${CRM_FIELDS.join(", ")}

Headers: ${JSON.stringify(headers)}
Sample rows: ${JSON.stringify((sample_rows || []).slice(0, 3))}

Determine if this is a "crm_export" (has 3+ CRM-specific fields) or "standard_email_list".

Return JSON only:
{
  "mapping": {"OriginalHeader": "database_field", ...},
  "context": "crm_export" | "standard_email_list",
  "confidence": "high" | "medium" | "low"
}

Rules:
- Only map to known fields listed above
- If a header doesn't match any field, skip it
- "name" or "fullname" → "full_name" (NOT "first_name")
- Phone columns → "phone_number"
- Email columns → "email"`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You return only valid JSON. No markdown, no explanation." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const raw = data.choices?.[0]?.message?.content || "";
          const jsonMatch = raw.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            mapping = parsed.mapping || {};
            context = parsed.context || "standard_email_list";
            confidence = parsed.confidence || "medium";
            method = "ai";
          }
        }
      } catch (aiErr) {
        console.error("AI mapping failed, using fallback:", aiErr);
      }
    }

    // Fallback if AI didn't produce results
    if (Object.keys(mapping).length === 0) {
      const fb = fallbackMapping(headers);
      mapping = fb.mapping;
      context = fb.context;
      confidence = "medium";
      method = "fallback";
    }

    return new Response(JSON.stringify({ mapping, context, confidence, method }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("smart-import error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
