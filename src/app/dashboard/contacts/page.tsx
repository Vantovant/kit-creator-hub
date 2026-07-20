import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search, Mail, Phone, MapPin, Tag as TagIcon, Activity, Send,
  ListOrdered, User, Filter, Plus, Star, Flame, Snowflake,
} from "lucide-react";
import { toast } from "sonner";

type Prospect = {
  id: string;
  email: string;
  first_name: string | null;
  full_name: string | null;
  phone_number: string | null;
  lead_type: string | null;
  registration_status: string | null;
  go_status: string | null;
  lead_temperature: string | null;
  city: string | null;
  country: string | null;
  engagement_score: number;
  last_activity_at: string | null;
  source: string | null;
  created_at: string;
};

type Tag = { id: string; name: string };

const TEMP_ICON: Record<string, JSX.Element> = {
  hot: <Flame className="w-3 h-3 text-orange-500" />,
  warm: <Star className="w-3 h-3 text-yellow-500" />,
  cold: <Snowflake className="w-3 h-3 text-blue-400" />,
};

export default function ContactsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [tagsByProspect, setTagsByProspect] = useState<Record<string, Tag[]>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tempFilter, setTempFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [pRes, tRes, ptRes] = await Promise.all([
        supabase.from("prospects").select("*").order("last_activity_at", { ascending: false, nullsFirst: false }).limit(500),
        supabase.from("tags").select("id, name").order("name"),
        supabase.from("prospect_tags").select("prospect_id, tag_id, tags(id, name)"),
      ]);
      setProspects((pRes.data as Prospect[]) || []);
      setAllTags((tRes.data as Tag[]) || []);
      const map: Record<string, Tag[]> = {};
      ((ptRes.data as any[]) || []).forEach((pt) => {
        if (!map[pt.prospect_id]) map[pt.prospect_id] = [];
        if (pt.tags) map[pt.prospect_id].push({ id: pt.tags.id, name: pt.tags.name });
      });
      setTagsByProspect(map);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    return prospects.filter((p) => {
      if (tempFilter && p.lead_temperature !== tempFilter) return false;
      if (tagFilter) {
        const tags = tagsByProspect[p.id] || [];
        if (!tags.some((t) => t.id === tagFilter)) return false;
      }
      if (search) {
        const s = search.toLowerCase();
        return (
          p.email?.toLowerCase().includes(s) ||
          p.full_name?.toLowerCase().includes(s) ||
          p.first_name?.toLowerCase().includes(s) ||
          p.phone_number?.toLowerCase().includes(s) ||
          p.city?.toLowerCase().includes(s) ||
          p.country?.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [prospects, tagsByProspect, search, tagFilter, tempFilter]);

  const selected = filtered.find((p) => p.id === selectedId) || filtered[0] || null;

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Left rail: filters */}
      <aside className="w-56 border-r p-4 space-y-4 overflow-y-auto shrink-0">
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-2">
            <Filter className="w-3 h-3" /> Temperature
          </h3>
          <div className="space-y-1">
            {["hot", "warm", "cold"].map((t) => (
              <button
                key={t}
                onClick={() => setTempFilter(tempFilter === t ? null : t)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-accent capitalize ${
                  tempFilter === t ? "bg-accent" : ""
                }`}
              >
                {TEMP_ICON[t]} {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase text-muted-foreground mb-2 flex items-center gap-2">
            <TagIcon className="w-3 h-3" /> Tags
          </h3>
          <ScrollArea className="h-64">
            <div className="space-y-1 pr-2">
              {allTags.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTagFilter(tagFilter === t.id ? null : t.id)}
                  className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-accent truncate ${
                    tagFilter === t.id ? "bg-accent font-medium" : ""
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </aside>

      {/* Middle: list */}
      <div className="flex-1 flex flex-col min-w-0 border-r">
        <div className="p-4 border-b flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone, city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button size="sm" variant="outline">
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        </div>
        <div className="px-4 py-2 text-xs text-muted-foreground border-b">
          {loading ? "Loading..." : `${filtered.length} contact${filtered.length === 1 ? "" : "s"}`}
        </div>
        <ScrollArea className="flex-1">
          <ul className="divide-y">
            {filtered.map((p) => {
              const tags = tagsByProspect[p.id] || [];
              const isSel = selected?.id === p.id;
              return (
                <li
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`px-4 py-3 cursor-pointer hover:bg-accent ${isSel ? "bg-accent" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                      {(p.full_name || p.first_name || p.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium truncate">
                          {p.full_name || p.first_name || p.email}
                        </p>
                        {p.lead_temperature && TEMP_ICON[p.lead_temperature]}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tags.slice(0, 3).map((t) => (
                            <Badge key={t.id} variant="outline" className="text-[10px] px-1 py-0">
                              {t.name}
                            </Badge>
                          ))}
                          {tags.length > 3 && (
                            <span className="text-[10px] text-muted-foreground">+{tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      </div>

      {/* Right: detail */}
      <div className="w-[440px] shrink-0 overflow-y-auto">
        {selected ? <ContactDetail prospect={selected} tags={tagsByProspect[selected.id] || []} /> : (
          <div className="p-10 text-center text-muted-foreground">Select a contact</div>
        )}
      </div>
    </div>
  );
}

function ContactDetail({ prospect, tags }: { prospect: Prospect; tags: Tag[] }) {
  const [activities, setActivities] = useState<any[]>([]);
  const [emails, setEmails] = useState<any[]>([]);
  const [inboxMsgs, setInboxMsgs] = useState<any[]>([]);
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      const [aRes, eRes, iRes] = await Promise.all([
        supabase.from("contact_activities").select("*").eq("prospect_id", prospect.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("zazi_outbound_sends").select("id, subject, sent_at, status").eq("prospect_id", prospect.id).order("sent_at", { ascending: false }).limit(10),
        supabase.from("inbox_messages").select("id, subject, sender, date").eq("prospect_id", prospect.id).order("date", { ascending: false }).limit(10),
      ]);
      setActivities(aRes.data || []);
      setEmails(eRes.data || []);
      setInboxMsgs(iRes.data || []);
    })();
  }, [prospect.id]);

  const logNote = async () => {
    if (!note.trim()) return;
    const user = (await supabase.auth.getUser()).data.user;
    const { error } = await supabase.from("contact_activities").insert({
      prospect_id: prospect.id,
      activity_type: "note",
      notes: note.trim(),
      created_by: user?.id,
    });
    if (error) { toast.error(error.message); return; }
    setNote("");
    toast.success("Note added");
    const { data } = await supabase.from("contact_activities").select("*").eq("prospect_id", prospect.id).order("created_at", { ascending: false }).limit(20);
    setActivities(data || []);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-semibold">
          {(prospect.full_name || prospect.first_name || prospect.email).charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">
            {prospect.full_name || prospect.first_name || "Unnamed"}
          </h2>
          <p className="text-sm text-muted-foreground truncate">{prospect.email}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" asChild>
          <a href={`mailto:${prospect.email}`}><Mail className="w-4 h-4 mr-1" /> Email</a>
        </Button>
        {prospect.phone_number && (
          <Button size="sm" variant="outline" asChild>
            <a href={`tel:${prospect.phone_number}`}><Phone className="w-4 h-4 mr-1" /> Call</a>
          </Button>
        )}
        <Button size="sm" variant="outline">
          <Send className="w-4 h-4 mr-1" /> Enroll
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><User className="w-4 h-4" /> Details</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-1">
          {prospect.phone_number && <div className="flex gap-2"><Phone className="w-3.5 h-3.5 mt-0.5 text-muted-foreground" />{prospect.phone_number}</div>}
          {(prospect.city || prospect.country) && (
            <div className="flex gap-2"><MapPin className="w-3.5 h-3.5 mt-0.5 text-muted-foreground" />{[prospect.city, prospect.country].filter(Boolean).join(", ")}</div>
          )}
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 text-xs">
            <div><span className="text-muted-foreground">Status:</span> {prospect.registration_status || "—"}</div>
            <div><span className="text-muted-foreground">GO:</span> {prospect.go_status || "—"}</div>
            <div><span className="text-muted-foreground">Lead:</span> {prospect.lead_type || "—"}</div>
            <div><span className="text-muted-foreground">Engagement:</span> {prospect.engagement_score}</div>
            <div><span className="text-muted-foreground">Source:</span> {prospect.source || "—"}</div>
            <div><span className="text-muted-foreground">Temp:</span> {prospect.lead_temperature || "—"}</div>
          </div>
        </CardContent>
      </Card>

      {tags.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TagIcon className="w-4 h-4" /> Tags</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {tags.map((t) => <Badge key={t.id} variant="secondary" className="text-xs">{t.name}</Badge>)}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="timeline">
        <TabsList className="w-full">
          <TabsTrigger value="timeline" className="flex-1">Timeline</TabsTrigger>
          <TabsTrigger value="emails" className="flex-1">Emails</TabsTrigger>
          <TabsTrigger value="inbox" className="flex-1">Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="space-y-3 mt-3">
          <div className="flex gap-2">
            <Input placeholder="Add a note..." value={note} onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && logNote()} />
            <Button size="sm" onClick={logNote}>Log</Button>
          </div>
          {activities.length ? activities.map((a) => (
            <div key={a.id} className="text-xs border-l-2 border-primary/40 pl-3 py-1">
              <div className="flex items-center gap-2">
                <Activity className="w-3 h-3" />
                <span className="font-medium capitalize">{a.activity_type}</span>
                <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span>
              </div>
              {a.notes && <p className="mt-1 text-muted-foreground">{a.notes}</p>}
            </div>
          )) : <p className="text-xs text-muted-foreground">No activity yet</p>}
        </TabsContent>

        <TabsContent value="emails" className="space-y-2 mt-3">
          {emails.length ? emails.map((e) => (
            <div key={e.id} className="text-xs border rounded p-2">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium truncate">{e.subject || "(no subject)"}</span>
                <Badge variant="outline" className="text-[10px]">{e.status}</Badge>
              </div>
              <span className="text-muted-foreground">{e.sent_at ? new Date(e.sent_at).toLocaleString() : ""}</span>
            </div>
          )) : <p className="text-xs text-muted-foreground">No emails sent</p>}
        </TabsContent>

        <TabsContent value="inbox" className="space-y-2 mt-3">
          {inboxMsgs.length ? inboxMsgs.map((m) => (
            <div key={m.id} className="text-xs border rounded p-2">
              <p className="font-medium truncate">{m.subject || "(no subject)"}</p>
              <p className="text-muted-foreground truncate">{m.sender}</p>
              <p className="text-muted-foreground">{new Date(m.date).toLocaleString()}</p>
            </div>
          )) : <p className="text-xs text-muted-foreground">No inbox messages linked</p>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
