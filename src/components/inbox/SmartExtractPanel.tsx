import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, UserPlus, Tag as TagIcon, ListTodo, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Extract = {
  id: string;
  detected_type: string;
  confidence: number;
  summary: string | null;
  entities_json: any;
  suggested_actions_json: any[];
  requires_user_confirmation: boolean;
};

export function SmartExtractPanel({ messageId, onActioned }: { messageId: string; onActioned?: () => void }) {
  const [extract, setExtract] = useState<Extract | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const fetchExtract = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("inbox_extracts")
      .select("*")
      .eq("message_id", messageId)
      .maybeSingle();
    setExtract(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchExtract(); }, [messageId]);

  const runClassify = async () => {
    setRunning(true);
    const { error } = await supabase.functions.invoke("inbox-classify", { body: { message_id: messageId } });
    if (error) toast.error("Classify failed");
    else toast.success("Classified");
    await fetchExtract();
    onActioned?.();
    setRunning(false);
  };

  const confirmAction = async (kind: string) => {
    setRunning(true);
    // Re-invoke classifier with an override to force auto-act.
    const { error } = await supabase.functions.invoke("inbox-classify", {
      body: { message_id: messageId, force_action: kind },
    });
    if (error) toast.error("Action failed");
    else toast.success("Action logged");
    await fetchExtract();
    onActioned?.();
    setRunning(false);
  };

  if (loading) return <div className="text-xs text-muted-foreground">Loading AI extract…</div>;

  if (!extract) {
    return (
      <div className="rounded-md border p-3 space-y-2 bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-primary" /> Smart Extract
        </div>
        <p className="text-xs text-muted-foreground">Not yet classified.</p>
        <Button size="sm" variant="outline" onClick={runClassify} disabled={running}>
          {running ? <Loader2 className="w-3 h-3 animate-spin" /> : "Classify with AI"}
        </Button>
      </div>
    );
  }

  const typeColor: Record<string, string> = {
    registration: "bg-green-500/15 text-green-500",
    reply: "bg-blue-500/15 text-blue-500",
    general: "bg-muted",
  };

  return (
    <div className="rounded-md border p-3 space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="w-4 h-4 text-primary" /> Smart Extract
        </div>
        <Badge className={typeColor[extract.detected_type] || "bg-muted"}>
          {extract.detected_type} · {Math.round(extract.confidence * 100)}%
        </Badge>
      </div>

      {extract.summary && <p className="text-xs text-muted-foreground">{extract.summary}</p>}

      {extract.entities_json && Object.keys(extract.entities_json).length > 0 && (
        <div className="text-xs space-y-1">
          {Object.entries(extract.entities_json).map(([k, v]) => (
            v ? <div key={k}><span className="text-muted-foreground">{k}:</span> <span className="font-mono">{String(v)}</span></div> : null
          ))}
        </div>
      )}

      {extract.suggested_actions_json?.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t">
          <div className="text-xs font-medium text-muted-foreground">Suggested actions</div>
          {extract.suggested_actions_json.map((a: any, i: number) => (
            <Button
              key={i}
              size="sm"
              variant="outline"
              className="w-full justify-start text-xs h-8"
              onClick={() => confirmAction(a.kind)}
              disabled={running}
            >
              {a.kind === "enroll_sequence" && <UserPlus className="w-3 h-3 mr-2" />}
              {a.kind === "tag_reply" && <TagIcon className="w-3 h-3 mr-2" />}
              {a.kind === "create_task" && <ListTodo className="w-3 h-3 mr-2" />}
              {a.label}
            </Button>
          ))}
        </div>
      )}

      <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={runClassify} disabled={running}>
        {running ? <Loader2 className="w-3 h-3 animate-spin" /> : "Re-classify"}
      </Button>
    </div>
  );
}
