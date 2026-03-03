import { useSearchParams } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TodayTab } from "@/components/plan/TodayTab";
import { TasksTab } from "@/components/plan/TasksTab";
import { RemindersTab } from "@/components/plan/RemindersTab";
import { MeetingsTab } from "@/components/plan/MeetingsTab";
import { CalendarTab } from "@/components/plan/CalendarTab";
import { NotesTab } from "@/components/plan/NotesTab";
import { CommandBar } from "@/components/plan/CommandBar";
import { InsiderPanel } from "@/components/plan/InsiderPanel";
import { CommandMic } from "@/components/plan/CommandMic";
import { useTasks, useReminders, useMeetings } from "@/hooks/usePlanData";
import { Command } from "lucide-react";

const TABS = [
  { value: "today", label: "Today" },
  { value: "tasks", label: "Tasks" },
  { value: "reminders", label: "Reminders" },
  { value: "meetings", label: "Meetings" },
  { value: "calendar", label: "Calendar" },
  { value: "notes", label: "Notes" },
];

export default function PlanPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "today";
  const { create: createTask } = useTasks();
  const { create: createReminder } = useReminders();
  const { create: createMeeting } = useMeetings();

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const handleVoiceConfirm = async (intent: { type: string; title: string; description?: string; datetime?: string; location?: string }) => {
    if (intent.type === "task") {
      await createTask({ title: intent.title, description: intent.description || null });
    } else if (intent.type === "reminder") {
      await createReminder({
        title: intent.title,
        description: intent.description || null,
        reminder_time: intent.datetime || new Date().toISOString(),
      });
    } else if (intent.type === "meeting") {
      await createMeeting({
        title: intent.title,
        description: intent.description || null,
        start_time: intent.datetime || new Date().toISOString(),
        location: intent.location || null,
      });
    }
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Plan" subtitle="Command Center — organise your day, tasks, meetings, and notes" />
      <div className="flex">
        <div className="flex-1 p-6">
          {/* Toolbar: ⌘K hint + Voice */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors"
            >
              <Command className="w-3 h-3" />
              <span>Search & Commands</span>
              <kbd className="text-[10px] px-1 py-0.5 rounded bg-background border border-border ml-1">⌘K</kbd>
            </button>
            <CommandMic onConfirm={handleVoiceConfirm} variant="header" />
            <CommandMic onConfirm={handleVoiceConfirm} variant="fab" />
          </div>

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              {TABS.map(t => (
                <TabsTrigger key={t.value} value={t.value} className="text-xs sm:text-sm">
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value="today"><TodayTab /></TabsContent>
            <TabsContent value="tasks"><TasksTab /></TabsContent>
            <TabsContent value="reminders"><RemindersTab /></TabsContent>
            <TabsContent value="meetings"><MeetingsTab /></TabsContent>
            <TabsContent value="calendar"><CalendarTab /></TabsContent>
            <TabsContent value="notes"><NotesTab /></TabsContent>
          </Tabs>
        </div>

        {/* Insider Panel - desktop right side */}
        <InsiderPanel activeTab={activeTab} />
      </div>

      {/* Global Command Bar */}
      <CommandBar
        onCreateTask={() => handleTabChange("tasks")}
        onCreateReminder={() => handleTabChange("reminders")}
        onCreateMeeting={() => handleTabChange("meetings")}
      />
    </div>
  );
}
