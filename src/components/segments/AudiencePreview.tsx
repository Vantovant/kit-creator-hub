import { useState, useEffect, useCallback } from "react";
import { Users, Eye, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import type { SegmentFilters } from "./types";
import { filtersForSave } from "./types";

interface AudiencePreviewProps {
  filters: SegmentFilters;
}

interface ProspectRow {
  id: string;
  email: string;
  first_name: string | null;
  engagement_score: number;
  source: string | null;
}

export function AudiencePreview({ filters }: AudiencePreviewProps) {
  const [count, setCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<ProspectRow[]>([]);

  const fetchCount = useCallback(async () => {
    setLoading(true);
    try {
      const cleaned = filtersForSave(filters);
      const payload = cleaned.groups.length > 0 ? cleaned : { match: "all", groups: [] };
      const { data, error } = await supabase.rpc("get_segment_prospects", {
        segment_filters: payload as any,
      });
      if (!error && data) {
        setCount(data.length);
        setPreviewData((data as ProspectRow[]).slice(0, 10));
      } else {
        setCount(0);
        setPreviewData([]);
      }
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const timer = setTimeout(fetchCount, 600);
    return () => clearTimeout(timer);
  }, [fetchCount]);

  return (
    <div className="space-y-3">
      {/* Count bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-muted/50 rounded-lg border border-border">
        <div className="flex items-center gap-2">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : (
            <Users className="w-4 h-4 text-primary" />
          )}
          <span className="text-sm font-medium text-foreground">
            {loading ? "Counting…" : (
              <>
                <span className="text-lg font-bold text-primary">{count ?? "—"}</span>
                {" "}matching contact{count !== 1 ? "s" : ""}
              </>
            )}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          disabled={loading || !count}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          {showPreview ? "Hide" : "Preview"}
        </button>
      </div>

      {/* Preview table */}
      {showPreview && previewData.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Source</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">Score</th>
              </tr>
            </thead>
            <tbody>
              {previewData.map((p) => (
                <tr key={p.id} className="border-t border-border/50">
                  <td className="px-3 py-1.5 font-mono text-xs">{p.email}</td>
                  <td className="px-3 py-1.5">{p.first_name || "—"}</td>
                  <td className="px-3 py-1.5">
                    {p.source ? <Badge variant="outline" className="text-[10px]">{p.source}</Badge> : "—"}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">{p.engagement_score}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {count && count > 10 && (
            <div className="px-3 py-1.5 text-xs text-muted-foreground bg-muted/30 text-center border-t border-border/50">
              Showing first 10 of {count} contacts
            </div>
          )}
        </div>
      )}
    </div>
  );
}
