import { useState, useEffect, useRef, useCallback } from "react";
import { useNotes, PlanNote } from "@/hooks/usePlanData";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2, Trash2, FileText, Sparkles, Check, X, Video, CalendarPlus, Bell, ListTodo } from "lucide-react";
import { DictationMic } from "@/components/plan/DictationMic";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type ExtractedAction = {
  type: "task" | "reminder" | "meeting";
  title: string;
  description?: string;
  datetime?: string;
  due_at?: string;
  remind_at?: string;
  start_at?: string;
  duration?: number;
  link?: string;
  priority?: string;
  source_text?: string;
  project_id?: string;
  selected?: boolean;
};

const PRIORITY_MAP: Record<string, string> = { P1: "critical", P2: "high", P3: "medium", P4: "low" };
const MEETING_KEYWORDS = /\b(zoom|teams|meet\.google|meeting|call|sync)\b|https?:\/\/(zoom\.us|teams\.microsoft|meet\.google)/i;

export function NotesTab({ projectId }: { projectId?: string }) {
  const { notes, loading, upsert, remove } = useNotes();
  const [selected, setSelected] = useState<PlanNote | null>(null);
  const [content, setContent] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Extract actions state
  const [extracting, setExtracting] = useState(false);
  const [actions, setActions] = useState<ExtractedAction[]>([]);
  const [showReview, setShowReview] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<string | null>(null);

  // Highlight-to-convert
  const [floatingMenu, setFloatingMenu] = useState<{ x: number; y: number; text: string } | null>(null);
  const [prefillModal, setPrefillModal] = useState<{ type: string; title: string } | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Meeting banner
  const [showMeetingBanner, setShowMeetingBanner] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (selected) setContent(selected.content || "");
  }, [selected?.id]);

  // Detect meeting keywords in content
  useEffect(() => {
    setShowMeetingBanner(MEETING_KEYWORDS.test(content));
  }, [content]);

  const handleChange = (val: string) => {
    setContent(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (selected) upsert({ id: selected.id, content: val });
    }, 1500);
  };

  const createToday = async () => {
    const existing = notes.find(n => n.note_date === todayStr);
    if (existing) { setSelected(existing); } else { await upsert({ note_date: todayStr, content: "" }); }
  };

  // A) Extract Actions
  const extractActions = async () => {
    if (!content.trim()) return;
    setExtracting(true);
    setActions([]);
    try {
      const { data, error } = await supabase.functions.invoke("plan-ai-extract-actions", {
        body: { note_content: content, note_date: selected?.note_date || todayStr, project_id: projectId },
      });
      if (error) throw error;
      const items: ExtractedAction[] = (data?.actions || []).map((a: ExtractedAction) => ({ ...a, selected: true }));
      if (items.length === 0) {
        setApplyResult("No actionable items found in this note.");
        setTimeout(() => setApplyResult(null), 3000);
      } else {
        setActions(items);
        setShowReview(true);
      }
    } catch (e: any) {
      console.error(e);
      setApplyResult(e?.message || "Failed to extract actions");
      setTimeout(() => setApplyResult(null), 4000);
    } finally {
      setExtracting(false);
    }
  };

  // B) Apply Selected
  const applySelected = async () => {
    const toApply = actions.filter(a => a.selected);
    if (!toApply.length) return;
    setApplying(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setApplying(false); return; }

    let created = { tasks: 0, reminders: 0, meetings: 0 };
    for (const a of toApply) {
      const pid = a.project_id || projectId || null;
      if (a.type === "task") {
        await supabase.from("plan_tasks").insert({
          user_id: user.id, title: a.title, description: a.description || null,
          priority: PRIORITY_MAP[a.priority || "P3"] || "medium",
          due_date: a.due_at || a.datetime || null, project_id: pid, source: "ai_extract",
        } as any);
        created.tasks++;
      } else if (a.type === "reminder") {
        await supabase.from("plan_reminders").insert({
          user_id: user.id, title: a.title, description: a.description || null,
          reminder_time: a.remind_at || a.datetime || new Date().toISOString(), project_id: pid,
        } as any);
        created.reminders++;
      } else if (a.type === "meeting") {
        const start = a.start_at || a.datetime || new Date().toISOString();
        const dur = a.duration || 30;
        const end = new Date(new Date(start).getTime() + dur * 60000).toISOString();
        await supabase.from("plan_meetings").insert({
          user_id: user.id, title: a.title, description: a.description || null,
          start_time: start, end_time: end, location: a.link || null, project_id: pid,
        } as any);
        created.meetings++;
      }
    }
    setApplying(false);
    setShowReview(false);
    setActions([]);
    const parts = [];
    if (created.tasks) parts.push(`${created.tasks} task(s)`);
    if (created.reminders) parts.push(`${created.reminders} reminder(s)`);
    if (created.meetings) parts.push(`${created.meetings} meeting(s)`);
    setApplyResult(`✅ Created ${parts.join(", ")}`);
    setTimeout(() => setApplyResult(null), 4000);
  };

  // C) Highlight-to-convert
  const handleTextSelect = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !editorRef.current) { setFloatingMenu(null); return; }
    const text = sel.toString().trim();
    if (!text || text.length < 3) { setFloatingMenu(null); return; }
    const rect = editorRef.current.getBoundingClientRect();
    // Position floating menu near top-right of textarea
    setFloatingMenu({ x: rect.right - 200, y: rect.top + 8, text });
  }, []);

  useEffect(() => {
    document.addEventListener("mouseup", handleTextSelect);
    return () => document.removeEventListener("mouseup", handleTextSelect);
  }, [handleTextSelect]);

  const convertHighlight = async (type: string) => {
    if (!floatingMenu) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    setPrefillModal({ type, title: floatingMenu.text.slice(0, 80) });
    setFloatingMenu(null);
  };

  const confirmPrefill = async () => {
    if (!prefillModal) return;
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    const pid = projectId || null;
    if (prefillModal.type === "task") {
      await supabase.from("plan_tasks").insert({ user_id: user.id, title: prefillModal.title, project_id: pid, source: "note_highlight" } as any);
    } else if (prefillModal.type === "reminder") {
      await supabase.from("plan_reminders").insert({ user_id: user.id, title: prefillModal.title, reminder_time: new Date().toISOString(), project_id: pid } as any);
    } else if (prefillModal.type === "meeting") {
      await supabase.from("plan_meetings").insert({ user_id: user.id, title: prefillModal.title, start_time: new Date().toISOString(), project_id: pid } as any);
    }
    setApplyResult(`✅ Created ${prefillModal.type}: "${prefillModal.title}"`);
    setTimeout(() => setApplyResult(null), 3000);
    setPrefillModal(null);
  };

  // D) Smart meeting convert
  const convertToMeeting = () => {
    setPrefillModal({ type: "meeting", title: content.split("\n").find(l => MEETING_KEYWORDS.test(l))?.slice(0, 80) || "Meeting from note" });
  };

  const typeIcon = (t: string) => t === "task" ? <ListTodo className="w-3.5 h-3.5" /> : t === "reminder" ? <Bell className="w-3.5 h-3.5" /> : <CalendarPlus className="w-3.5 h-3.5" />;
  const typeColor = (t: string) => t === "task" ? "text-primary" : t === "reminder" ? "text-yellow-500" : "text-green-500";

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      {/* Note list */}
      <div className="space-y-3">
        <button onClick={createToday} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
          <Plus className="w-4 h-4" /> Today's Note
        </button>
        <div className="bg-card border border-border rounded-xl divide-y divide-border max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
          ) : notes.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notes yet.</div>
          ) : (
            notes.map(n => (
              <div key={n.id} onClick={() => setSelected(n)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${selected?.id === n.id ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{n.note_date}</p>
                  <p className="text-xs text-muted-foreground truncate">{(n.content || "").slice(0, 60) || "Empty note"}</p>
                </div>
                <button onClick={e => { e.stopPropagation(); remove(n.id); }} className="p-1 rounded hover:bg-destructive/10">
                  <Trash2 className="w-3 h-3 text-destructive" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Editor + Actions */}
      <div className="lg:col-span-2 space-y-3">
        {selected ? (
          <>
            <div className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-center justify-between mb-3 gap-2">
                <h3 className="text-sm font-semibold text-foreground">📝 {selected.note_date}</h3>
                <div className="flex items-center gap-2">
                  <DictationMic onTranscript={(text) => {
                    const newContent = content + (content && !content.endsWith(" ") && !content.endsWith("\n") ? " " : "") + text;
                    handleChange(newContent);
                  }} />
                  <span className="text-[10px] text-muted-foreground">Auto-saves after 1.5s</span>
                </div>
              </div>
              <textarea
                ref={editorRef}
                value={content}
                onChange={e => handleChange(e.target.value)}
                placeholder="Start writing... (Markdown supported)"
                className="w-full h-[40vh] px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none resize-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary font-mono"
              />

              {/* D) Smart meeting banner */}
              {showMeetingBanner && (
                <div className="mt-2 flex items-center gap-2 p-2.5 rounded-lg bg-green-500/10 border border-green-500/20">
                  <Video className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-xs text-foreground flex-1">This looks like a meeting — convert to Meeting?</span>
                  <button onClick={convertToMeeting} className="text-xs font-medium px-2.5 py-1 rounded bg-green-600 text-white hover:bg-green-700 transition-colors">
                    Convert
                  </button>
                </div>
              )}

              {/* A) Extract Actions button */}
              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={extractActions}
                  disabled={extracting || !content.trim()}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-medium hover:bg-accent/80 transition-colors disabled:opacity-50"
                >
                  {extracting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  Extract Actions
                </button>
                {applyResult && <span className="text-xs text-muted-foreground">{applyResult}</span>}
              </div>
            </div>

            {/* B) Review list */}
            {showReview && actions.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground">Suggested Actions ({actions.filter(a => a.selected).length}/{actions.length})</h4>
                  <button onClick={() => { setShowReview(false); setActions([]); }} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <div className="space-y-2 max-h-[30vh] overflow-y-auto">
                  {actions.map((a, i) => (
                    <label key={i} className={`flex items-start gap-3 p-2.5 rounded-lg border transition-colors cursor-pointer ${a.selected ? "border-primary/30 bg-primary/5" : "border-border bg-muted/20"}`}>
                      <input type="checkbox" checked={!!a.selected} onChange={() => {
                        setActions(prev => prev.map((x, j) => j === i ? { ...x, selected: !x.selected } : x));
                      }} className="mt-0.5 rounded" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className={typeColor(a.type)}>{typeIcon(a.type)}</span>
                          <span className="text-xs font-medium uppercase text-muted-foreground">{a.type}</span>
                          {a.priority && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{a.priority}</span>}
                        </div>
                        <p className="text-sm font-medium text-foreground mt-0.5">{a.title}</p>
                        {a.source_text && <p className="text-[11px] text-muted-foreground mt-0.5 italic truncate">"{a.source_text}"</p>}
                        {(a.datetime || a.due_at || a.remind_at || a.start_at) && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">📅 {a.start_at || a.remind_at || a.due_at || a.datetime}</p>
                        )}
                        {a.link && <p className="text-[11px] text-primary mt-0.5 truncate">🔗 {a.link}</p>}
                      </div>
                    </label>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button onClick={applySelected} disabled={applying || !actions.some(a => a.selected)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                    {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Apply Selected ({actions.filter(a => a.selected).length})
                  </button>
                  <button onClick={() => setActions(prev => prev.map(a => ({ ...a, selected: !actions.every(x => x.selected) })))}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Toggle All
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground h-full flex items-center justify-center">
            Select a note or create today's note to start writing.
          </div>
        )}
      </div>

      {/* C) Floating highlight menu */}
      {floatingMenu && (
        <div className="fixed z-50 flex items-center gap-1 p-1 rounded-lg bg-popover border border-border shadow-lg"
          style={{ left: floatingMenu.x, top: floatingMenu.y }}>
          <button onClick={() => convertHighlight("task")} className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-muted transition-colors">
            <ListTodo className="w-3 h-3 text-primary" /> Task
          </button>
          <button onClick={() => convertHighlight("reminder")} className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-muted transition-colors">
            <Bell className="w-3 h-3 text-yellow-500" /> Reminder
          </button>
          <button onClick={() => convertHighlight("meeting")} className="flex items-center gap-1 px-2 py-1 rounded text-xs hover:bg-muted transition-colors">
            <CalendarPlus className="w-3 h-3 text-green-500" /> Meeting
          </button>
        </div>
      )}

      {/* Prefill confirmation modal */}
      <Dialog open={!!prefillModal} onOpenChange={() => setPrefillModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 capitalize">
              {prefillModal && typeIcon(prefillModal.type)} Create {prefillModal?.type}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Title</label>
              <input value={prefillModal?.title || ""} onChange={e => setPrefillModal(p => p ? { ...p, title: e.target.value } : p)}
                className="w-full mt-1 px-3 py-2 text-sm rounded-lg bg-muted border border-border outline-none focus:ring-1 focus:ring-primary text-foreground" />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setPrefillModal(null)} className="px-3 py-1.5 text-xs rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
            <button onClick={confirmPrefill} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">Create</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
