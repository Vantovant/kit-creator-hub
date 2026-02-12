import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import type { Json } from "@/integrations/supabase/types";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { REENGAGEMENT_SEQUENCE } from "@/lib/email-signature";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Play,
  Pause,
  Save,
  Mail,
  Clock,
  Tag,
  Zap,
  GitBranch,
  Trash2,
  GripVertical,
  UserPlus,
  MousePointerClick,
  Calendar,
  ArrowLeft,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface WorkflowStep {
  id: string;
  type: "send_email" | "add_tag" | "wait";
  subject?: string;
  content?: string;
  from_name?: string;
  tag_name?: string;
  duration_hours?: number;
}

interface TriggerConfig {
  tag_name?: string;
  link_url?: string;
  date?: string;
  time?: string;
}

const TRIGGER_OPTIONS = [
  { id: "subscribe", name: "When someone subscribes", icon: UserPlus, color: "hsl(var(--primary))" },
  { id: "tag_added", name: "When a tag is added", icon: Tag, color: "hsl(var(--accent))" },
  { id: "link_click", name: "When a link is clicked", icon: MousePointerClick, color: "hsl(var(--secondary))" },
  { id: "date", name: "On a specific date", icon: Calendar, color: "hsl(var(--destructive))" },
];

const ACTION_OPTIONS = [
  { id: "send_email", name: "Send an email", icon: Mail },
  { id: "add_tag", name: "Add a tag", icon: Tag },
  { id: "wait", name: "Wait / Delay", icon: Clock },
];

