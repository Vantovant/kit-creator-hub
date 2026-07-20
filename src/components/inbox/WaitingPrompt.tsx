import { useEffect, useRef, useState } from "react";
import { CheckCircle2 } from "lucide-react";

export function WaitingPrompt({
  open,
  onClose,
  onSubmit,
  defaultValue = "",
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (person: string) => void;
  defaultValue?: string;
}) {
  const [val, setVal] = useState(defaultValue);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setVal(defaultValue); }, [defaultValue, open]);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div ref={ref} className="absolute z-50 top-12 left-1/2 -translate-x-1/2 w-72 bg-popover border rounded-lg shadow-xl p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <CheckCircle2 className="w-3.5 h-3.5" /> Waiting on…
      </div>
      <input
        autoFocus
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && val.trim()) { onSubmit(val.trim()); onClose(); } }}
        placeholder="Person or reason (e.g. Vanto)"
        className="w-full text-sm bg-background border rounded px-2 py-1.5"
      />
      <div className="flex justify-end gap-2 mt-2">
        <button onClick={onClose} className="text-xs px-2 py-1 rounded border hover:bg-muted">Cancel</button>
        <button
          disabled={!val.trim()}
          onClick={() => { onSubmit(val.trim()); onClose(); }}
          className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-40"
        >
          Set
        </button>
      </div>
    </div>
  );
}
