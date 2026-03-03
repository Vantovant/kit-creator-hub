import { useState, useMemo } from "react";
import { useTasks, useReminders, useMeetings } from "@/hooks/usePlanData";
import { ChevronLeft, ChevronRight } from "lucide-react";

type View = "month" | "week" | "day";

export function CalendarTab() {
  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const { meetings } = useMeetings();
  const [view, setView] = useState<View>("month");
  const [current, setCurrent] = useState(new Date());

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  const nav = (dir: number) => {
    const d = new Date(current);
    if (view === "month") d.setMonth(d.getMonth() + dir);
    else if (view === "week") d.setDate(d.getDate() + dir * 7);
    else d.setDate(d.getDate() + dir);
    setCurrent(d);
  };

  // Month grid
  const monthDays = useMemo(() => {
    const year = current.getFullYear(), month = current.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const startDay = first.getDay();
    const days: Date[] = [];
    for (let i = -startDay; i <= last.getDate() + (6 - last.getDay()) - 1; i++) {
      days.push(new Date(year, month, i + 1));
    }
    return days;
  }, [current]);

  const dotsForDate = (dateStr: string) => {
    const dots: string[] = [];
    if (meetings.some(m => m.start_time.slice(0, 10) === dateStr)) dots.push("bg-primary");
    if (reminders.some(r => r.reminder_time.slice(0, 10) === dateStr)) dots.push("bg-amber-500");
    if (tasks.some(t => t.due_date && t.due_date.slice(0, 10) === dateStr)) dots.push("bg-accent");
    return dots;
  };

  const monthLabel = current.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["month", "week", "day"] as View[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`text-xs px-3 py-1.5 rounded-full capitalize transition-colors ${view === v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => nav(-1)} className="p-1.5 rounded hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-sm font-medium text-foreground min-w-[140px] text-center">{monthLabel}</span>
          <button onClick={() => nav(1)} className="p-1.5 rounded hover:bg-muted transition-colors"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {view === "month" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-7 text-center text-xs text-muted-foreground font-medium border-b border-border">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
              <div key={d} className="py-2">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day, i) => {
              const ds = day.toISOString().slice(0, 10);
              const isToday = ds === todayStr;
              const isCurrentMonth = day.getMonth() === current.getMonth();
              const dots = dotsForDate(ds);
              return (
                <div key={i} className={`min-h-[60px] p-1.5 border-b border-r border-border ${!isCurrentMonth ? "opacity-30" : ""} ${isToday ? "bg-primary/5 ring-1 ring-primary/30 ring-inset" : ""}`}>
                  <span className={`text-xs ${isToday ? "font-bold text-primary" : "text-foreground"}`}>{day.getDate()}</span>
                  {dots.length > 0 && (
                    <div className="flex gap-0.5 mt-1">
                      {dots.map((c, j) => <div key={j} className={`w-1.5 h-1.5 rounded-full ${c}`} />)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {(view === "day" || view === "week") && (
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground">
            {view === "day" ? current.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : `Week of ${current.toLocaleDateString()}`}
          </p>
          <div className="mt-3 space-y-2">
            {meetings.filter(m => {
              const mDate = m.start_time.slice(0, 10);
              if (view === "day") return mDate === current.toISOString().slice(0, 10);
              const weekStart = new Date(current);
              weekStart.setDate(weekStart.getDate() - weekStart.getDay());
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              return mDate >= weekStart.toISOString().slice(0, 10) && mDate <= weekEnd.toISOString().slice(0, 10);
            }).map(m => (
              <div key={m.id} className="p-2 rounded-lg bg-primary/5 border border-primary/10">
                <p className="text-sm font-medium text-foreground">{m.title}</p>
                <p className="text-xs text-muted-foreground">{new Date(m.start_time).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Meetings</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Reminders</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-accent" /> Task Due</span>
      </div>
    </div>
  );
}
