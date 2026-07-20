import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InboxMessage } from "@/hooks/useInbox";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Tag, ListOrdered, UserPlus, Bot, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { TimelineCard } from "./TimelineCard";
import { NextBestActionCard } from "./NextBestActionCard";


const ROBOT_PATTERNS = [/^robot@/i, /^no-?reply@/i, /^donotreply@/i, /^notifications?@/i, /^mailer-daemon@/i, /^postmaster@/i, /^system@/i, /^bounce@/i];
const isRobot = (e?: string | null) => !!e && ROBOT_PATTERNS.some((r) => r.test(e));

export type ProspectDetail = {
  id: string;
  email: string;
  first_name: string | null;
  full_name: string | null;
  phone_number: string | null;
  aplgo_id: string | null;
  needs_enrichment: boolean;
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
              <p className="text-xs text-muted-foreground">
                {prospect.email.endsWith("@aplgo.enrollment.pending") ? "— (no real email yet) —" : prospect.email}
              </p>
              {prospect.aplgo_id && <p className="text-xs text-muted-foreground">APLGO ID: {prospect.aplgo_id}</p>}
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {prospect.phone_number && <p>Phone: {prospect.phone_number}</p>}
              <p>Status: {prospect.registration_status || "—"}</p>
              <p>GO: {prospect.go_status || "—"}</p>
              <p>Engagement: {prospect.engagement_score ?? 0}</p>
            </CardContent>
          </Card>

          {prospect.needs_enrichment && (
            <EnrichmentNudge prospect={prospect} onSaved={() => window.location.reload()} />
          )}


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

          <TimelineCard prospectId={prospect.id} email={prospect.email} />

          <NextBestActionCard prospectId={prospect.id} />

          <GoogleContactsSyncCard />
        </>

      ) : (
        <NoProspectCard message={message} onLinked={() => {
          // trigger refetch by resetting prospect state — parent will re-render when message changes
        }} />
      )}
    </div>
  );
}

function NoProspectCard({ message, onLinked }: { message: InboxMessage; onLinked: () => void }) {
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const robot = isRobot(message.sender);

  const addContact = async () => {
    setAdding(true); setErr(null);
    try {
      const email = message.sender.toLowerCase();
      const name = message.sender_name || null;
      const { data: existing } = await supabase.from("prospects").select("id").eq("email", email).maybeSingle();
      let pid = existing?.id;
      if (!pid) {
        const { data: created, error } = await supabase.from("prospects").insert({
          email,
          first_name: name?.split(" ")[0] || null,
          full_name: name,
          source: "inbox_manual_add",
          lead_type: "warm",
        }).select("id").single();
        if (error) throw error;
        pid = created.id;
      }
      await supabase.from("inbox_messages").update({ prospect_id: pid }).eq("id", message.id);
      setAdded(true);
      onLinked();
    } catch (e: any) {
      setErr(e.message || "Failed to add contact");
    }
    setAdding(false);
  };

  if (robot) {
    return (
      <Card>
        <CardContent className="p-4 text-sm space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Bot className="w-4 h-4" />
            <span className="font-medium">Automated sender</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {message.sender} is a robot/system address. It won't be added as a contact.
            Use Smart Extract above to enroll the person named inside the message.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4 text-sm space-y-3">
        <p className="text-muted-foreground">No contact linked to this sender.</p>
        {added ? (
          <Badge variant="secondary">Added — reopen message to refresh</Badge>
        ) : (
          <button
            onClick={addContact}
            disabled={adding}
            className="w-full inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-md px-3 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Add {message.sender_name || message.sender} to contacts
          </button>
        )}
        {err && <p className="text-xs text-destructive">{err}</p>}
      </CardContent>
    </Card>
  );
}

function EnrichmentNudge({ prospect, onSaved }: { prospect: ProspectDetail; onSaved: () => void }) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setSaving(true); setErr(null);
    try {
      const patch: any = { needs_enrichment: false };
      if (email.trim()) patch.email = email.trim().toLowerCase();
      if (phone.trim()) patch.phone_number = phone.trim();
      const { error } = await supabase.from("prospects").update(patch).eq("id", prospect.id);
      if (error) throw error;
      onSaved();
    } catch (e: any) {
      setErr(e.message || "Save failed");
    }
    setSaving(false);
  };

  return (
    <Card className="border-amber-500/40 bg-amber-500/5">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <CardTitle className="text-sm">Needs contact info</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Auto-created from an APLGO enrollment notice. Add a real email &amp; phone so we can reach them directly.
        </p>
        <input
          type="email"
          placeholder="Real email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full text-xs border rounded px-2 py-1.5 bg-background"
        />
        <input
          type="tel"
          placeholder="Phone (e.g. +27...)"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full text-xs border rounded px-2 py-1.5 bg-background"
        />
        <button
          onClick={save}
          disabled={saving || (!email.trim() && !phone.trim())}
          className="w-full text-xs bg-primary text-primary-foreground rounded py-1.5 font-medium disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save & mark enriched"}
        </button>
        {err && <p className="text-xs text-destructive">{err}</p>}
      </CardContent>
    </Card>
  );
}
