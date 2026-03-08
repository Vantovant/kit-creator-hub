import { useState, useEffect } from "react";
import { Plus, Zap, Copy, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConditionGroup } from "./ConditionGroup";
import { AudiencePreview } from "./AudiencePreview";
import { generateNLSummary } from "./constants";
import type { Segment, TagItem, SegmentFilters } from "./types";
import { createGroup, createDefaultFilters, normalizeFilters, filtersForSave } from "./types";

interface SmartAudienceBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segment?: Segment | null;
  tags: TagItem[];
  onSave: (name: string, description: string, filters: SegmentFilters) => Promise<void>;
  quickTestEmail?: string;
}

export function SmartAudienceBuilder({
  open,
  onOpenChange,
  segment,
  tags,
  onSave,
  quickTestEmail,
}: SmartAudienceBuilderProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [filters, setFilters] = useState<SegmentFilters>(createDefaultFilters());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (segment) {
      setName(segment.name);
      setDescription(segment.description || "");
      setFilters(normalizeFilters(segment.filters));
    } else if (quickTestEmail !== undefined) {
      setName(quickTestEmail ? `Test: ${quickTestEmail}` : "Test: Single Email");
      setDescription("Quick one-person test segment");
      setFilters({
        match: "all",
        groups: [
          {
            id: crypto.randomUUID(),
            match: "all",
            type: "include",
            conditions: [
              { id: crypto.randomUUID(), field: "email", operator: "equals", value: quickTestEmail || "" },
            ],
          },
        ],
      });
    } else {
      setName("");
      setDescription("");
      setFilters(createDefaultFilters());
    }
  }, [open, segment, quickTestEmail]);

  const updateGroup = (idx: number, updates: Partial<SegmentFilters["groups"][0]>) => {
    setFilters((prev) => ({
      ...prev,
      groups: prev.groups.map((g, i) => (i === idx ? { ...g, ...updates } : g)),
    }));
  };

  const removeGroup = (idx: number) => {
    if (filters.groups.length <= 1) return;
    setFilters((prev) => ({ ...prev, groups: prev.groups.filter((_, i) => i !== idx) }));
  };

  const addGroup = (type: "include" | "exclude" = "include") => {
    setFilters((prev) => ({ ...prev, groups: [...prev.groups, createGroup(type)] }));
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave(name.trim(), description.trim(), filtersForSave(filters));
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const nlSummary = generateNLSummary(filters);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            {segment ? "Edit Smart Audience" : "New Smart Audience"}
          </DialogTitle>
          <DialogDescription>
            Build powerful audience segments with advanced filters and logic.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name & description */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Audience Name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Active APLGO members"
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Description (optional)
              </Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What this audience is for"
                className="h-9"
              />
            </div>
          </div>

          {/* NL Summary */}
          {nlSummary && (
            <div className="px-3 py-2 bg-accent/30 rounded-md border border-accent/50 text-sm text-foreground/80">
              <span className="font-medium text-primary">Summary:</span> {nlSummary}
            </div>
          )}

          {/* Top-level match toggle */}
          {filters.groups.length > 1 && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Match</span>
              <div className="flex items-center bg-muted rounded-md p-0.5">
                <button
                  type="button"
                  onClick={() => setFilters((p) => ({ ...p, match: "all" }))}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    filters.match === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  ALL groups
                </button>
                <button
                  type="button"
                  onClick={() => setFilters((p) => ({ ...p, match: "any" }))}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    filters.match === "any" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  ANY group
                </button>
              </div>
            </div>
          )}

          {/* Groups */}
          <div className="space-y-3">
            {filters.groups.map((group, idx) => (
              <div key={group.id}>
                {idx > 0 && (
                  <div className="flex items-center justify-center py-2">
                    <div className="border-t border-border/40 flex-1" />
                    <span className="px-3 text-[11px] uppercase font-bold tracking-widest text-muted-foreground">
                      {filters.match === "all" ? "AND" : "OR"}
                    </span>
                    <div className="border-t border-border/40 flex-1" />
                  </div>
                )}
                <ConditionGroup
                  group={group}
                  onChange={(updates) => updateGroup(idx, updates)}
                  onRemove={() => removeGroup(idx)}
                  canRemove={filters.groups.length > 1}
                  tags={tags}
                />
              </div>
            ))}
          </div>

          {/* Add group buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addGroup("include")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary border border-primary/30 rounded-md hover:bg-primary/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Include Group
            </button>
            <button
              type="button"
              onClick={() => addGroup("exclude")}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-destructive border border-destructive/30 rounded-md hover:bg-destructive/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Exclude Group
            </button>
          </div>

          {/* Live preview */}
          <AudiencePreview filters={filters} />
        </div>

        <DialogFooter className="gap-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="px-5 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            <Zap className="w-3.5 h-3.5" />
            {saving ? "Saving…" : segment ? "Update Audience" : "Create Audience"}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
