import { useState, useRef, useCallback, useEffect } from "react";
import { Mic, MicOff, Pause, Play, Square } from "lucide-react";

type DictationState = "idle" | "recording" | "paused";

export function DictationMic({ onTranscript }: {
  onTranscript: (text: string) => void;
}) {
  const [state, setState] = useState<DictationState>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const accumulatedRef = useRef("");

  const supported = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window);

  // Timer
  useEffect(() => {
    if (state === "recording") {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [state]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const createRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += t;
        } else {
          interimText += t;
        }
      }
      if (finalText) {
        accumulatedRef.current += finalText;
        onTranscript(finalText);
      }
      setInterim(interimText);
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") {
        console.error("Dictation error:", e.error);
        stop();
      }
    };

    recognition.onend = () => {
      // Auto-restart if still recording (browser stops after silence)
      if (recognitionRef.current && state === "recording") {
        try { recognitionRef.current.start(); } catch {}
      }
    };

    return recognition;
  }, [onTranscript, state]);

  const start = useCallback(() => {
    if (!supported) {
      alert("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }
    accumulatedRef.current = "";
    setElapsed(0);
    setInterim("");
    const rec = createRecognition();
    recognitionRef.current = rec;
    rec.start();
    setState("recording");
  }, [supported, createRecognition]);

  const pause = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
    setState("paused");
    setInterim("");
  }, []);

  const resume = useCallback(() => {
    if (!supported) return;
    const rec = createRecognition();
    recognitionRef.current = rec;
    rec.start();
    setState("recording");
  }, [supported, createRecognition]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      recognitionRef.current = null;
    }
    setState("idle");
    setInterim("");
    setElapsed(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
      }
    };
  }, []);

  if (!supported) return null;

  if (state === "idle") {
    return (
      <button
        onClick={start}
        title="Dictate Notes (continuous speech-to-text)"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
      >
        <Mic className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Dictate</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-destructive/10 border border-destructive/20">
      {/* Live indicator */}
      <span className={`w-2 h-2 rounded-full ${state === "recording" ? "bg-destructive animate-pulse" : "bg-amber-500"}`} />

      {/* Timer */}
      <span className="text-xs font-mono text-foreground min-w-[3ch]">{formatTime(elapsed)}</span>

      {/* Interim text preview */}
      {interim && (
        <span className="text-[11px] text-muted-foreground truncate max-w-[120px] italic">
          {interim}
        </span>
      )}

      {/* Controls */}
      <div className="flex items-center gap-1 ml-auto">
        {state === "recording" ? (
          <button onClick={pause} title="Pause dictation"
            className="p-1 rounded hover:bg-muted transition-colors text-amber-600">
            <Pause className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button onClick={resume} title="Resume dictation"
            className="p-1 rounded hover:bg-muted transition-colors text-primary">
            <Play className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={stop} title="Stop dictation"
          className="p-1 rounded hover:bg-muted transition-colors text-destructive">
          <Square className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
