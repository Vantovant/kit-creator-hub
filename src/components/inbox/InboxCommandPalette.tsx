import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { InboxAccount } from "@/hooks/useInboxAccounts";
import type { InboxFilter } from "@/hooks/useInbox";

type Command = { id: string; label: string; hint?: string; run: () => void };

export function InboxCommandPalette({
  open,
  onClose,
  accounts,
  setScope,
  setFilter,
  runAction,
  onHelp,
}: {
  open: boolean;
  onClose: () => void;
  accounts: InboxAccount[];
  setScope: (id: string | "all") => void;
  setFilter: (f: InboxFilter) => void;
  runAction: (action: string) => void;
  onHelp: () => void;
}) {
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  const commands: Command[] = useMemo(() => {
    const base: Command[] = [
      { id: "all", label: "Switch to: All Inboxes", run: () => setScope("all") },
      ...accounts.map((a) => ({
        id: `acct-${a.id}`,
        label: `Switch to: ${a.label || a.email_address}`,
        hint: a.email_address,
        run: () => setScope(a.id),
      })),
      { id: "f-inbox", label: "View: Inbox", run: () => setFilter("inbox") },
      { id: "f-starred", label: "View: Starred", run: () => setFilter("starred") },
      { id: "f-snoozed", label: "View: Snoozed", run: () => setFilter("snoozed") },
      { id: "f-waiting", label: "View: Waiting on", run: () => setFilter("waiting") },
      { id: "f-handled", label: "View: Handled", run: () => setFilter("handled") },
      { id: "f-archive", label: "View: Archive", run: () => setFilter("archive") },
      { id: "a-archive", label: "Action: Archive current", hint: "e", run: () => runAction("archive") },
      { id: "a-star", label: "Action: Star current", hint: "s", run: () => runAction("star") },
      { id: "a-handled", label: "Action: Mark handled", hint: "h", run: () => runAction("handled") },
      { id: "a-unsnooze", label: "Action: Unsnooze current", hint: "u", run: () => runAction("unsnooze") },
      { id: "help", label: "Show keyboard shortcuts", hint: "?", run: onHelp },
    ];
    if (!q.trim()) return base;
    const needle = q.toLowerCase();
    return base.filter((c) => c.label.toLowerCase().includes(needle));
  }, [q, accounts, setScope, setFilter, runAction, onHelp]);

  useEffect(() => { if (open) { setQ(""); setIdx(0); } }, [open]);
  useEffect(() => { setIdx(0); }, [q]);

  if (!open) return null;

  const pick = (c?: Command) => { if (c) { c.run(); onClose(); } };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-32 px-4" onClick={onClose}>
      <div className="bg-background border rounded-lg shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-3 py-2 border-b">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, commands.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              else if (e.key === "Enter") { e.preventDefault(); pick(commands[idx]); }
              else if (e.key === "Escape") onClose();
            }}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent outline-none text-sm py-1"
          />
          <button onClick={onClose} className="text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="max-h-80 overflow-y-auto p-1">
          {commands.length === 0 && (
            <div className="px-3 py-4 text-sm text-muted-foreground">No matches</div>
          )}
          {commands.map((c, i) => (
            <button
              key={c.id}
              onMouseEnter={() => setIdx(i)}
              onClick={() => pick(c)}
              className={`w-full flex items-center justify-between text-left text-sm px-3 py-2 rounded ${i === idx ? "bg-muted" : ""}`}
            >
              <span>{c.label}</span>
              {c.hint && <kbd className="text-[10px] font-mono border rounded px-1.5 py-0.5">{c.hint}</kbd>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
