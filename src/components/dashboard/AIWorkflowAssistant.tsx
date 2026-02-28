import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, X, ChevronDown, ChevronUp, Sparkles, Loader2, Send, BookOpen, ThumbsUp, ThumbsDown } from "lucide-react";
import { getPageContext, type PageContext } from "@/lib/ai-context";
import { getGuidance, type Guidance } from "@/lib/ai-guidance";
import { supabase } from "@/integrations/supabase/client";

type CopilotResult = {
  answer: string;
  sources: { filename: string; collection: string }[];
  log_id?: string;
  kb_used?: boolean;
};

export function AIWorkflowAssistant() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [guidance, setGuidance] = useState<Guidance | null>(null);
  const [context, setContext] = useState<PageContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // AI mode (old assistant)
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [userQuestion, setUserQuestion] = useState("");

  // Copilot mode (KB-powered)
  const [copilotMode, setCopilotMode] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<CopilotResult | null>(null);
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotAction, setCopilotAction] = useState("general");
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  const fetchContext = useCallback(async () => {
    setLoading(true);
    try {
      const ctx = await getPageContext(location.pathname);
      setContext(ctx);
      setGuidance(getGuidance(ctx));
    } catch (e) {
      console.error("AI context error:", e);
    } finally {
      setLoading(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchContext();
    setAiMode(false);
    setCopilotMode(false);
    setAiResponse("");
    setCopilotResult(null);
    setExpanded(false);
    setFeedbackGiven(false);
  }, [fetchContext]);

  const askAI = async (question?: string) => {
    if (!context) return;
    setAiLoading(true);
    setAiResponse("");
    setAiMode(true);
    setCopilotMode(false);
    const prompt = question || "What should I do next?";
    try {
      const resp = await supabase.functions.invoke("ai-assistant", {
        body: { context, question: prompt },
      });
      if (resp.error) {
        setAiResponse("Unable to get AI advice right now.");
      } else {
        setAiResponse(resp.data?.advice || "No advice available.");
      }
    } catch {
      setAiResponse("Connection error. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const askCopilot = async (query?: string) => {
    const q = query || copilotQuery;
    if (!q.trim()) return;
    setCopilotLoading(true);
    setCopilotResult(null);
    setCopilotMode(true);
    setAiMode(false);
    setFeedbackGiven(false);
    try {
      const resp = await supabase.functions.invoke("copilot-answer", {
        body: {
          user_query: q,
          context: { action: copilotAction, page: location.pathname },
        },
      });
      if (resp.error) {
        setCopilotResult({ answer: "Unable to query copilot.", sources: [] });
      } else {
        setCopilotResult(resp.data);
      }
    } catch {
      setCopilotResult({ answer: "Connection error.", sources: [] });
    } finally {
      setCopilotLoading(false);
    }
  };

  const sendFeedback = async (outcome: string) => {
    if (!copilotResult?.log_id || feedbackGiven) return;
    setFeedbackGiven(true);
    await supabase.functions.invoke("copilot-answer", {
      body: { feedback: { log_id: copilotResult.log_id, outcome } },
    });
  };

  if (dismissed) {
    return (
      <button type="button" onClick={() => { setDismissed(false); setOpen(true); }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center hover:scale-105">
        <Bot className="w-6 h-6" />
      </button>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all flex items-center justify-center hover:scale-105 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Bot className="w-6 h-6" />
        {guidance && <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full animate-pulse" />}
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[560px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground font-sans">Zazi Copilot</p>
            <p className="text-xs text-muted-foreground">KB-powered assistant</p>
          </div>
        </div>
        <button type="button" onClick={() => setDismissed(true)} className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : copilotMode ? (
          <div>
            <h3 className="text-base font-semibold text-foreground font-sans mb-2 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Copilot Answer
            </h3>
            {copilotLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching knowledge base...
              </div>
            ) : copilotResult ? (
              <div className="space-y-3">
                <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{copilotResult.answer}</p>
                {copilotResult.sources?.length > 0 && (
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Sources:</p>
                    {copilotResult.sources.map((s, i) => (
                      <p key={i} className="text-xs text-muted-foreground">[{i + 1}] {s.filename}</p>
                    ))}
                  </div>
                )}
                {copilotResult.kb_used === false && (
                  <p className="text-xs text-amber-500">⚠️ No KB data matched. Upload relevant docs in Knowledge Base.</p>
                )}
                {/* Feedback */}
                {copilotResult.log_id && !feedbackGiven && (
                  <div className="flex gap-2">
                    <button onClick={() => sendFeedback("helpful")} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors">
                      <ThumbsUp className="w-3 h-3" /> Helpful
                    </button>
                    <button onClick={() => sendFeedback("not_helpful")} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-colors">
                      <ThumbsDown className="w-3 h-3" /> Not Helpful
                    </button>
                  </div>
                )}
                {feedbackGiven && <p className="text-xs text-muted-foreground">Thanks for your feedback!</p>}
              </div>
            ) : null}
            <button type="button" onClick={() => { setCopilotMode(false); setCopilotResult(null); }} className="mt-3 text-xs text-primary hover:underline">
              ← Back to tips
            </button>
          </div>
        ) : aiMode ? (
          <div>
            <h3 className="text-base font-semibold text-foreground font-sans mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> AI Analysis
            </h3>
            {aiLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" /> Analyzing...
              </div>
            ) : (
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{aiResponse}</p>
            )}
            <button type="button" onClick={() => setAiMode(false)} className="mt-3 text-xs text-primary hover:underline">
              ← Back to tips
            </button>
          </div>
        ) : guidance ? (
          <>
            <div>
              <h3 className="text-base font-semibold text-foreground font-sans mb-1">{guidance.title}</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">{guidance.message}</p>
            </div>
            {guidance.actions.length > 0 && (
              <div className="space-y-2">
                {guidance.actions.map((action) => (
                  <button type="button" key={action.href} onClick={() => navigate(action.href)}
                    className="w-full text-left px-3 py-2.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-sm font-medium transition-colors">
                    {action.label} →
                  </button>
                ))}
              </div>
            )}
            {guidance.whyItMatters && (
              <div>
                <button type="button" onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  Why this matters
                </button>
                {expanded && (
                  <p className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">{guidance.whyItMatters}</p>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border space-y-2">
        {!aiMode && !copilotMode && (
          <div className="space-y-2">
            {/* Copilot input */}
            <form onSubmit={(e) => { e.preventDefault(); askCopilot(); }} className="flex gap-2">
              <input type="text" value={copilotQuery} onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Ask Zazi Copilot (KB-powered)..."
                className="flex-1 text-sm px-3 py-2 rounded-lg bg-muted border-0 outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground" />
              <button type="submit" disabled={!copilotQuery.trim()} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </form>
            {/* Action type selector */}
            <select value={copilotAction} onChange={(e) => setCopilotAction(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded-lg bg-muted border-0 outline-none text-muted-foreground">
              <option value="general">General question</option>
              <option value="write_whatsapp">Write WhatsApp message</option>
              <option value="write_email">Write email</option>
              <option value="broadcast">Broadcast content</option>
              <option value="pricing">Pricing / PV question</option>
            </select>
            <button type="button" onClick={() => askAI()} disabled={aiLoading || !context}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 text-sm font-medium text-foreground transition-colors disabled:opacity-50">
              <Sparkles className="w-4 h-4" />
              Ask AI what to do next
            </button>
          </div>
        )}
        {copilotMode && !copilotLoading && (
          <form onSubmit={(e) => { e.preventDefault(); if (copilotQuery.trim()) { askCopilot(copilotQuery.trim()); setCopilotQuery(""); } }} className="flex gap-2">
            <input type="text" value={copilotQuery} onChange={(e) => setCopilotQuery(e.target.value)}
              placeholder="Follow-up question..."
              className="flex-1 text-sm px-3 py-2 rounded-lg bg-muted border-0 outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground" />
            <button type="submit" className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
        {aiMode && !aiLoading && (
          <form onSubmit={(e) => { e.preventDefault(); if (userQuestion.trim()) { askAI(userQuestion.trim()); setUserQuestion(""); } }} className="flex gap-2">
            <input type="text" value={userQuestion} onChange={(e) => setUserQuestion(e.target.value)}
              placeholder="Ask a follow-up question..."
              className="flex-1 text-sm px-3 py-2 rounded-lg bg-muted border-0 outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground" />
            <button type="submit" className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
