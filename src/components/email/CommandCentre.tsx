import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TodayTab } from "@/components/plan/TodayTab";
import { TasksTab } from "@/components/plan/TasksTab";
import { RemindersTab } from "@/components/plan/RemindersTab";
import { MeetingsTab } from "@/components/plan/MeetingsTab";
import { CalendarTab } from "@/components/plan/CalendarTab";
import { NotesTab } from "@/components/plan/NotesTab";
import { ClipboardList, X } from "lucide-react";

const TABS = [
  { value: "today", label: "Today" },
  { value: "tasks", label: "Tasks" },
  { value: "reminders", label: "Reminders" },
  { value: "meetings", label: "Meetings" },
  { value: "calendar", label: "Calendar" },
  { value: "notes", label: "Notes" },
];

type Prefill = { type: "task" | "reminder" | "meeting"; title?: string; description?: string } | null;

export function CommandCentre({ prefill, onClose }: { prefill?: Prefill; onClose?: () => void }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("today");

  // Open with prefill
  useEffect(() => {
    if (prefill) {
      setOpen(true);
      if (prefill.type === "task") setTab("tasks");
      else if (prefill.type === "reminder") setTab("reminders");
      else if (prefill.type === "meeting") setTab("meetings");
    }
  }, [prefill]);

  const handleClose = () => {
    setOpen(false);
    onClose?.();
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
        title="Command Centre (Plan)"
      >
        <ClipboardList className="w-4 h-4" />
        <span className="hidden sm:inline">Command Centre</span>
      </button>

      <Sheet open={open} onOpenChange={v => { if (!v) handleClose(); else setOpen(true); }}>
        <SheetContent side="right" className="w-full sm:w-[60vw] sm:max-w-none p-0 overflow-y-auto">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2 text-base font-semibold">
                <ClipboardList className="w-5 h-5 text-primary" /> Command Centre
              </SheetTitle>
            </div>
          </SheetHeader>
          <div className="p-4">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4 flex-wrap h-auto gap-1">
                {TABS.map(t => (
                  <TabsTrigger key={t.value} value={t.value} className="text-xs">{t.label}</TabsTrigger>
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
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Hook: keyboard shortcuts T/M/R to open Command Centre from email views */
export function useEmailPlanShortcuts() {
  const [prefill, setPrefill] = useState<Prefill>(null);
  const [ccOpen, setCcOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire if typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setPrefill({ type: "task", title: "From email", description: "Created via keyboard shortcut" });
        setCcOpen(true);
      }
      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setPrefill({ type: "meeting", title: "Meeting from email" });
        setCcOpen(true);
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        setPrefill({ type: "reminder", title: "Reminder from email" });
        setCcOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return { prefill, ccOpen, setCcOpen, clearPrefill: () => setPrefill(null) };
}
