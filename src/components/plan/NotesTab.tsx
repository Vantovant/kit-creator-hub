import { useState, useEffect, useRef } from "react";
import { useNotes, PlanNote } from "@/hooks/usePlanData";
import { Plus, Loader2, Trash2, FileText } from "lucide-react";

export function NotesTab() {
  const { notes, loading, upsert, remove } = useNotes();
  const [selected, setSelected] = useState<PlanNote | null>(null);
  const [content, setContent] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const todayStr = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (selected) setContent(selected.content || "");
  }, [selected?.id]);

  const handleChange = (val: string) => {
    setContent(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (selected) {
        upsert({ id: selected.id, content: val });
      }
    }, 1500);
  };

  const createToday = async () => {
    const existing = notes.find(n => n.note_date === todayStr);
    if (existing) {
      setSelected(existing);
    } else {
      await upsert({ note_date: todayStr, content: "" });
    }
  };

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
              <div key={n.id}
                onClick={() => setSelected(n)}
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

      {/* Editor */}
      <div className="lg:col-span-2">
        {selected ? (
          <div className="bg-card border border-border rounded-xl p-5 h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">📝 {selected.note_date}</h3>
              <span className="text-[10px] text-muted-foreground">Auto-saves after 1.5s</span>
            </div>
            <textarea
              value={content}
              onChange={e => handleChange(e.target.value)}
              placeholder="Start writing... (Markdown supported)"
              className="w-full h-[50vh] px-3 py-2 text-sm rounded-lg bg-muted border-0 outline-none resize-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary font-mono"
            />
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-sm text-muted-foreground h-full flex items-center justify-center">
            Select a note or create today's note to start writing.
          </div>
        )}
      </div>
    </div>
  );
}
