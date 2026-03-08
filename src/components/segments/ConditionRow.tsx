import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Condition, TagItem } from "./types";
import { FIELD_DEFINITIONS, getFieldDef, getOperatorsForField, isValuelessOperator } from "./constants";

interface ConditionRowProps {
  condition: Condition;
  onChange: (updates: Partial<Condition>) => void;
  onRemove: () => void;
  canRemove: boolean;
  tags: TagItem[];
}

export function ConditionRow({ condition, onChange, onRemove, canRemove, tags }: ConditionRowProps) {
  const fieldDef = getFieldDef(condition.field);
  const operators = getOperatorsForField(condition.field);
  const valueless = isValuelessOperator(condition.operator);

  const handleFieldChange = (field: string) => {
    const newDef = getFieldDef(field);
    const newOps = getOperatorsForField(field);
    const firstOp = newOps[0]?.value || "equals";
    onChange({ field, operator: firstOp, value: newDef?.type === "boolean" ? "false" : "" });
  };

  const categories = [...new Set(FIELD_DEFINITIONS.map((f) => f.category))];

  return (
    <div className="flex items-center gap-2 group/row">
      {/* Field */}
      <select
        value={condition.field}
        onChange={(e) => handleFieldChange(e.target.value)}
        className="px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm min-w-[140px] focus:ring-2 focus:ring-ring focus:outline-none"
      >
        {categories.map((cat) => (
          <optgroup key={cat} label={cat}>
            {FIELD_DEFINITIONS.filter((f) => f.category === cat).map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Operator */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ operator: e.target.value, value: isValuelessOperator(e.target.value) ? "" : condition.value })}
        className="px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm min-w-[140px] focus:ring-2 focus:ring-ring focus:outline-none"
      >
        {operators.map((op) => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      {/* Value */}
      {!valueless && (
        <>
          {fieldDef?.type === "boolean" ? (
            <select
              value={condition.value}
              onChange={(e) => onChange({ value: e.target.value })}
              className="px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm min-w-[120px] focus:ring-2 focus:ring-ring focus:outline-none"
            >
              <option value="false">Subscribed</option>
              <option value="true">Unsubscribed</option>
            </select>
          ) : fieldDef?.type === "tag" ? (
            <select
              value={condition.value}
              onChange={(e) => onChange({ value: e.target.value })}
              className="px-2.5 py-1.5 rounded-md border border-border bg-background text-foreground text-sm min-w-[120px] focus:ring-2 focus:ring-ring focus:outline-none"
            >
              <option value="">Select tag…</option>
              {tags.map((t) => (
                <option key={t.id} value={t.name}>{t.name}</option>
              ))}
            </select>
          ) : (
            <Input
              value={condition.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder={condition.operator === "within_last_days" ? "Number of days" : "Value"}
              type={
                fieldDef?.type === "number" || condition.operator === "within_last_days"
                  ? "number"
                  : fieldDef?.type === "date" && condition.operator !== "within_last_days"
                  ? "date"
                  : "text"
              }
              className="h-8 text-sm flex-1 min-w-[120px]"
            />
          )}
        </>
      )}

      {valueless && <div className="flex-1" />}

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="p-1.5 rounded text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed transition-colors shrink-0"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
