import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Mail, MousePointerClick, Tag, Send, MessageSquare } from "lucide-react";

type TimelineItem = {
  id: string;
  kind: "email" | "open" | "click" | "activity" | "tag" | "reply";
  label: string;
  detail?: string | null;
  at: string;
};

const iconFor = (kind: TimelineItem["kind"]) => {
  switch (kind) {
    case "email": return <Send className="w-3.5 h-3.5" />;
    case "open": return <Mail className="w-3.5 h-3.5" />;
    case "click": return <MousePointerClick className="w-3.5 h-3.5" />;
    case "tag": return <Tag className="w-3.5 h-3.5" />;
    case "reply": return <MessageSquare className="w-3.5 h-3.5" />;
    default: return <Activity className="w-3.5 h-3.5" />;
  }
};

export function TimelineCard({ prospectId, email }: { prospectId: string; email: string }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [acts, emails, inbox] = await Promise.all([
        supabase.from("contact_activities").select("id, activity_type, notes, created_at").eq("prospect_id", prospectId).order("created_at", { ascending: false }).limit(20),
        supabase.from("email_events").select("id, event_type, subject, created_at").eq("recipient_email", email).order("created_at", { ascending: false }).limit(20),
        supabase.from("inbox_messages").select("id, subject, date, sender").eq("prospect_id", prospectId).is("deleted_at", null).order("date", { ascending: false }).limit(10),
      ]);

      const merged: TimelineItem[] = [];
      (acts.data || []).forEach((a: any) => merged.push({
        id: `act-${a.id}`,
        kind: a.activity_type === "email_reply" ? "reply" : "activity",
        label: a.activity_type,
        detail: a.notes,
        at: a.created_at,
      }));
      (emails.data || []).forEach((e: any) => {
        const kind: TimelineItem["kind"] = e.event_type?.includes("opened") ? "open" : e.event_type?.includes("clicked") ? "click" : "email";
        merged.push({ id: `ev-${e.id}`, kind, label: e.event_type, detail: e.subject, at: e.created_at });
      });
      (inbox.data || []).forEach((m: any) => merged.push({
        id: `inb-${m.id}`,
        kind: "reply",
        label: "inbox message",
        detail: m.subject,
        at: m.date,
      }));

      merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
      if (!cancelled) {
        setItems(merged.slice(0, 30));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [prospectId, email]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" />
          <CardTitle className="text-base">Timeline</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <p className="text-xs text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No timeline events yet.</p>
        ) : (
          items.map((it) => (
            <div key={it.id} className="flex gap-2 text-xs border-b last:border-0 pb-1.5 last:pb-0">
              <div className="mt-0.5 text-muted-foreground">{iconFor(it.kind)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium capitalize truncate">{it.label}</span>
                  <span className="text-muted-foreground shrink-0">{new Date(it.at).toLocaleDateString()}</span>
                </div>
                {it.detail && <p className="text-muted-foreground truncate">{it.detail}</p>}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
