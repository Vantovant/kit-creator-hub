export interface FieldDef {
  value: string;
  label: string;
  type: "text" | "number" | "date" | "boolean" | "tag";
  category: string;
}

export const FIELD_DEFINITIONS: FieldDef[] = [
  { value: "email", label: "Email", type: "text", category: "Contact" },
  { value: "first_name", label: "First Name", type: "text", category: "Contact" },
  { value: "source", label: "Source", type: "text", category: "Contact" },
  { value: "unsubscribed", label: "Subscribed Status", type: "boolean", category: "Contact" },
  { value: "engagement_score", label: "Engagement Score", type: "number", category: "Engagement" },
  { value: "tag", label: "Tag", type: "tag", category: "Organization" },
  { value: "created_at", label: "Subscribe Date", type: "date", category: "Dates" },
  { value: "last_activity_at", label: "Last Activity", type: "date", category: "Dates" },
  { value: "last_opened_at", label: "Last Opened", type: "date", category: "Engagement" },
  { value: "last_clicked_at", label: "Last Clicked", type: "date", category: "Engagement" },
  { value: "last_replied_at", label: "Last Replied", type: "date", category: "Engagement" },
];

export const OPERATORS_BY_TYPE: Record<string, { value: string; label: string }[]> = {
  text: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "contains", label: "contains" },
    { value: "not_contains", label: "does not contain" },
    { value: "starts_with", label: "starts with" },
    { value: "ends_with", label: "ends with" },
    { value: "is_empty", label: "is empty" },
    { value: "is_not_empty", label: "is not empty" },
  ],
  number: [
    { value: "equals", label: "equals" },
    { value: "not_equals", label: "does not equal" },
    { value: "greater_than", label: "greater than" },
    { value: "less_than", label: "less than" },
  ],
  date: [
    { value: "after", label: "after" },
    { value: "before", label: "before" },
    { value: "within_last_days", label: "within last X days" },
    { value: "is_empty", label: "has no activity" },
    { value: "is_not_empty", label: "has activity" },
  ],
  boolean: [
    { value: "equals", label: "is" },
    { value: "not_equals", label: "is not" },
  ],
  tag: [
    { value: "has", label: "has tag" },
    { value: "not_has", label: "does not have tag" },
  ],
};

export function getFieldDef(fieldValue: string): FieldDef | undefined {
  return FIELD_DEFINITIONS.find((f) => f.value === fieldValue);
}

export function getOperatorsForField(fieldValue: string) {
  const def = getFieldDef(fieldValue);
  return OPERATORS_BY_TYPE[def?.type || "text"] || OPERATORS_BY_TYPE.text;
}

export function isValuelessOperator(op: string): boolean {
  return ["is_empty", "is_not_empty"].includes(op);
}

export function generateNLSummary(filters: { match: string; groups: any[] }): string {
  if (!filters.groups || filters.groups.length === 0) return "All active subscribers";

  const parts = filters.groups.map((group) => {
    const type = group.type === "exclude" ? "Exclude" : "Include";
    const match = group.match === "any" ? "any" : "all";
    const conds = (group.conditions || [])
      .filter((c: any) => isValuelessOperator(c.operator) || c.value?.trim())
      .map((c: any) => {
        const field = getFieldDef(c.field);
        const ops = getOperatorsForField(c.field);
        const opLabel = ops.find((o) => o.value === c.operator)?.label || c.operator;
        if (isValuelessOperator(c.operator)) return `${field?.label || c.field} ${opLabel}`;
        if (c.field === "unsubscribed") {
          return `${c.value === "true" ? "is unsubscribed" : "is subscribed"}`;
        }
        if (c.operator === "within_last_days") return `${field?.label || c.field} within last ${c.value} days`;
        return `${field?.label || c.field} ${opLabel} "${c.value}"`;
      });

    if (conds.length === 0) return null;
    return `${type} contacts matching ${match} of: ${conds.join(", ")}`;
  }).filter(Boolean);

  if (parts.length === 0) return "All active subscribers";
  return parts.join(filters.match === "any" ? " OR " : " AND ");
}

export const TAG_COLORS = [
  "#5CC5DE", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
  "#EC4899", "#F97316", "#06B6D4", "#84CC16", "#6366F1",
];
