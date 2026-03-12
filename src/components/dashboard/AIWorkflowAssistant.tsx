import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Bot, X, ChevronDown, ChevronUp, Sparkles, Loader2, Send, BookOpen, ThumbsUp, ThumbsDown, Zap, Tag, TrendingUp } from "lucide-react";
import { getPageContext, type PageContext } from "@/lib/ai-context";
import { getGuidance, type Guidance } from "@/lib/ai-guidance";
import { supabase } from "@/integrations/supabase/client";

type SuggestedAction = {
  action_type: "update_field" | "add_tag";
  field?: string;
  current_value?: string;
  new_value?: string;
  reason: string;
  button_label: string;
};

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

  // AI mode
  const [aiMode, setAiMode] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState("");
  const [userQuestion, setUserQuestion] = useState("");
  const [suggestedActions, setSuggestedActions] = useState<SuggestedAction[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, string>>({});

  // Subscriber context
  const [activeProspectId, setActiveProspectId] = useState<string | null>(null);

  // Copilot mode
  const [copilotMode, setCopilotMode] = useState(false);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotResult, setCopilotResult] = useState<CopilotResult | null>(null);
  const [copilotQuery, setCopilotQuery] = useState("");
  const [copilotAction, setCopilotAction] = useState("general");
  const [feedbackGiven, setFeedbackGiven] = useState(false);

  // Listen for subscriber profile events
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setActiveProspectId(e.detail?.prospect_id || null);
      if (e.detail?.prospect_id) {
        setOpen(true);
        askAI("Analyze this subscriber's engagement and suggest status updates.", e.detail.prospect_id);
      }
    };
    window.addEventListener("ai-subscriber-context" as any, handler as any);
    return () => window.removeEventListener("ai-subscriber-context" as any, handler as any);
  }, [context]);

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
    setSuggestedActions([]);
    setActionResults({});
    setActiveProspectId(null);
  }, [fetchContext]);

  const askAI = async (question?: string, prospectId?: string) => {
    if (!context) return;
    setAiLoading(true);
    setAiResponse("");
    setAiMode(true);
    setCopilotMode(false);
    setSuggestedActions([]);
    setActionResults({});
    const prompt = question || "What should I do next?";
    const pid = prospectId || activeProspectId;
    try {
      const resp = await supabase.functions.invoke("ai-assistant", {
        body: { context, question: prompt, prospect_id: pid },
      });
      if (resp.error) {
        setAiResponse("Unable to get AI advice right now.");
      } else {
        setAiResponse(resp.data?.advice || "No advice available.");
        if (resp.data?.suggested_actions?.length) {
          setSuggestedActions(resp.data.suggested_actions);
        }
      }
    } catch {
      setAiResponse("Connection error. Please try again.");
    } finally {
      setAiLoading(false);
    }
  };

  const executeAction = async (action: SuggestedAction, idx: number) => {
    const pid = activeProspectId;
    if (!pid) return;
    const key = `${idx}`;
    setActionLoading(key);
    try {
      let actionType = "";
      let question = "";
      if (action.action_type === "update_field" && action.field && action.new_value) {
        actionType = "update_prospect";
        question = `update ${action.field} to ${action.new_value}`;
      } else if (action.action_type === "add_tag" && action.new_value) {
        actionType = "add_tag";
        question = action.new_value;
      }
      const resp = await supabase.functions.invoke("ai-assistant", {
        body: { context, question, action: actionType, prospect_id: pid },
      });
      setActionResults(prev => ({ ...prev, [key]: resp.data?.advice || "Done" }));
      // Dispatch event to refresh subscriber data
      window.dispatchEvent(new CustomEvent("subscriber-updated", { detail: { prospect_id: pid } }));
    } catch {
      setActionResults(prev => ({ ...prev, [key]: "Failed to apply action." }));
    } finally {
      setActionLoading(null);
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
        body: { user_query: q, context: { action: copilotAction, page: location.pathname } },
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
    <div className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[600px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Bot className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground font-sans">Zazi Copilot</p>
            <p className="text-xs text-muted-foreground">
              {activeProspectId ? "Subscriber Intelligence" : "KB-powered assistant"}
            </p>
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
              <Sparkles className="w-4 h-4 text-primary" />
              {activeProspectId ? "Subscriber Analysis" : "AI Analysis"}
            </h3>
            {aiLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="w-4 h-4 animate-spin" />
                {activeProspectId ? "Analyzing subscriber..." : "Analyzing..."}
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-foreground whitespace-pre-line leading-relaxed">{aiResponse}</p>

                {/* Suggested Actions */}
                {suggestedActions.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Suggested Actions</p>
                    {suggestedActions.map((action, idx) => {
                      const key = `${idx}`;
                      const result = actionResults[key];
                      const isLoading = actionLoading === key;

                      if (result) {
                        return (
                          <div key={key} className="p-2 rounded-lg bg-primary/5 border border-primary/20">
                            <p className="text-xs text-foreground">{result}</p>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => executeAction(action, idx)}
                          disabled={isLoading}
                          className="w-full flex items-start gap-2 p-2.5 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left group disabled:opacity-50"
                        >
                          <div className="mt-0.5">
                            {action.action_type === "add_tag" ? (
                              <Tag className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <TrendingUp className="w-3.5 h-3.5 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
                              {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                              {action.button_label}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{action.reason}</p>
                            {action.field && (
                              <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                                {action.current_value ? `${action.field}: ${action.current_value} → ${action.new_value}` : `${action.field}: ${action.new_value}`}
                              </p>
                            )}
                          </div>
                          <Zap className="w-3.5 h-3.5 text-primary/40 group-hover:text-primary transition-colors mt-0.5" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <button type="button" onClick={() => { setAiMode(false); setSuggestedActions([]); setActionResults({}); }} className="mt-3 text-xs text-primary hover:underline">
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
            <form onSubmit={(e) => { e.preventDefault(); askCopilot(); }} className="flex gap-2">
              <input type="text" value={copilotQuery} onChange={(e) => setCopilotQuery(e.target.value)}
                placeholder="Ask Zazi Copilot (KB-powered)..."
                className="flex-1 text-sm px-3 py-2 rounded-lg bg-muted border-0 outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground" />
              <button type="submit" disabled={!copilotQuery.trim()} className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </form>
            <select value={copilotAction} onChange={(e) => setCopilotAction(e.target.value)}
              className="w-full text-xs px-2 py-1.5 rounded-lg bg-muted border-0 outline-none text-muted-foreground">
              <option value="general">General question</option>
              <option value="write_whatsapp">Write WhatsApp message</option>
              <option value="write_email">Write email</option>
              <option value="broadcast">Broadcast content</option>
              <option value="pricing">Pricing / PV question</option>
              <option value="subscriber_analysis">Subscriber analysis</option>
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
              placeholder={activeProspectId ? "Ask about this subscriber..." : "Ask a follow-up question..."}
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
