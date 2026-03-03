import { useTasks, useReminders, useMeetings } from "@/hooks/usePlanData";
import {
  CalendarCheck, Bell, AlertTriangle, CheckCircle2, Circle, Clock, MapPin
} from "lucide-react";

export function TodayTab() {
  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const { meetings } = useMeetings();

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const todayMeetings = meetings.filter(m => m.start_time.slice(0, 10) === todayStr);
  const urgentReminders = reminders.filter(r => !r.is_done && new Date(r.reminder_time) <= in48h && new Date(r.reminder_time) >= now);
  const topPriorities = tasks
    .filter(t => t.status === "pending")
    .sort((a, b) => {
      const order: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
    })
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <CalendarCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{todayMeetings.length}</p>
            <p className="text-xs text-muted-foreground">Today's Meetings</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{urgentReminders.length}</p>
            <p className="text-xs text-muted-foreground">Urgent Reminders (48h)</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{topPriorities.length}</p>
            <p className="text-xs text-muted-foreground">Top Priorities</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Priorities */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">🎯 Top Priorities</h3>
          {topPriorities.length === 0 ? (
            <p className="text-sm text-muted-foreground">All caught up! No pending tasks.</p>
          ) : (
            <div className="space-y-2">
              {topPriorities.map(t => (
                <div key={t.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{t.title}</p>
                    {t.due_date && <p className="text-[10px] text-muted-foreground">Due {new Date(t.due_date).toLocaleDateString()}</p>}
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    t.priority === "critical" ? "bg-destructive/10 text-destructive" :
                    t.priority === "high" ? "bg-amber-500/10 text-amber-600" :
                    "bg-primary/10 text-primary"
                  }`}>{t.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's Meetings */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">📅 Today's Meetings</h3>
          {todayMeetings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meetings scheduled for today.</p>
          ) : (
            <div className="space-y-2">
              {todayMeetings.map(m => (
                <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span>{new Date(m.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      {m.location && <><MapPin className="w-3 h-3" /><span>{m.location}</span></>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Urgent Reminders */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">⏰ Urgent Reminders</h3>
          {urgentReminders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No urgent reminders in the next 48 hours.</p>
          ) : (
            <div className="space-y-2">
              {urgentReminders.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <Bell className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{r.title}</p>
                    <p className="text-[10px] text-muted-foreground">{new Date(r.reminder_time).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Compliance Widget */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">📋 Compliance</h3>
          <p className="text-sm text-muted-foreground">No regulatory deadlines configured yet.</p>
        </div>
      </div>
    </div>
  );
}
