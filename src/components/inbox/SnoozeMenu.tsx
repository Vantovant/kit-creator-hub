import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";

function addHours(h: number) {
  return new Date(Date.now() + h * 3600 * 1000);
}
function nextAt(hour: number, days = 0) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  if (days === 0 && d.getTime() < Date.now()) d.setDate(d.getDate() + 1);
  return d;
}
function nextSaturday9() {
  const d = new Date();
  const daysUntil = (6 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntil);
  d.setHours(9, 0, 0, 0);
  return d;
}

export function SnoozeMenu({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (until: Date) => void;
}) {
  const [custom, setCustom] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  if (!open) return null;

  const opts: { label: string; sub: string; date: Date }[] = [
    { label: "In 1 hour", sub: addHours(1).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), date: addHours(1) },
    { label: "Later today", sub: nextAt(18).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), date: nextAt(18) },
    { label: "Tomorrow", sub: nextAt(9, 1).toLocaleDateString([], { weekday: "short" }) + " 9:00", date: nextAt(9, 1) },
    { label: "This weekend", sub: nextSaturday9().toLocaleDateString([], { weekday: "short" }) + " 9:00", date: nextSaturday9() },
    { label: "Next week", sub: nextAt(9, 7).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }), date: nextAt(9, 7) },
  ];

  return (
    <div
      ref={ref}
      className="absolute z-50 top-12 left-1/2 -translate-x-1/2 w-72 bg-popover border rounded-lg shadow-xl p-2"
    >
      <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground border-b mb-1">
        <Clock className="w-3.5 h-3.5" /> Snooze until…
      </div>
      {opts.map((o) => (
        <button
          key={o.label}
          onClick={() => { onPick(o.date); onClose(); }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm hover:bg-muted text-left"
        >
          <span>{o.label}</span>
          <span className="text-xs text-muted-foreground">{o.sub}</span>
        </button>
      ))}
      <div className="border-t mt-1 pt-2 px-2">
        <label className="text-xs text-muted-foreground">Custom date/time</label>
        <div className="flex gap-2 mt-1">
          <input
            type="datetime-local"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            className="flex-1 text-xs bg-background border rounded px-2 py-1"
          />
          <button
            disabled={!custom}
            onClick={() => { onPick(new Date(custom)); onClose(); }}
            className="text-xs px-2 py-1 rounded border hover:bg-muted disabled:opacity-40"
          >
            Set
          </button>
        </div>
      </div>
    </div>
  );
}
