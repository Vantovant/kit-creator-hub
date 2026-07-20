import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Trash2, Star, X } from "lucide-react";

interface Signal {
  id: string;
  sender_email: string;
  signal: "spam" | "keep";
  weight: number;
  last_action_at: string;
}

export function LearnedRulesPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [rules, setRules] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("inbox_learning_signals")
      .select("*")
      .gt("weight", 0)
      .order("last_action_at", { ascending: false })
      .limit(200);
    setRules((data as Signal[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (open) load(); }, [open]);

  const remove = async (id: string) => {
    await supabase.from("inbox_learning_signals").delete().eq("id", id);
    setRules((r) => r.filter((x) => x.id !== id));
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-[560px] max-h-[80vh] bg-background border rounded-lg shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Learned Inbox Rules</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <p className="px-4 pt-3 text-xs text-muted-foreground">
          When you <strong>delete</strong> a sender's email, future messages from them auto-route to <strong>Spam</strong>. When you <strong>star</strong>, they auto-stay in your <strong>Inbox</strong>. Remove a rule to reset.
        </p>
        <div className="flex-1 overflow-auto p-2">
          {loading ? (
            <p className="text-sm text-muted-foreground p-4">Loading…</p>
          ) : rules.length === 0 ? (
            <p className="text-sm text-muted-foreground p-4">No learned rules yet. Delete or star some emails and Zazi will start learning.</p>
          ) : (
            <ul className="space-y-1">
              {rules.map((r) => (
                <li key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50">
                  {r.signal === "spam" ? (
                    <Trash2 className="w-3.5 h-3.5 text-destructive shrink-0" />
                  ) : (
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400 shrink-0" />
                  )}
                  <span className="flex-1 truncate text-sm">{r.sender_email}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {r.signal} · {r.weight}
                  </span>
                  <button
                    onClick={() => remove(r.id)}
                    className="text-xs px-2 py-0.5 rounded border hover:bg-background"
                    title="Forget this rule"
                  >
                    Forget
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