export default function AutomationBuilderPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const automationId = searchParams.get("id");

  const [name, setName] = useState("New Automation");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState("subscribe");
  const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>({});
  const [workflow, setWorkflow] = useState<WorkflowStep[]>([]);
  const [status, setStatus] = useState("draft");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!automationId);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showAddMenu, setShowAddMenu] = useState<string | null>(null);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [tags, setTags] = useState<{ id: string; name: string }[]>([]);

  // Load tags for tag picker
  useEffect(() => {
    supabase.from("tags").select("id, name").order("name").then(({ data }) => {
      if (data) setTags(data);
    });
  }, []);

  // Load existing automation
  useEffect(() => {
    if (!automationId) return;
    (async () => {
      const { data, error: fetchErr } = await supabase
        .from("automations")
        .select("*")
        .eq("id", automationId)
        .single();
      if (fetchErr || !data) {
        setError("Automation not found");
        setLoading(false);
        return;
      }
      setName(data.name);
      setDescription(data.description || "");
      setTriggerType(data.trigger_type);
      setTriggerConfig((data.trigger_config as unknown as TriggerConfig) || {});
      setWorkflow((data.workflow as unknown as WorkflowStep[]) || []);
      setStatus(data.status);
      setLoading(false);
    })();
  }, [automationId]);

  const saveAutomation = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    setError("");

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      trigger_type: triggerType,
      trigger_config: triggerConfig as unknown as Json,
      workflow: workflow as unknown as Json,
      status,
      user_id: user.id,
    };

    let result;
    if (automationId) {
      result = await supabase.from("automations").update(payload).eq("id", automationId);
    } else {
      result = await supabase.from("automations").insert(payload).select("id").single();
    }

    if (result.error) {
      setError("Failed to save: " + result.error.message);
    } else {
      setMessage("Saved!");
      if (!automationId && result.data) {
        navigate(`/dashboard/automations/builder?id=${result.data.id}`, { replace: true });
      }
      setTimeout(() => setMessage(""), 3000);
    }
    setSaving(false);
  };

  const toggleStatus = async () => {
    const next = status === "active" ? "draft" : "active";
    setStatus(next);
    if (automationId) {
      await supabase.from("automations").update({ status: next }).eq("id", automationId);
    }
  };

  const addStep = (afterId: string | null, type: WorkflowStep["type"]) => {
    const newStep: WorkflowStep = {
      id: Date.now().toString(),
      type,
      ...(type === "send_email" ? { subject: "", content: "", from_name: "Vanto Zazi" } : {}),
      ...(type === "add_tag" ? { tag_name: "" } : {}),
      ...(type === "wait" ? { duration_hours: 24 } : {}),
    };
    if (afterId === null) {
      setWorkflow([...workflow, newStep]);
    } else {
      const idx = workflow.findIndex((s) => s.id === afterId);
      const copy = [...workflow];
      copy.splice(idx + 1, 0, newStep);
      setWorkflow(copy);
    }
    setShowAddMenu(null);
    setExpandedStep(newStep.id);
  };

  const updateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setWorkflow(workflow.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeStep = (id: string) => {
    setWorkflow(workflow.filter((s) => s.id !== id));
  };

  const stepIcon = (type: string) => {
    if (type === "send_email") return Mail;
    if (type === "add_tag") return Tag;
    return Clock;
  };

  const stepLabel = (type: string) => {
    if (type === "send_email") return "Send Email";
    if (type === "add_tag") return "Add Tag";
    return "Wait";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const triggerOption = TRIGGER_OPTIONS.find((t) => t.id === triggerType);

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Automation Builder" subtitle="Design your automated workflow" />

      <main className="p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Top bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <a
              href="/dashboard/automations"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </a>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleStatus}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  status === "active"
                    ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"
                    : "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                }`}
              >
                {status === "active" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {status === "active" ? "Pause" : "Activate"}
              </button>
              <button
                type="button"
                onClick={saveAutomation}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-primary">{message}</p>}

          {/* Name & description */}
          <Card className="bg-card">
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className="text-sm font-medium">Automation Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-sm font-medium">Description (optional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1" placeholder="What does this automation do?" />
              </div>
            </CardContent>
          </Card>

          {/* Trigger */}
          <Card className="bg-card border-2 border-primary/20">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Trigger</h3>
              </div>
              <select
                value={triggerType}
                onChange={(e) => {
                  setTriggerType(e.target.value);
                  setTriggerConfig({});
                }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                {TRIGGER_OPTIONS.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              {/* Trigger-specific config */}
              {triggerType === "tag_added" && (
                <div>
                  <Label className="text-sm text-muted-foreground">Tag name to watch</Label>
                  <select
                    value={triggerConfig.tag_name || ""}
                    onChange={(e) => setTriggerConfig({ ...triggerConfig, tag_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                  >
                    <option value="">Any tag</option>
                    {tags.map((t) => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {triggerType === "link_click" && (
                <div>
                  <Label className="text-sm text-muted-foreground">Link URL to watch (leave blank for any link)</Label>
                  <Input
                    value={triggerConfig.link_url || ""}
                    onChange={(e) => setTriggerConfig({ ...triggerConfig, link_url: e.target.value })}
                    className="mt-1"
                    placeholder="https://..."
                  />
                </div>
              )}
              {triggerType === "date" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">Date</Label>
                    <Input
                      type="date"
                      value={triggerConfig.date || ""}
                      onChange={(e) => setTriggerConfig({ ...triggerConfig, date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Time</Label>
                    <Input
                      type="time"
                      value={triggerConfig.time || ""}
                      onChange={(e) => setTriggerConfig({ ...triggerConfig, time: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Workflow steps */}
          <div className="flex flex-col items-center">
            {/* Connector from trigger */}
            <div className="w-px h-6 bg-border" />

            {workflow.length === 0 ? (
              <div className="flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => addStep(null, "send_email")}
                  className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-border rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> Add first step
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const steps: WorkflowStep[] = REENGAGEMENT_SEQUENCE.map((s, i) => ({
                      id: (Date.now() + i).toString(),
                      ...s,
                    }));
                    setWorkflow(steps);
                    setName("Re-engagement: Registered Not Activated");
                    setDescription("5-email sequence for prospects who registered but never activated");
                    setTriggerType("tag_added");
                    setTriggerConfig({ tag_name: "Registered_not_activated" });
                    setExpandedStep(steps[0].id);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-accent/10 border border-accent/30 rounded-lg text-accent-foreground hover:bg-accent/20 transition-colors text-sm font-medium"
                >
                  <Zap className="w-4 h-4" /> Load Re-engagement Sequence (5 emails)
                </button>
              </div>
            ) : (
              workflow.map((step, idx) => {
                const Icon = stepIcon(step.type);
                const isExpanded = expandedStep === step.id;
                return (
                  <div key={step.id} className="flex flex-col items-center w-full max-w-md">
                    <Card className="bg-card w-full group">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Icon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <Badge variant="outline" className="text-xs capitalize mb-0.5">
                                {stepLabel(step.type)}
                              </Badge>
                              {step.type === "send_email" && step.subject && (
                                <p className="text-sm text-muted-foreground truncate max-w-[200px]">{step.subject}</p>
                              )}
                              {step.type === "add_tag" && step.tag_name && (
                                <p className="text-sm text-muted-foreground">{step.tag_name}</p>
                              )}
                              {step.type === "wait" && (
                                <p className="text-sm text-muted-foreground">{step.duration_hours}h delay</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setExpandedStep(isExpanded ? null : step.id)}
                              className="p-1 text-muted-foreground hover:text-foreground rounded"
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeStep(step.id)}
                              className="p-1 text-muted-foreground hover:text-destructive rounded opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Expanded config */}
                        {isExpanded && (
                          <div className="mt-4 space-y-3 border-t border-border pt-4">
                            {step.type === "send_email" && (
                              <>
                                <div>
                                  <Label className="text-sm text-muted-foreground">Subject</Label>
                                  <Input
                                    value={step.subject || ""}
                                    onChange={(e) => updateStep(step.id, { subject: e.target.value })}
                                    placeholder="Email subject..."
                                    className="mt-1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm text-muted-foreground">Content (HTML, use {"{{first_name}}"} for personalization)</Label>
                                  <Textarea
                                    value={step.content || ""}
                                    onChange={(e) => updateStep(step.id, { content: e.target.value })}
                                    placeholder="<p>Hello {{first_name}}!</p>"
                                    className="mt-1 min-h-[120px] font-mono text-sm"
                                  />
                                </div>
                                <div>
                                  <Label className="text-sm text-muted-foreground">From Name</Label>
                                  <Input
                                    value={step.from_name || "Vanto Zazi"}
                                    onChange={(e) => updateStep(step.id, { from_name: e.target.value })}
                                    className="mt-1"
                                  />
                                </div>
                              </>
                            )}
                            {step.type === "add_tag" && (
                              <div>
                                <Label className="text-sm text-muted-foreground">Tag to add</Label>
                                <select
                                  value={step.tag_name || ""}
                                  onChange={(e) => updateStep(step.id, { tag_name: e.target.value })}
                                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                                >
                                  <option value="">Select a tag...</option>
                                  {tags.map((t) => (
                                    <option key={t.id} value={t.name}>{t.name}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                            {step.type === "wait" && (
                              <div>
                                <Label className="text-sm text-muted-foreground">Wait duration (hours)</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={step.duration_hours || 24}
                                  onChange={(e) => updateStep(step.id, { duration_hours: parseInt(e.target.value) || 1 })}
                                  className="mt-1 w-32"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Connector + add button */}
                    <div className="relative py-3">
                      <div className="w-px h-6 bg-border mx-auto" />
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowAddMenu(showAddMenu === step.id ? null : step.id)}
                            className="w-7 h-7 rounded-full bg-card border-2 border-border flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          {showAddMenu === step.id && (
                            <div className="absolute top-9 left-1/2 -translate-x-1/2 w-48 bg-card rounded-xl shadow-xl border border-border z-10 p-1">
                              {ACTION_OPTIONS.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => addStep(step.id, a.id as WorkflowStep["type"])}
                                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm text-foreground"
                                >
                                  <a.icon className="w-4 h-4 text-primary" />
                                  {a.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            {/* End node */}
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">End</p>
          </div>
        </div>
      </main>
    </div>
  );
}
