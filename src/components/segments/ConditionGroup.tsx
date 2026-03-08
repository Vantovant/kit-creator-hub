import { Plus, Trash2, Shield, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ConditionRow } from "./ConditionRow";
import type { FilterGroup, TagItem } from "./types";
import { createCondition } from "./types";

interface ConditionGroupProps {
  group: FilterGroup;
  onChange: (updates: Partial<FilterGroup>) => void;
  onRemove: () => void;
  canRemove: boolean;
  tags: TagItem[];
}

export function ConditionGroup({ group, onChange, onRemove, canRemove, tags }: ConditionGroupProps) {
  const isExclude = group.type === "exclude";

  const updateCondition = (idx: number, updates: Partial<typeof group.conditions[0]>) => {
    const newConds = group.conditions.map((c, i) => (i === idx ? { ...c, ...updates } : c));
    onChange({ conditions: newConds });
  };

  const removeCondition = (idx: number) => {
    if (group.conditions.length <= 1) return;
    onChange({ conditions: group.conditions.filter((_, i) => i !== idx) });
  };

  const addCondition = () => {
    onChange({ conditions: [...group.conditions, createCondition()] });
  };

  return (
    <div
      className={`rounded-lg border-2 transition-colors ${
        isExclude
          ? "border-destructive/30 bg-destructive/5"
          : "border-primary/30 bg-primary/5"
      }`}
    >
      {/* Group header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50">
        <div className="flex items-center gap-3">
          {/* Include / Exclude toggle */}
          <button
            type="button"
            onClick={() => onChange({ type: isExclude ? "include" : "exclude" })}
            className="flex items-center gap-1.5"
          >
            {isExclude ? (
              <Badge variant="destructive" className="gap-1 cursor-pointer text-xs">
                <ShieldOff className="w-3 h-3" /> Exclude
              </Badge>
            ) : (
              <Badge className="gap-1 cursor-pointer text-xs bg-primary text-primary-foreground">
                <Shield className="w-3 h-3" /> Include
              </Badge>
            )}
          </button>

          <span className="text-xs text-muted-foreground">contacts matching</span>

          {/* Match toggle */}
          <div className="flex items-center bg-muted rounded-md p-0.5">
            <button
              type="button"
              onClick={() => onChange({ match: "all" })}
              className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                group.match === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              ALL
            </button>
            <button
              type="button"
              onClick={() => onChange({ match: "any" })}
              className={`px-2.5 py-0.5 rounded text-xs font-medium transition-colors ${
                group.match === "any" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              ANY
            </button>
          </div>

          <span className="text-xs text-muted-foreground">of these conditions</span>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Conditions */}
      <div className="p-4 space-y-2">
        {group.conditions.map((cond, idx) => (
          <div key={cond.id}>
            {idx > 0 && (
              <div className="flex items-center gap-2 py-1 pl-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                  {group.match === "all" ? "AND" : "OR"}
                </span>
                <div className="flex-1 border-t border-border/40" />
              </div>
            )}
            <ConditionRow
              condition={cond}
              onChange={(updates) => updateCondition(idx, updates)}
              onRemove={() => removeCondition(idx)}
              canRemove={group.conditions.length > 1}
              tags={tags}
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addCondition}
          className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium mt-2 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add condition
        </button>
      </div>
    </div>
  );
}
