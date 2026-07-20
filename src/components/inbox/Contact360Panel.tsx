import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InboxMessage } from "@/hooks/useInbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Tag, ListOrdered, Activity } from "lucide-react";

export type ProspectDetail = {
  id: string;
  email: string;
  first_name: string | null;
  full_name: string | null;
  phone_number: string | null;
  lead_type: string | null;
  registration_status: string | null;
  go_status: string | null;
  engagement_score: number;
  tags: { id: string; name: string }[];
  sequences: { id: string; name: string; status: string }[];
  activities: { id: string; activity_type: string; notes: string | null; created_at: string }[];
};

export function Contact360Panel({ message }: { message: InboxMessage | null }) {
  const [prospect, setProspect] = useState<ProspectDetail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!message?.prospect_id) {
      setProspect(null);
      return;
    }
    setLoading(true);
    Promise.all([
      supabase.from("prospects").select("*").eq("id", message.prospect_id).single(),
      supabase.from("prospect_tags").select("tag_id, tags(id, name)").eq("prospect_id", message.prospect_id),
      supabase.from("automation_queue").select("id, automation_id, status").eq("email", message.sender),
      supabase.from("contact_activities").select("*").eq("prospect_id", message.prospect_id).order("created_at", { ascending: false }).limit(10),
    ]).then(([pRes, tagsRes, seqRes, actRes]) => {
      const p = pRes.data as any;
      if (!p) { setProspect(null); setLoading(false); return; }
      const tags = ((tagsRes.data as any[]) || []).map((t: any) => ({ id: t.tag_id, name: t.tags?.name || "unknown" }));
      const sequences = ((seqRes.data as any[]) || []).map((s: any) => ({ id: s.id, name: s.automation_id, status: s.status }));
      const activities = (actRes.data as any[]) || [];
      setProspect({ ...p, tags, sequences, activities });
      setLoading(false);
    });
  }, [message?.prospect_id]);

  if (!message) return null;

  return (
    <div className="w-80 border-l bg-muted/20 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Mail className="w-4 h-4" />
        <span>Contact 360</span>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading contact...</p>
      ) : prospect ? (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{prospect.full_name || prospect.first_name || "Unknown"}</CardTitle>
              <p className="text-xs text-muted-foreground">{prospect.email}</p>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {prospect.phone_number && <p>Phone: {prospect.phone_number}</p>}
              <p>Status: {prospect.registration_status || "—"}</p>
              <p>GO: {prospect.go_status || "—"}</p>
              <p>Engagement: {prospect.engagement_score ?? 0}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                <CardTitle className="text-base">Tags</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {prospect.tags.length ? prospect.tags.map(t => (
                  <Badge key={t.id} variant="outline" className="text-xs">{t.name}</Badge>
                )) : <p className="text-xs text-muted-foreground">No tags</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4" />
                <CardTitle className="text-base">Sequences</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {prospect.sequences.length ? prospect.sequences.map(s => (
                  <p key={s.id} className="text-xs">{s.name} <span className="text-muted-foreground">({s.status})</span></p>
                )) : <p className="text-xs text-muted-foreground">No sequences</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4" />
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {prospect.activities.length ? prospect.activities.map(a => (
                <div key={a.id} className="text-xs border-b last:border-0 pb-1 last:pb-0">
                  <span className="font-medium capitalize">{a.activity_type}</span>
                  <span className="text-muted-foreground ml-2">{new Date(a.created_at).toLocaleDateString()}</span>
                  {a.notes && <p className="text-muted-foreground mt-0.5">{a.notes}</p>}
                </div>
              )) : <p className="text-xs text-muted-foreground">No recent activity</p>}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            No prospect linked to this sender. Create or match a contact to see Contact 360.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
