import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTasks, useReminders, useMeetings, useNotes } from "@/hooks/usePlanData";
import { Search, ListTodo, Bell, CalendarDays, FileText, Plus, Mic, Command } from "lucide-react";

type Result = { type: "task" | "reminder" | "meeting" | "note" | "nav" | "create"; id?: string; title: string; subtitle?: string; action?: () => void };

export function CommandBar({ onCreateTask, onCreateReminder, onCreateMeeting }: {
  onCreateTask?: (prefill?: { title?: string; description?: string }) => void;
  onCreateReminder?: (prefill?: { title?: string; description?: string }) => void;
  onCreateMeeting?: (prefill?: { title?: string; description?: string }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const { meetings } = useMeetings();
  const { notes } = useNotes();

  // ⌘K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const results = useCallback((): Result[] => {
    const q = query.toLowerCase().trim();
    const items: Result[] = [];

    // Quick create actions (always show)
    const creates: Result[] = [
      { type: "create", title: "New Task", subtitle: "Create a task", action: () => { setOpen(false); onCreateTask?.(); } },
      { type: "create", title: "New Reminder", subtitle: "Create a reminder", action: () => { setOpen(false); onCreateReminder?.(); } },
      { type: "create", title: "New Meeting", subtitle: "Schedule a meeting", action: () => { setOpen(false); onCreateMeeting?.(); } },
    ];

    // Nav actions
    const navs: Result[] = [
      { type: "nav", title: "Go to Today", action: () => { setOpen(false); navigate("/dashboard/plan?tab=today"); } },
      { type: "nav", title: "Go to Tasks", action: () => { setOpen(false); navigate("/dashboard/plan?tab=tasks"); } },
      { type: "nav", title: "Go to Reminders", action: () => { setOpen(false); navigate("/dashboard/plan?tab=reminders"); } },
      { type: "nav", title: "Go to Meetings", action: () => { setOpen(false); navigate("/dashboard/plan?tab=meetings"); } },
      { type: "nav", title: "Go to Calendar", action: () => { setOpen(false); navigate("/dashboard/plan?tab=calendar"); } },
      { type: "nav", title: "Go to Notes", action: () => { setOpen(false); navigate("/dashboard/plan?tab=notes"); } },
    ];

    if (!q) {
      items.push(...creates, ...navs.slice(0, 3));
      return items;
    }

    // Search entities
    const matchedTasks = tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 5)
      .map(t => ({ type: "task" as const, id: t.id, title: t.title, subtitle: `${t.priority} · ${t.status}`, action: () => { setOpen(false); navigate("/dashboard/plan?tab=tasks"); } }));
    const matchedReminders = reminders.filter(r => r.title.toLowerCase().includes(q)).slice(0, 5)
      .map(r => ({ type: "reminder" as const, id: r.id, title: r.title, subtitle: new Date(r.reminder_time).toLocaleString(), action: () => { setOpen(false); navigate("/dashboard/plan?tab=reminders"); } }));
    const matchedMeetings = meetings.filter(m => m.title.toLowerCase().includes(q)).slice(0, 5)
      .map(m => ({ type: "meeting" as const, id: m.id, title: m.title, subtitle: new Date(m.start_time).toLocaleString(), action: () => { setOpen(false); navigate("/dashboard/plan?tab=meetings"); } }));
    const matchedNotes = notes.filter(n => (n.content || "").toLowerCase().includes(q)).slice(0, 5)
      .map(n => ({ type: "note" as const, id: n.id, title: `Note: ${n.note_date}`, subtitle: (n.content || "").slice(0, 60), action: () => { setOpen(false); navigate("/dashboard/plan?tab=notes"); } }));

    items.push(...matchedTasks, ...matchedReminders, ...matchedMeetings, ...matchedNotes);

    // Filter creates/navs by query
    const filteredCreates = creates.filter(c => c.title.toLowerCase().includes(q));
    const filteredNavs = navs.filter(n => n.title.toLowerCase().includes(q));
    items.push(...filteredCreates, ...filteredNavs);

    return items;
  }, [query, tasks, reminders, meetings, notes, navigate, onCreateTask, onCreateReminder, onCreateMeeting]);

  const allResults = results();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelected(s => Math.min(s + 1, allResults.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
    if (e.key === "Enter" && allResults[selected]) { allResults[selected].action?.(); }
  };

  const iconFor = (type: string) => {
    switch (type) {
      case "task": return <ListTodo className="w-4 h-4 text-primary" />;
      case "reminder": return <Bell className="w-4 h-4 text-amber-500" />;
      case "meeting": return <CalendarDays className="w-4 h-4 text-primary" />;
      case "note": return <FileText className="w-4 h-4 text-muted-foreground" />;
      case "create": return <Plus className="w-4 h-4 text-green-500" />;
      case "nav": return <Command className="w-4 h-4 text-muted-foreground" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-popover border border-border rounded-xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search tasks, reminders, meetings… or type a command"
            className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">ESC</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-1">
          {allResults.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No results found.</div>
          ) : (
            allResults.map((r, i) => (
              <button
                key={`${r.type}-${r.id || r.title}-${i}`}
                onClick={() => r.action?.()}
                onMouseEnter={() => setSelected(i)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${i === selected ? "bg-muted" : "hover:bg-muted/50"}`}
              >
                {iconFor(r.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                  {r.subtitle && <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>}
                </div>
                <span className="text-[10px] text-muted-foreground capitalize">{r.type}</span>
              </button>
            ))
          )}
        </div>
        <div className="px-4 py-2 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
          <span>↑↓ Navigate · ↵ Select · Esc Close</span>
          <span className="flex items-center gap-1"><Command className="w-3 h-3" />K</span>
        </div>
      </div>
    </div>
  );
}
