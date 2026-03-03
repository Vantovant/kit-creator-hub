import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mic, MicOff, Loader2, Check, X, ListTodo, Bell, CalendarDays } from "lucide-react";

type ParsedIntent = {
  type: "task" | "reminder" | "meeting";
  title: string;
  description?: string;
  datetime?: string;
  location?: string;
};

export function VoiceCapture({ onConfirm }: {
  onConfirm: (intent: ParsedIntent) => Promise<void>;
}) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [parsedIntent, setParsedIntent] = useState<ParsedIntent | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition is not supported in this browser. Try Chrome.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      setListening(false);
      parseIntent(text);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
  }, []);

  const parseIntent = async (text: string) => {
    setLoading(true);
    setParsedIntent(null);
    try {
      const { data } = await supabase.functions.invoke("plan-intake", {
        body: { raw_text: text },
      });
      if (data?.intent) {
        setParsedIntent(data.intent);
      } else {
        // Fallback: treat as task
        setParsedIntent({ type: "task", title: text });
      }
    } catch {
      setParsedIntent({ type: "task", title: text });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!parsedIntent) return;
    setLoading(true);
    await onConfirm(parsedIntent);
    setConfirmed(true);
    setLoading(false);
    setTimeout(() => {
      setConfirmed(false);
      setTranscript("");
      setParsedIntent(null);
    }, 2000);
  };

  const handleCancel = () => {
    setParsedIntent(null);
    setTranscript("");
  };

  const iconFor = (type: string) => {
    switch (type) {
      case "task": return <ListTodo className="w-4 h-4 text-primary" />;
      case "reminder": return <Bell className="w-4 h-4 text-amber-500" />;
      case "meeting": return <CalendarDays className="w-4 h-4 text-primary" />;
      default: return <ListTodo className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative">
      {/* Header mic button */}
      <button
        onClick={startListening}
        disabled={listening}
        className={`p-2 rounded-lg transition-colors ${listening ? "bg-destructive/10 text-destructive animate-pulse" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
        title="Voice capture"
      >
        {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </button>

      {/* Confirmation Card */}
      {(parsedIntent || loading || confirmed) && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-popover border border-border rounded-xl shadow-xl p-4 z-50">
          {loading && !parsedIntent && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Parsing voice command...
            </div>
          )}
          {confirmed && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <Check className="w-4 h-4" /> Created successfully!
            </div>
          )}
          {parsedIntent && !confirmed && (
            <>
              <div className="flex items-center gap-2 mb-3">
                {iconFor(parsedIntent.type)}
                <span className="text-sm font-medium text-foreground capitalize">Create {parsedIntent.type}?</span>
              </div>
              <div className="space-y-2 mb-3">
                <div>
                  <label className="text-[10px] text-muted-foreground">Title</label>
                  <input value={parsedIntent.title}
                    onChange={e => setParsedIntent(p => p ? { ...p, title: e.target.value } : p)}
                    className="w-full px-2 py-1 text-sm rounded bg-muted border-0 outline-none text-foreground" />
                </div>
                {parsedIntent.datetime && (
                  <div>
                    <label className="text-[10px] text-muted-foreground">Date/Time</label>
                    <input type="datetime-local"
                      value={parsedIntent.datetime?.slice(0, 16) || ""}
                      onChange={e => setParsedIntent(p => p ? { ...p, datetime: e.target.value } : p)}
                      className="w-full px-2 py-1 text-sm rounded bg-muted border-0 outline-none text-foreground" />
                  </div>
                )}
                {parsedIntent.location && (
                  <div>
                    <label className="text-[10px] text-muted-foreground">Location</label>
                    <input value={parsedIntent.location}
                      onChange={e => setParsedIntent(p => p ? { ...p, location: e.target.value } : p)}
                      className="w-full px-2 py-1 text-sm rounded bg-muted border-0 outline-none text-foreground" />
                  </div>
                )}
                {transcript && <p className="text-[10px] text-muted-foreground italic">Voice: "{transcript}"</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={handleConfirm} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Confirm
                </button>
                <button onClick={handleCancel}
                  className="px-3 py-1.5 rounded-lg bg-muted text-muted-foreground text-xs font-medium hover:bg-muted/80 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Mobile FAB */}
      <button
        onClick={startListening}
        disabled={listening}
        className={`lg:hidden fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          listening ? "bg-destructive text-destructive-foreground animate-pulse" : "bg-primary text-primary-foreground"
        }`}
      >
        {listening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
      </button>
    </div>
  );
}
