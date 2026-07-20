import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Very small horizontal resizer. Persists px widths in localStorage.
 */
export function useResizablePanels(storageKey: string, defaults: number[]) {
  const [widths, setWidths] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === defaults.length) return parsed;
      }
    } catch { /* ignore */ }
    return defaults;
  });

  const dragIndex = useRef<number | null>(null);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const widthsRef = useRef(widths);
  widthsRef.current = widths;

  const onMove = useCallback((e: PointerEvent) => {
    if (dragIndex.current === null) return;
    const delta = e.clientX - startX.current;
    const next = [...widthsRef.current];
    next[dragIndex.current] = Math.max(220, Math.min(900, startWidth.current + delta));
    setWidths(next);
  }, []);

  const onUp = useCallback(() => {
    if (dragIndex.current !== null) {
      try { localStorage.setItem(storageKey, JSON.stringify(widthsRef.current)); } catch { /* ignore */ }
    }
    dragIndex.current = null;
    document.body.style.cursor = "";
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }, [onMove, storageKey]);

  const startDrag = (index: number) => (e: React.PointerEvent) => {
    dragIndex.current = index;
    startX.current = e.clientX;
    startWidth.current = widths[index];
    document.body.style.cursor = "col-resize";
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  useEffect(() => () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
  }, [onMove, onUp]);

  return { widths, setWidths, startDrag };
}

export function ResizeHandle({ onPointerDown }: { onPointerDown: (e: React.PointerEvent) => void }) {
  return (
    <div
      onPointerDown={onPointerDown}
      className="w-1 shrink-0 bg-transparent hover:bg-primary/40 active:bg-primary cursor-col-resize transition-colors"
      role="separator"
      aria-orientation="vertical"
    />
  );
}
