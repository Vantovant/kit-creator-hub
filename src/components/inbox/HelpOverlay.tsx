import { X } from "lucide-react";

const shortcuts: { keys: string; label: string }[] = [
  { keys: "j / k", label: "Next / previous message" },
  { keys: "↑ / ↓", label: "Next / previous message" },
  { keys: "e", label: "Archive / unarchive" },
  { keys: "s", label: "Star / unstar" },
  { keys: "r", label: "Mark as read" },
  { keys: "h", label: "Mark handled" },
  { keys: "z", label: "Snooze…" },
  { keys: "w", label: "Waiting on…" },
  { keys: "u", label: "Unsnooze / clear waiting" },
  { keys: "⌘ + K", label: "Command palette" },
  { keys: "?", label: "Show / hide this help" },
];

export function HelpOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold">Keyboard shortcuts</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 space-y-1">
          {shortcuts.map((s) => (
            <div key={s.keys} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-muted">
              <span className="text-sm">{s.label}</span>
              <kbd className="text-xs font-mono border rounded px-2 py-0.5">{s.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
