import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ReplyList } from "@/components/replies/ReplyList";
import { ReplyDetail } from "@/components/replies/ReplyDetail";
import { ReplyFilters } from "@/components/replies/ReplyFilters";
import { ReplySettings } from "@/components/replies/ReplySettings";
import { CommandCentre } from "@/components/email/CommandCentre";
import { useReplies, type ReplyFilter } from "@/hooks/useReplies";
import { useTasks, useReminders, useMeetings } from "@/hooks/usePlanData";
import { Settings, MailOpen } from "lucide-react";

type PlanPrefill = { type: "task" | "reminder" | "meeting"; title?: string; description?: string } | null;

export default function RepliesPage() {
  const [filter, setFilter] = useState<ReplyFilter>("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [planPrefill, setPlanPrefill] = useState<PlanPrefill>(null);

  const {
    replies, loading, selected, selectedId, setSelectedId,
    markRead, toggleStar, setStatus, setIntentTag, addNote, logAction,
  } = useReplies(filter);

  const { create: createTask } = useTasks();
  const { create: createReminder } = useReminders();
  const { create: createMeeting } = useMeetings();

  const replyContext = (prefix: string) => {
    if (!selected) return { title: prefix, description: "" };
    return {
      title: `${prefix}: ${selected.sender_name || selected.sender_email} — ${selected.subject || ""}`.slice(0, 120),
      description: `Reply from ${selected.sender_email}\n${selected.snippet || ""}`.slice(0, 300),
    };
  };

  const handleCreateTask = async () => {
    const ctx = replyContext("Follow up");
    await createTask({ title: ctx.title, description: ctx.description });
    if (selected) await logAction(selected.id, "created_task", ctx);
    setPlanPrefill({ type: "task", ...ctx });
  };

  const handleCreateReminder = async () => {
    const ctx = replyContext("Reminder");
    await createReminder({ title: ctx.title, description: ctx.description, reminder_time: new Date(Date.now() + 3600000).toISOString() });
    if (selected) await logAction(selected.id, "created_reminder", ctx);
    setPlanPrefill({ type: "reminder", ...ctx });
  };

  const handleCreateMeeting = async () => {
    const ctx = replyContext("Meeting");
    await createMeeting({ title: ctx.title, description: ctx.description, start_time: new Date(Date.now() + 86400000).toISOString() });
    if (selected) await logAction(selected.id, "created_meeting", ctx);
    setPlanPrefill({ type: "meeting", ...ctx });
  };

  const handleMarkHandled = async () => {
    if (!selected) return;
    await setStatus(selected.id, "handled");
    await logAction(selected.id, "marked_handled");
  };

  const handleMarkWaiting = async (waitingOn?: string) => {
    if (!selected) return;
    await setStatus(selected.id, "waiting", { waiting_on: waitingOn || "response" });
    await logAction(selected.id, "marked_waiting", { waiting_on: waitingOn });
  };

  const handleSnooze = async () => {
    if (!selected) return;
    const snoozedUntil = new Date(Date.now() + 86400000).toISOString();
    await setStatus(selected.id, "snoozed", { snoozed_until: snoozedUntil });
    await logAction(selected.id, "snoozed", { snoozed_until: snoozedUntil });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const idx = replies.findIndex(r => r.id === selectedId);

      switch (e.key.toLowerCase()) {
        case "j":
          e.preventDefault();
          if (idx < replies.length - 1) setSelectedId(replies[idx + 1]?.id || null);
          else if (idx === -1 && replies.length > 0) setSelectedId(replies[0].id);
          break;
        case "k":
          e.preventDefault();
          if (idx > 0) setSelectedId(replies[idx - 1].id);
          break;
        case "enter":
          if (idx >= 0 && !selected) setSelectedId(replies[idx].id);
          break;
        case "t":
          if (selected) { e.preventDefault(); handleCreateTask(); }
          break;
        case "m":
          if (selected) { e.preventDefault(); handleCreateMeeting(); }
          break;
        case "r":
          if (selected) { e.preventDefault(); handleCreateReminder(); }
          break;
        case "w":
          if (selected) { e.preventDefault(); handleMarkWaiting(); }
          break;
        case "s":
          if (selected) { e.preventDefault(); handleSnooze(); }
          break;
        case "x":
          if (selected) { e.preventDefault(); toggleStar(selected.id); }
          break;
        case "h":
          if (selected) { e.preventDefault(); handleMarkHandled(); }
          break;
        case "u":
          e.preventDefault();
          setFilter(f => f === "unread" ? "all" : "unread");
          break;
        case "escape":
          if (selectedId) { e.preventDefault(); setSelectedId(null); }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [replies, selectedId, selected]);

  return (
    <div className="min-h-screen flex flex-col">
      <DashboardHeader
        title="Reply Inbox"
        subtitle="Zazi Mail — Sequence & broadcast replies only"
      />

      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-2 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <MailOpen className="w-4 h-4" />
          <span>{replies.length} {filter === "all" ? "replies" : filter}</span>
        </div>
        <div className="flex-1" />
        <CommandCentre prefill={planPrefill} onClose={() => setPlanPrefill(null)} />
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
      </div>

      {/* Filter bar */}
      <ReplyFilters active={filter} onChange={setFilter} />

      {/* Main content: list + detail */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: reply list */}
        <div className={`w-full lg:w-[380px] lg:flex-shrink-0 border-r border-border overflow-y-auto ${selectedId ? "hidden lg:block" : ""}`}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <ReplyList
              replies={replies}
              selectedId={selectedId}
              onSelect={(id) => setSelectedId(id)}
              onToggleStar={toggleStar}
            />
          )}
        </div>

        {/* Right panel: detail */}
        <div className={`flex-1 ${!selectedId ? "hidden lg:flex" : "flex"} flex-col`}>
          {selected ? (
            <ReplyDetail
              reply={selected}
              onBack={() => setSelectedId(null)}
              onMarkHandled={handleMarkHandled}
              onMarkWaiting={handleMarkWaiting}
              onSnooze={handleSnooze}
              onToggleStar={() => toggleStar(selected.id)}
              onCreateTask={handleCreateTask}
              onCreateReminder={handleCreateReminder}
              onCreateMeeting={handleCreateMeeting}
              onMarkRead={() => markRead(selected.id)}
              onSetIntentTag={(tag) => { setIntentTag(selected.id, tag); logAction(selected.id, "set_intent", { tag }); }}
              onAddNote={(note) => addNote(selected.id, note)}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <MailOpen className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Select a reply to view details</p>
              <p className="text-xs mt-1">Use J/K to navigate, Enter to open</p>
            </div>
          )}
        </div>
      </div>

      <ReplySettings open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
