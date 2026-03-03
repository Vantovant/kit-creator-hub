import { useState } from "react";
import { useTasks, PlanTask } from "@/hooks/usePlanData";
import {
  Search, Plus, CheckCircle2, Circle, Loader2, Trash2, Edit2,
  AlertTriangle, AlertCircle, ArrowUp, Minus
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";

const PRIORITY_CONFIG: Record<string, { label: string; class: string; icon: React.ReactNode }> = {
  critical: { label: "Critical", class: "bg-destructive/10 text-destructive border-destructive/20", icon: <AlertCircle className="w-3 h-3" /> },
  high: { label: "High", class: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: <AlertTriangle className="w-3 h-3" /> },
  medium: { label: "Medium", class: "bg-primary/10 text-primary border-primary/20", icon: <ArrowUp className="w-3 h-3" /> },
  low: { label: "Low", class: "bg-muted text-muted-foreground border-border", icon: <Minus className="w-3 h-3" /> },
};

const FILTERS = ["all", "pending", "done", "critical", "high"] as const;

export function TasksTab() {
  const { tasks, loading, create, update, remove } = useTasks();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<PlanTask | null>(null);
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", due_date: "", status: "pending" });

  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === "pending") return t.status === "pending";
    if (filter === "done") return t.status === "done";
    if (filter === "critical") return t.priority === "critical";
    if (filter === "high") return t.priority === "high";
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", description: "", priority: "medium", due_date: "", status: "pending" });
    setDrawerOpen(true);
  };

  const openEdit = (t: PlanTask) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || "",
      priority: t.priority,
      due_date: t.due_date ? t.due_date.slice(0, 10) : "",
      status: t.status,
    });
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) return;
    if (editing) {
      await update(editing.id, {
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        status: form.status,
        completed_at: form.status === "done" ? new Date().toISOString() : null,
      });
    } else {
      await create({
        title: form.title,
        description: form.description || null,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
      });
    }
    setDrawerOpen(false);
  };

  const toggleDone = async (t: PlanTask) => {
    const newStatus = t.status === "done" ? "pending" : "done";
    await update(t.id, {
      status: newStatus,
      completed_at: newStatus === "done" ? new Date().toISOString() : null,
    });
  };

  const pri = (p: string) => PRIORITY_CONFIG[p] || PRIORITY_CONFIG.medium;

  return (
    <div className="space-y-4">
      {/* Search + Filter + Add */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
          />
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Task List */}
      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {loading ? (
          <div className="p-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No tasks found. Create one to get started.</div>
        ) : (
          filtered.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
              <button onClick={() => toggleDone(t)} className="flex-shrink-0">
                {t.status === "done"
                  ? <CheckCircle2 className="w-5 h-5 text-green-500" />
                  : <Circle className="w-5 h-5 text-muted-foreground" />}
              </button>
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEdit(t)}>
                <p className={`text-sm font-medium truncate ${t.status === "done" ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${pri(t.priority).class}`}>
                    {pri(t.priority).icon} {pri(t.priority).label}
                  </span>
                  {t.due_date && (
                    <span className="text-[10px] text-muted-foreground">
                      Due {new Date(t.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => remove(t.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Task" : "New Task"}</SheetTitle>
          </SheetHeader>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Priority</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Due Date</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground" />
              </div>
            </div>
            {editing && (
              <div>
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground">
                  <option value="pending">Pending</option>
                  <option value="done">Done</option>
                </select>
              </div>
            )}
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
