import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2 } from "lucide-react";

export function NextBestActionCard({ prospectId }: { prospectId: string }) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setLoading(true); setErr(null);
    try {
      const { data, error } = await supabase.functions.invoke("contact-next-action", {
        body: { prospect_id: prospectId },
      });
      if (error) throw error;
      setSuggestion(data?.suggestion || "No suggestion returned.");
    } catch (e: any) {
      setErr(e.message || "Failed");
    }
    setLoading(false);
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <CardTitle className="text-sm">Next Best Action</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {suggestion ? (
          <p className="text-xs whitespace-pre-wrap">{suggestion}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Ask the AI what to do next with this contact.</p>
        )}
        <button
          onClick={run}
          disabled={loading}
          className="w-full text-xs bg-primary text-primary-foreground rounded py-1.5 font-medium disabled:opacity-50 inline-flex items-center justify-center gap-1"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {suggestion ? "Refresh suggestion" : "Suggest next action"}
        </button>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </CardContent>
    </Card>
  );
}
