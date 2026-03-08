export interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface FilterGroup {
  id: string;
  match: "all" | "any";
  type: "include" | "exclude";
  conditions: Condition[];
}

export interface SegmentFilters {
  match: "all" | "any";
  groups: FilterGroup[];
}

export interface Segment {
  id: string;
  name: string;
  description: string | null;
  filters: any;
  created_at: string;
  subscriber_count?: number;
}

export interface TagItem {
  id: string;
  name: string;
  color: string;
  created_at: string;
  subscriber_count?: number;
}

export function createCondition(field = "email", operator = "contains", value = ""): Condition {
  return { id: crypto.randomUUID(), field, operator, value };
}

export function createGroup(type: "include" | "exclude" = "include"): FilterGroup {
  return {
    id: crypto.randomUUID(),
    match: "all",
    type,
    conditions: [createCondition()],
  };
}

export function createDefaultFilters(): SegmentFilters {
  return { match: "all", groups: [createGroup()] };
}

export function normalizeFilters(filters: any): SegmentFilters {
  if (!filters) return createDefaultFilters();
  if (Array.isArray(filters)) {
    return {
      match: "all",
      groups: [
        {
          id: crypto.randomUUID(),
          match: "all",
          type: "include",
          conditions: filters.length > 0
            ? filters.map((f: any) => ({ id: crypto.randomUUID(), ...f }))
            : [createCondition()],
        },
      ],
    };
  }
  if (filters.groups) {
    return {
      match: filters.match || "all",
      groups: filters.groups.map((g: any) => ({
        ...g,
        id: g.id || crypto.randomUUID(),
        conditions: (g.conditions || []).map((c: any) => ({
          ...c,
          id: c.id || crypto.randomUUID(),
        })),
      })),
    };
  }
  return createDefaultFilters();
}

export function filtersForSave(filters: SegmentFilters): SegmentFilters {
  return {
    match: filters.match,
    groups: filters.groups
      .map((g) => ({
        ...g,
        conditions: g.conditions.filter(
          (c) => ["is_empty", "is_not_empty"].includes(c.operator) || c.value.trim() !== ""
        ),
      }))
      .filter((g) => g.conditions.length > 0),
  };
}
