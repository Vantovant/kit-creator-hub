/**
 * Parse a CSV string into an array of objects.
 * Handles quoted fields containing commas.
 */
export interface ParsedSubscriber {
  email: string;
  first_name?: string;
  source?: string;
  tags?: string[];
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

export function parseCsv(text: string): { subscribers: ParsedSubscriber[]; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { subscribers: [], errors: ["CSV must have a header row and at least one data row."] };
  }

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z_]/g, ""));
  const emailIdx = headers.findIndex((h) => h === "email" || h === "emailaddress" || h === "email_address");
  if (emailIdx === -1) {
    return { subscribers: [], errors: ["CSV must contain an 'email' or 'EmailAddress' column."] };
  }

  const nameIdx = headers.findIndex((h) => h === "name" || h === "first_name" || h === "firstname" || h === "fullname" || h === "full_name");
  const sourceIdx = headers.indexOf("source");
  const tagsIdx = headers.indexOf("tags");

  const subscribers: ParsedSubscriber[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const email = (fields[emailIdx] || "").toLowerCase().trim();

    if (!email || !EMAIL_REGEX.test(email)) {
      errors.push(`Row ${i + 1}: invalid email "${fields[emailIdx] || ""}"`);
      continue;
    }

    if (email.length > 255) {
      errors.push(`Row ${i + 1}: email too long`);
      continue;
    }

    if (seen.has(email)) continue;
    seen.add(email);

    const firstName = nameIdx >= 0 ? (fields[nameIdx] || "").trim().slice(0, 100) : undefined;
    const source = sourceIdx >= 0 ? (fields[sourceIdx] || "").trim().slice(0, 50) : "csv_import";
    const tags = tagsIdx >= 0
      ? (fields[tagsIdx] || "").split(",").map((t) => t.trim()).filter(Boolean)
      : undefined;

    subscribers.push({
      email,
      first_name: firstName || undefined,
      source: source || "csv_import",
      tags: tags && tags.length > 0 ? tags : undefined,
    });
  }

  return { subscribers, errors };
}
