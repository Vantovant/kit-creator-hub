import { useState } from "react";
import { useReminders, PlanReminder } from "@/hooks/usePlanData";
import { Plus, Loader2, Trash2, Bell, BellOff, CheckCircle2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const FILTERS = ["all", "upcoming", "done", "overdue"] as const;

export function RemindersTab() {
  const { reminders, loading, create, update, remove } = useReminders();
  const [filter, setFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PlanReminder | null>(null);
  const [form, setForm] = useState({ title: "", description: "", reminder_time: "" });

  const now = new Date();
  const filtered = reminders.filter(r => {
    if (filter === "upcoming") return !r.is_done && new Date(r.reminder_time) >= now;
    if (filter === "done") return r.is_done;
    if (filter === "overdue") return !r.is_done && new Date(r.reminder_time) < now;
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", reminder_time: "" });
    setDrawerOpen(true);
  };

  const openEdit = (r: PlanReminder) => {
    setEditing(r);
    setForm({
      title: r.title,
      description: r.description || "",
      reminder_time: r.reminder_time ? r.reminder_time.slice(0, 16) : "",
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.reminder_time) return;
    if (editing) {
      await update(editing.id, {
        title: form.title,
        description: form.description || null,
        reminder_time: new Date(form.reminder_time).toISOString(),
      });
    } else {
      await create({
        title: form.title,
        description: form.description || null,
        reminder_time: new Date(form.reminder_time).toISOString(),
      });
    }
    setDrawerOpen(false);
  };

  const isOverdue = (r: PlanReminder) => !r.is_done && new Date(r.reminder_time) < now;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-2 flex-wrap">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Reminder
        </button>
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No reminders found.</div>
        ) : (
          filtered.map(r => (
            <div key={r.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
              <button onClick={() => update(r.id, { is_done: !r.is_done })} className="flex-shrink-0">
                {r.is_done
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : <Bell className={`w-5 h-5 ${isOverdue(r) ? "text-destructive" : "text-amber-500"}`} />}
              </button>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(r)}>
                <p className={`text-sm font-medium truncate ${r.is_done ? "line-through text-muted-foreground" : "text-foreground"}`}>{r.title}</p>
                <p className={`text-xs ${isOverdue(r) ? "text-destructive" : "text-muted-foreground"}`}>
                  {new Date(r.reminder_time).toLocaleString()}
                  {isOverdue(r) && " · Overdue"}
                </p>
              </div>
              <button onClick={() => remove(r.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))
        )}
      </div>

      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader><SheetTitle>{editing ? "Edit Reminder" : "New Reminder"}</SheetTitle></SheetHeader>
          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none resize-none text-foreground focus:ring-1 focus:ring-primary" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Reminder Time</label>
              <input type="datetime-local" value={form.reminder_time} onChange={e => setForm(f => ({ ...f, reminder_time: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
                {editing ? "Update" : "Create"}
              </button>
              <button onClick={() => setDrawerOpen(false)} className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
