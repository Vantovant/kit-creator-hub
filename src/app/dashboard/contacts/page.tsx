import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Tag as TagIcon, Filter, Plus, Star, Flame, Snowflake, X,
} from "lucide-react";
import { ContactDrawer } from "@/components/contacts/ContactDrawer";

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

const btnBase = "inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border border-input hover:bg-accent transition-colors";
const btnPrimary = "inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors";

export default function ContactsPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [tagsByProspect, setTagsByProspect] = useState<Record<string, Tag[]>>({});
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tempFilter, setTempFilter] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const addContact = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAddError("Enter a valid email address.");
      return;
    }
    setAddError(null);
    const { data, error } = await supabase.from("prospects").insert({
      email,
      full_name: newName.trim() || null,
      first_name: newName.trim().split(" ")[0] || null,
      source: "manual_contact",
      lead_type: "warm",
    }).select("*").single();
    if (error) { setAddError(error.message); return; }
    setProspects((prev) => [data as Prospect, ...prev]);
    setSelectedId((data as Prospect).id);
    setNewEmail("");
    setNewName("");
    setAddOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background relative">
      {/* Left rail: filters — drawer on mobile, static on md+ */}
      {filtersOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/40"
          onClick={() => setFiltersOpen(false)}
        />
      )}
      <aside
        className={`${
          filtersOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0 fixed md:static left-0 top-0 md:top-auto z-40 md:z-auto h-full w-64 md:w-56 border-r p-4 space-y-4 overflow-y-auto shrink-0 bg-background transition-transform`}
      >
        <div className="flex items-center justify-between md:hidden">
          <span className="text-sm font-semibold">Filters</span>
          <button onClick={() => setFiltersOpen(false)} className="p-1 rounded hover:bg-accent">
            <X className="w-4 h-4" />
          </button>
        </div>
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
          <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
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
        </div>
      </aside>

      {/* Middle: list */}
      <div className="flex-1 flex flex-col min-w-0 border-r">
        <div className="p-3 sm:p-4 border-b flex items-center gap-2">
          <button
            className={`${btnBase} md:hidden`}
            onClick={() => setFiltersOpen(true)}
            aria-label="Filters"
          >
            <Filter className="w-4 h-4" />
          </button>
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <button className={btnBase} onClick={() => setAddOpen((v) => !v)}>
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add</span>
          </button>
        </div>
        {addOpen && (
          <div className="border-b p-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <Input placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input type="email" placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <button className={btnPrimary} onClick={addContact}>Save</button>
            {addError && <p className="text-xs text-destructive sm:col-span-3">{addError}</p>}
          </div>
        )}
        <div className="px-4 py-2 text-xs text-muted-foreground border-b">
          {loading ? "Loading..." : `${filtered.length} contact${filtered.length === 1 ? "" : "s"}`}
        </div>
        <ul className="divide-y flex-1 overflow-y-auto">
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
      </div>

      <ContactDrawer
        prospectId={selectedId}
        onClose={() => setSelectedId(null)}
        onSaved={async (id) => {
          const { data } = await supabase.from("prospects").select("*").eq("id", id).single();
          if (data) setProspects((prev) => prev.map((p) => (p.id === id ? (data as Prospect) : p)));
        }}
      />
    </div>
  );
}
