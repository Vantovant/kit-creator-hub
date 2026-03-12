/**
 * Parse a CSV string into an array of objects.
 * Handles quoted fields containing commas.
 * Supports CRM export fields alongside standard email fields.
 */
export interface ParsedSubscriber {
  email: string;
  first_name?: string;
  full_name?: string;
  phone_number?: string;
  source?: string;
  tags?: string[];
  // CRM fields
  lead_type?: string;
  registration_status?: string;
  go_status?: string;
  associate_status?: string;
  communication_status?: string;
  lead_temperature?: string;
  city?: string;
  province?: string;
  state?: string;
  country?: string;
  date_captured?: string;
  interest_level?: string;
  focus_area?: string;
  lead_path?: string;
  sponsor_name?: string;
  assigned_to?: string;
  action_taken?: string;
  next_action?: string;
  meeting_time?: string;
  aplgo_id?: string;
  additional_notes?: string;
  // Raw row for dynamic mapping
  [key: string]: string | string[] | undefined;
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalize a South African phone number to E.164 format.
 * e.g., "082 123 4567" → "+27821234567", "0821234567" → "+27821234567"
 */
export function normalizePhone(raw: string): { phone_number: string; phone_normalized: string } {
  const stripped = raw.replace(/[\s\-\(\)\.]/g, "");
  let normalized = stripped;

  // South African: starts with 0, 10 digits
  if (/^0\d{9}$/.test(stripped)) {
    normalized = "+27" + stripped.slice(1);
  }
  // Already has country code
  else if (/^\+\d{10,15}$/.test(stripped)) {
    normalized = stripped;
  }
  // 27 prefix without +
  else if (/^27\d{9}$/.test(stripped)) {
    normalized = "+" + stripped;
  }

  return {
    phone_number: raw.trim(),
    phone_normalized: normalized.replace(/[^\d+]/g, ""),
  };
}

/**
 * Normalize a date string to YYYY-MM-DD format.
 */
export function normalizeDate(raw: string): string | undefined {
  if (!raw || !raw.trim()) return undefined;
  const trimmed = raw.trim();

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, "0")}-${dmyMatch[1].padStart(2, "0")}`;
  }

  // MM/DD/YYYY
  const mdyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdyMatch) {
    const m = parseInt(mdyMatch[1]);
    if (m <= 12) {
      return `${mdyMatch[3]}-${mdyMatch[1].padStart(2, "0")}-${mdyMatch[2].padStart(2, "0")}`;
    }
  }

  // Try native Date parsing
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10);
  }

  return undefined;
}

/**
 * Parse CSV with optional column mapping from AI smart-import.
 */
export function parseCsv(
  text: string,
  columnMapping?: Record<string, string>
): { headers: string[]; subscribers: ParsedSubscriber[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { headers: [], subscribers: [], errors: ["CSV must have a header row and at least one data row."] };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const normalizedHeaders = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9_]/g, ""));

  // Build field index map using AI mapping or fallback
  const fieldMap: Record<string, number> = {};
  if (columnMapping && Object.keys(columnMapping).length > 0) {
    // Use AI/smart mapping
    rawHeaders.forEach((header, idx) => {
      const mapped = columnMapping[header];
      if (mapped) fieldMap[mapped] = idx;
    });
  } else {
    // Fallback: standard header detection
    normalizedHeaders.forEach((h, idx) => {
      if (h === "email" || h === "emailaddress" || h === "email_address") fieldMap["email"] = idx;
      else if (h === "name" || h === "fullname" || h === "full_name") fieldMap["full_name"] = idx;
      else if (h === "first_name" || h === "firstname" || h === "fname") fieldMap["first_name"] = idx;
      else if (h === "source") fieldMap["source"] = idx;
      else if (h === "tags") fieldMap["tags"] = idx;
      else if (h === "phone" || h === "phone_number" || h === "mobile" || h === "cell" || h === "telephone") fieldMap["phone_number"] = idx;
      else if (h === "lead_type" || h === "leadtype") fieldMap["lead_type"] = idx;
      else if (h === "registration_status" || h === "reg_status") fieldMap["registration_status"] = idx;
      else if (h === "go_status") fieldMap["go_status"] = idx;
      else if (h === "associate_status") fieldMap["associate_status"] = idx;
      else if (h === "communication_status") fieldMap["communication_status"] = idx;
      else if (h === "lead_temperature" || h === "temperature") fieldMap["lead_temperature"] = idx;
      else if (h === "city" || h === "town") fieldMap["city"] = idx;
      else if (h === "province" || h === "region") fieldMap["province"] = idx;
      else if (h === "state") fieldMap["state"] = idx;
      else if (h === "country") fieldMap["country"] = idx;
      else if (h === "date_captured" || h === "datecaptured") fieldMap["date_captured"] = idx;
      else if (h === "interest_level" || h === "interest") fieldMap["interest_level"] = idx;
      else if (h === "focus_area" || h === "focusarea") fieldMap["focus_area"] = idx;
      else if (h === "lead_path" || h === "leadpath") fieldMap["lead_path"] = idx;
      else if (h === "sponsor_name" || h === "sponsor") fieldMap["sponsor_name"] = idx;
      else if (h === "assigned_to" || h === "assigned") fieldMap["assigned_to"] = idx;
      else if (h === "action_taken") fieldMap["action_taken"] = idx;
      else if (h === "next_action") fieldMap["next_action"] = idx;
      else if (h === "meeting_time" || h === "meeting") fieldMap["meeting_time"] = idx;
      else if (h === "aplgo_id" || h === "aplgoid") fieldMap["aplgo_id"] = idx;
      else if (h === "additional_notes" || h === "notes") fieldMap["additional_notes"] = idx;
    });
  }

  if (fieldMap["email"] === undefined) {
    return { headers: rawHeaders, subscribers: [], errors: ["CSV must contain an 'email' or 'EmailAddress' column."] };
  }

  const subscribers: ParsedSubscriber[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  const getField = (fields: string[], key: string): string | undefined => {
    const idx = fieldMap[key];
    if (idx === undefined || idx >= fields.length) return undefined;
    const val = fields[idx]?.trim();
    return val || undefined;
  };

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const email = (getField(fields, "email") || "").toLowerCase().trim();

    if (!email || !EMAIL_REGEX.test(email)) {
      errors.push(`Row ${i + 1}: invalid email "${fields[fieldMap["email"]] || ""}"`);
      continue;
    }

    if (email.length > 255) {
      errors.push(`Row ${i + 1}: email too long`);
      continue;
    }

    if (seen.has(email)) continue;
    seen.add(email);

    const fullName = getField(fields, "full_name");
    const firstName = getField(fields, "first_name") || (fullName ? fullName.split(" ")[0] : undefined);
    const source = getField(fields, "source") || "csv_import";
    const tagsRaw = getField(fields, "tags");
    const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : undefined;

    const phoneRaw = getField(fields, "phone_number");
    const phone = phoneRaw ? normalizePhone(phoneRaw) : undefined;

    const dateCapturedRaw = getField(fields, "date_captured");
    const dateCaptured = dateCapturedRaw ? normalizeDate(dateCapturedRaw) : undefined;

    const meetingTimeRaw = getField(fields, "meeting_time");
    const meetingTime = meetingTimeRaw ? normalizeDate(meetingTimeRaw) : undefined;

    const sub: ParsedSubscriber = {
      email,
      first_name: firstName?.slice(0, 100),
      full_name: fullName?.slice(0, 200),
      phone_number: phone?.phone_number,
      source,
      tags: tags && tags.length > 0 ? tags : undefined,
      lead_type: getField(fields, "lead_type"),
      registration_status: getField(fields, "registration_status"),
      go_status: getField(fields, "go_status"),
      associate_status: getField(fields, "associate_status"),
      communication_status: getField(fields, "communication_status"),
      lead_temperature: getField(fields, "lead_temperature"),
      city: getField(fields, "city"),
      province: getField(fields, "province"),
      state: getField(fields, "state"),
      country: getField(fields, "country"),
      date_captured: dateCaptured,
      interest_level: getField(fields, "interest_level"),
      focus_area: getField(fields, "focus_area"),
      lead_path: getField(fields, "lead_path"),
      sponsor_name: getField(fields, "sponsor_name"),
      assigned_to: getField(fields, "assigned_to"),
      action_taken: getField(fields, "action_taken"),
      next_action: getField(fields, "next_action"),
      meeting_time: meetingTime,
      aplgo_id: getField(fields, "aplgo_id"),
      additional_notes: getField(fields, "additional_notes"),
    };

    // Store phone_normalized separately for the import logic
    if (phone?.phone_normalized) {
      (sub as any)._phone_normalized = phone.phone_normalized;
    }

    subscribers.push(sub);
  }

  return { headers: rawHeaders, subscribers, errors };
}

/**
 * Get sample rows from CSV text for AI mapping preview.
 */
export function getSampleRows(text: string, count = 3): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return { headers: [], rows: [] };
  
  const headers = parseCsvLine(lines[0]);
  const rows: string[][] = [];
  for (let i = 1; i < Math.min(lines.length, count + 1); i++) {
    rows.push(parseCsvLine(lines[i]));
  }
  return { headers, rows };
}
