import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTasks, useReminders, useMeetings } from "@/hooks/usePlanData";
import { Bot, ChevronDown, ChevronUp, Loader2, ThumbsUp, ThumbsDown, Sparkles, X, ToggleLeft, ToggleRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type Message = { role: "assistant" | "user"; content: string; logId?: string; rated?: boolean };

export function InsiderPanel({ activeTab }: { activeTab: string }) {
  const [open, setOpen] = useState(false);
  const [secretaryMode, setSecretaryMode] = useState(() => localStorage.getItem("insider_secretary") === "true");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [briefed, setBriefed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { tasks } = useTasks();
  const { reminders } = useReminders();
  const { meetings } = useMeetings();

  useEffect(() => { localStorage.setItem("insider_secretary", String(secretaryMode)); }, [secretaryMode]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages]);

  // Morning briefing on first open with Secretary Mode
  useEffect(() => {
    if (open && secretaryMode && !briefed) {
      setBriefed(true);
      askInsider("Give me my morning briefing: 3 Commands for Today. Summarize my top tasks, upcoming meetings, and urgent reminders.", "brief");
    }
  }, [open, secretaryMode, briefed]);

  const askInsider = async (userQuery: string, intent = "general") => {
    if (!userQuery.trim()) return;
    setMessages(prev => [...prev, { role: "user", content: userQuery }]);
    setLoading(true);

    const pendingTasks = tasks.filter(t => t.status === "pending").slice(0, 10);
    const upcomingMeetings = meetings.slice(0, 5);
    const urgentReminders = reminders.filter(r => !r.is_done).slice(0, 5);

    const contextSummary = `
PLAN CONTEXT (tab: ${activeTab}):
- ${pendingTasks.length} pending tasks: ${pendingTasks.map(t => `"${t.title}" (${t.priority})`).join(", ") || "none"}
- ${upcomingMeetings.length} meetings: ${upcomingMeetings.map(m => `"${m.title}" at ${new Date(m.start_time).toLocaleString()}`).join(", ") || "none"}
- ${urgentReminders.length} active reminders: ${urgentReminders.map(r => `"${r.title}" at ${new Date(r.reminder_time).toLocaleString()}`).join(", ") || "none"}
`;

    try {
      const { data, error } = await supabase.functions.invoke("copilot-answer", {
        body: {
          user_query: `[INSIDER MODE — Plan Assistant]\n${contextSummary}\n\nUser request: ${userQuery}`,
          context: { page: "plan", tab: activeTab, action: intent, secretary_mode: secretaryMode },
        },
      });

      const answer = data?.answer || "I couldn't generate a response. Please try again.";
      setMessages(prev => [...prev, { role: "assistant", content: answer, logId: data?.log_id }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const sendFeedback = async (logId: string, outcome: "helpful" | "not_helpful") => {
    setMessages(prev => prev.map(m => m.logId === logId ? { ...m, rated: true } : m));
    try {
      await supabase.functions.invoke("copilot-answer", {
        body: { feedback: { log_id: logId, outcome } },
      });
    } catch {}
  };

  const handleSend = () => {
    if (!input.trim()) return;
    askInsider(input);
    setInput("");
  };

  // Desktop: side panel. Mobile: bottom sheet via Sheet.
  const panelContent = (
    <div className="flex flex-col h-full">
      {/* Header controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">Insider</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">PhD Partner</span>
        </div>
        <button
          onClick={() => setSecretaryMode(s => !s)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title="Secretary Mode"
        >
          {secretaryMode ? <ToggleRight className="w-4 h-4 text-primary" /> : <ToggleLeft className="w-4 h-4" />}
          <span className="hidden sm:inline">Secretary</span>
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-8">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary/40" />
            <p className="font-medium">Insider is ready</p>
            <p className="text-xs mt-1">Ask about your tasks, prep for meetings, or get workflow advice.</p>
            {secretaryMode && (
              <button onClick={() => askInsider("Give me my morning briefing: 3 Commands for Today.", "brief")}
                className="mt-3 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors">
                🌅 Get Morning Briefing
              </button>
            )}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              <p className="whitespace-pre-wrap">{m.content}</p>
              {m.role === "assistant" && m.logId && !m.rated && (
                <div className="flex items-center gap-2 mt-2 pt-1 border-t border-border/30">
                  <button onClick={() => sendFeedback(m.logId!, "helpful")} className="p-1 rounded hover:bg-primary/10 transition-colors">
                    <ThumbsUp className="w-3 h-3 text-muted-foreground" />
                  </button>
                  <button onClick={() => sendFeedback(m.logId!, "not_helpful")} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                    <ThumbsDown className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
              )}
              {m.rated && <p className="text-[10px] text-muted-foreground mt-1">✓ Feedback sent</p>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-3 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSend()}
            placeholder="Ask Insider..."
            className="flex-1 px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
          />
          <button onClick={handleSend} disabled={loading || !input.trim()}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
            Send
          </button>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {[
            { label: "📋 Review my day", q: "Review my day: what should I focus on next?" },
            { label: "🎯 Prioritize tasks", q: "Help me prioritize my pending tasks based on urgency and impact." },
            { label: "📝 End-of-day review", q: "Write an end-of-day review summarizing what I accomplished and what's pending for tomorrow." },
          ].map(s => (
            <button key={s.label} onClick={() => askInsider(s.q)}
              className="text-[10px] px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 transition-colors">
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop: inline right panel */}
      <div className="hidden lg:flex flex-col w-80 border-l border-border bg-card h-[calc(100vh-120px)] sticky top-0">
        {panelContent}
      </div>

      {/* Mobile: toggle button + bottom sheet */}
      <div className="lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          <Bot className="w-5 h-5" />
        </button>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="bottom" className="h-[80vh] p-0 rounded-t-xl">
            <SheetHeader className="sr-only"><SheetTitle>Insider AI</SheetTitle></SheetHeader>
            {panelContent}
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
