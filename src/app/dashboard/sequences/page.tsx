import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Mail,
  Clock,
  Search,
  ListOrdered,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { REENGAGEMENT_SEQUENCE, GO_STATUS_UPGRADE_SEQUENCE } from "@/lib/email-signature";

interface SequenceStep {
  type: "send_email" | "wait";
  subject?: string;
  from_name?: string;
  content?: string;
  duration_hours?: number;
  template_id?: string;
}

interface Sequence {
  id: string;
  name: string;
  description: string | null;
  status: string;
  steps: SequenceStep[];
  created_at: string;
  updated_at: string;
}

interface Template {
  id: string;
  name: string;
  subject: string;
  content: string;
}

export default function SequencesPage() {
  const { user } = useAuth();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Builder dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Sequence | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    const [seqRes, tplRes] = await Promise.all([
      supabase
        .from("email_sequences")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("email_templates")
        .select("id, name, subject, content")
        .order("name"),
    ]);
    if (seqRes.data) setSequences(seqRes.data as unknown as Sequence[]);
    if (tplRes.data) setTemplates(tplRes.data as Template[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openNew = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setSteps([]);
    setExpandedStep(null);
    setDialogOpen(true);
  };

  const openEdit = (s: Sequence) => {
    setEditing(s);
    setName(s.name);
    setDescription(s.description || "");
    setSteps(s.steps);
    setExpandedStep(null);
    setDialogOpen(true);
  };

  const loadPrebuilt = () => {
    setName("Re-engagement: Registered not activated");
    setDescription("5-email re-engagement sequence for inactive APLGO prospects");
    setSteps(REENGAGEMENT_SEQUENCE as SequenceStep[]);
    setExpandedStep(null);
  };

  const loadGoStatusUpgrade = () => {
    setName("GO-Status Upgrade: Activation Only");
    setDescription("5-email upgrade sequence for R375 activation-only distributors to achieve GO-Status");
    setSteps(GO_STATUS_UPGRADE_SEQUENCE as SequenceStep[]);
    setExpandedStep(null);
  };

  const addEmailStep = () => {
    setSteps([...steps, { type: "send_email", subject: "", from_name: "Vanto Zazi", content: "" }]);
    setExpandedStep(steps.length);
  };

  const addWaitStep = () => {
    setSteps([...steps, { type: "wait", duration_hours: 24 }]);
  };

  const removeStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
    setExpandedStep(null);
  };

  const updateStep = (idx: number, patch: Partial<SequenceStep>) => {
    setSteps(steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const applyTemplate = (idx: number, tpl: Template) => {
    updateStep(idx, { subject: tpl.subject, content: tpl.content, template_id: tpl.id });
  };

  const moveStep = (idx: number, dir: -1 | 1) => {
    const next = [...steps];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    setSteps(next);
    setExpandedStep(target);
  };

  const save = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    if (editing) {
      await supabase
        .from("email_sequences")
        .update({ name: name.trim(), description: description.trim() || null, steps: steps as any })
        .eq("id", editing.id);
    } else {
      await supabase
        .from("email_sequences")
        .insert({ name: name.trim(), description: description.trim() || null, steps: steps as any, user_id: user.id });
    }
    setSaving(false);
    setDialogOpen(false);
    fetchData();
  };

  const deleteSequence = async (id: string) => {
    if (!confirm("Delete this sequence?")) return;
    await supabase.from("email_sequences").delete().eq("id", id);
    fetchData();
  };

  const filtered = sequences.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.description || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const emailStepCount = (s: Sequence) => s.steps.filter((st) => st.type === "send_email").length;

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Sequences" subtitle="Build and manage multi-step email sequences" />

      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search sequences..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Sequence
            </button>
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <ListOrdered className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {sequences.length === 0 ? "No sequences yet" : "No sequences found"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {sequences.length === 0
                  ? "Create your first email sequence or load the pre-built re-engagement sequence."
                  : "Try adjusting your search."}
              </p>
              {sequences.length === 0 && (
                <button
                  type="button"
                  onClick={() => {
                    openNew();
                    setTimeout(loadPrebuilt, 100);
                  }}
                  className="px-4 py-2 text-sm font-medium bg-accent text-accent-foreground rounded-lg hover:bg-accent/80 transition-colors"
                >
                  Load Re-engagement Sequence
                </button>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((seq) => (
                <Card key={seq.id} className="group hover:shadow-lg transition-all cursor-pointer" onClick={() => openEdit(seq)}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{seq.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{seq.description}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" onClick={(e) => e.stopPropagation()} className="p-1 hover:bg-muted rounded">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(seq); }}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteSequence(seq.id); }} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {emailStepCount(seq)} emails</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {seq.steps.length} steps</span>
                      <Badge variant="outline" className="ml-auto capitalize text-xs">{seq.status}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Builder Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Sequence" : "New Sequence"}</DialogTitle>
            <DialogDescription>Define your multi-step email sequence below.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Welcome Series" />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this sequence for?" />
              </div>
            </div>

            {!editing && steps.length === 0 && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={loadPrebuilt}
                  className="w-full px-4 py-3 text-sm font-medium border-2 border-dashed border-primary/30 text-primary rounded-lg hover:bg-primary/5 transition-colors"
                >
                  ⚡ Load pre-built re-engagement sequence (5 emails)
                </button>
                <button
                  type="button"
                  onClick={loadGoStatusUpgrade}
                  className="w-full px-4 py-3 text-sm font-medium border-2 border-dashed border-accent/50 text-accent-foreground rounded-lg hover:bg-accent/10 transition-colors"
                >
                  🚀 Load GO-Status Upgrade sequence (5 emails)
                </button>
              </div>
            )}

            {/* Steps List */}
            <div className="space-y-3">
              <Label>Steps ({steps.length})</Label>
              {steps.map((step, idx) => (
                <div key={idx} className="border border-border rounded-lg overflow-hidden">
                  <div
                    className="flex items-center gap-3 px-4 py-3 bg-muted/50 cursor-pointer"
                    onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                  >
                    <span className="text-xs font-bold text-muted-foreground w-6 text-center">{idx + 1}</span>
                    {step.type === "send_email" ? (
                      <Mail className="w-4 h-4 text-primary" />
                    ) : (
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="flex-1 text-sm font-medium truncate">
                      {step.type === "send_email"
                        ? step.subject || "Untitled email"
                        : `Wait ${step.duration_hours}h`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveStep(idx, -1); }} disabled={idx === 0} className="p-1 hover:bg-muted rounded disabled:opacity-30">
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); moveStep(idx, 1); }} disabled={idx === steps.length - 1} className="p-1 hover:bg-muted rounded disabled:opacity-30">
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" onClick={(e) => { e.stopPropagation(); removeStep(idx); }} className="p-1 hover:bg-destructive/10 text-destructive rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {expandedStep === idx && (
                    <div className="px-4 py-3 space-y-3 border-t border-border">
                      {step.type === "send_email" ? (
                        <>
                          {templates.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-xs">Use template</Label>
                              <select
                                value={step.template_id || ""}
                                onChange={(e) => {
                                  const tpl = templates.find((t) => t.id === e.target.value);
                                  if (tpl) applyTemplate(idx, tpl);
                                }}
                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
                              >
                                <option value="">— Select a template —</option>
                                {templates.map((t) => (
                                  <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label className="text-xs">Subject</Label>
                            <Input value={step.subject || ""} onChange={(e) => updateStep(idx, { subject: e.target.value })} placeholder="Email subject" />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">From Name</Label>
                            <Input value={step.from_name || ""} onChange={(e) => updateStep(idx, { from_name: e.target.value })} />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs">Content (HTML)</Label>
                            <Textarea
                              value={step.content || ""}
                              onChange={(e) => updateStep(idx, { content: e.target.value })}
                              placeholder="<p>Hi {{first_name}},</p>"
                              className="min-h-[120px] font-mono text-xs"
                            />
                          </div>
                        </>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-xs">Wait duration (hours)</Label>
                          <Input
                            type="number"
                            min={1}
                            value={step.duration_hours || 24}
                            onChange={(e) => updateStep(idx, { duration_hours: Number(e.target.value) })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={addEmailStep}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Mail className="w-4 h-4" /> Add Email
              </button>
              <button
                type="button"
                onClick={addWaitStep}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <Clock className="w-4 h-4" /> Add Wait
              </button>
            </div>
          </div>

          <DialogFooter>
            <button type="button" onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={!name.trim() || saving}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? "Save" : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
