/**
 * Smart Tagging Rules for CRM imports.
 * Maps CRM field values to automatic tag names.
 */

export interface SmartTagRule {
  field: string;
  value: string;
  tag: string;
  matchType: "equals" | "contains";
}

export const CRM_TAG_RULES: SmartTagRule[] = [
  // Registration status
  { field: "registration_status", value: "Activated", tag: "activated-members", matchType: "equals" },
  { field: "registration_status", value: "Registered", tag: "registered-not-activated", matchType: "equals" },

  // Lead types
  { field: "lead_type", value: "Prospect", tag: "prospect-lead", matchType: "equals" },
  { field: "lead_type", value: "Registered_Nopurchase", tag: "registered-no-purchase", matchType: "equals" },
  { field: "lead_type", value: "Purchase_Nostatus", tag: "purchased-no-rank", matchType: "equals" },
  { field: "lead_type", value: "Purchase_Status", tag: "purchased-with-rank", matchType: "equals" },
  { field: "lead_type", value: "Expired", tag: "expired-reactivation", matchType: "equals" },
  { field: "lead_type", value: "Customer", tag: "customer", matchType: "equals" },
  { field: "lead_type", value: "Distributor", tag: "distributor", matchType: "equals" },

  // GO status
  { field: "go_status", value: "Active", tag: "go-active", matchType: "equals" },
  { field: "go_status", value: "Inactive", tag: "go-inactive", matchType: "equals" },

  // Lead temperature
  { field: "lead_temperature", value: "Hot", tag: "hot-lead", matchType: "equals" },
  { field: "lead_temperature", value: "Warm", tag: "warm-lead", matchType: "equals" },
  { field: "lead_temperature", value: "Cold", tag: "cold-lead", matchType: "equals" },
];

/**
 * Given a subscriber record, return all tag names that should be auto-applied.
 */
export function getSmartTags(record: Record<string, any>): string[] {
  const tags: string[] = [];

  for (const rule of CRM_TAG_RULES) {
    const fieldValue = record[rule.field];
    if (!fieldValue) continue;

    if (rule.matchType === "equals" && fieldValue === rule.value) {
      tags.push(rule.tag);
    } else if (rule.matchType === "contains" && String(fieldValue).includes(rule.value)) {
      tags.push(rule.tag);
    }
  }

  return tags;
}
