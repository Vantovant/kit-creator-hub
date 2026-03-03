import { useState } from "react";
import { useMeetings, PlanMeeting } from "@/hooks/usePlanData";
import { Plus, Loader2, Trash2, Search, Clock, MapPin, Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

export function MeetingsTab() {
  const { meetings, loading, create, update, remove } = useMeetings();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PlanMeeting | null>(null);
  const [form, setForm] = useState({ title: "", description: "", start_time: "", end_time: "", location: "", notes: "" });

  const filtered = meetings.filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()));

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", start_time: "", end_time: "", location: "", notes: "" });
    setDrawerOpen(true);
  };

  const openEdit = (m: PlanMeeting) => {
    setEditing(m);
    setForm({
      title: m.title,
      description: m.description || "",
      start_time: m.start_time ? m.start_time.slice(0, 16) : "",
      end_time: m.end_time ? m.end_time.slice(0, 16) : "",
      location: m.location || "",
      notes: m.notes || "",
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.start_time) return;
    const payload = {
      title: form.title,
      description: form.description || null,
      start_time: new Date(form.start_time).toISOString(),
      end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
      location: form.location || null,
      notes: form.notes || null,
    };
    if (editing) {
      await update(editing.id, payload);
    } else {
      await create(payload);
    }
    setDrawerOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search meetings..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary" />
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Meeting
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No meetings found.</div>
        ) : (
          filtered.map(m => (
            <div key={m.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openEdit(m)}>
              <Clock className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                  <span>{new Date(m.start_time).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                  {m.end_time && <span>→ {new Date(m.end_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                  {m.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.location}</span>}
                  {Array.isArray(m.attendees) && m.attendees.length > 0 && (
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{m.attendees.length}</span>
                  )}
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); remove(m.id); }} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))
        )}
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>{editing ? "Edit Meeting" : "New Meeting"}</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2} className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none resize-none text-foreground focus:ring-1 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Start Time</label>
                <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">End Time</label>
                <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                rows={3} className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none resize-none text-foreground focus:ring-1 focus:ring-primary" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                {editing ? "Update" : "Create"}
              </button>
              <button onClick={() => setDrawerOpen(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors">Cancel</button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
