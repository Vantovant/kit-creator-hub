import { useSearchParams } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TodayTab } from "@/components/plan/TodayTab";
import { TasksTab } from "@/components/plan/TasksTab";
import { RemindersTab } from "@/components/plan/RemindersTab";
import { MeetingsTab } from "@/components/plan/MeetingsTab";
import { CalendarTab } from "@/components/plan/CalendarTab";
import { NotesTab } from "@/components/plan/NotesTab";

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

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Plan" subtitle="Command Center — organise your day, tasks, meetings, and notes" />
      <div className="p-6">
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
    </div>
  );
}
