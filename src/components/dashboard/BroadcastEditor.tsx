import { useState, useCallback, useMemo, useEffect } from "react";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Eye,
  Send,
  Save,
  Users,
  Loader2,
  ArrowLeft,
  Undo2,
  Redo2,
  Clock,
  FileText,
} from "lucide-react";

interface BroadcastEditorProps {
  initialData?: any;
  editId?: string | null;
  onSaved: () => void;
}

function useUndoRedo(initial: string) {
  const [history, setHistory] = useState([initial]);
  const [index, setIndex] = useState(0);

  const value = history[index];

  const setValue = useCallback(
    (next: string) => {
      setHistory((prev) => [...prev.slice(0, index + 1), next]);
      setIndex((i) => i + 1);
    },
    [index]
  );

  const undo = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);
  const redo = useCallback(
    () => setIndex((i) => Math.min(history.length - 1, i + 1)),
    [history.length]
  );

  return { value, setValue, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1 };
}

export function BroadcastEditor({ initialData, editId, onSaved }: BroadcastEditorProps) {
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [previewText, setPreviewText] = useState(initialData?.preview_text || "");
  const content = useUndoRedo(initialData?.content || "");
  const [fromName, setFromName] = useState(initialData?.from_name || "Vanto Zazi");
  const [replyTo, setReplyTo] = useState(initialData?.reply_to || "vanto@onlinecourseformlm.com");
  const [segmentId, setSegmentId] = useState<string>(initialData?.segment_id || "");
  const [segments, setSegments] = useState<{ id: string; name: string }[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Schedule dialog
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [scheduling, setScheduling] = useState(false);

  // Save as template
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  const saveAsTemplate = async () => {
    if (!templateName.trim()) return;
    setSavingTemplate(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { setSavingTemplate(false); return; }
    const gradients = [
      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
      "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
      "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    ];
    await supabase.from("email_templates").insert({
      name: templateName.trim(),
      subject: subject.trim(),
      content: content.value,
      user_id: u.id,
      preview_gradient: gradients[Math.floor(Math.random() * gradients.length)],
    });
    setTemplateDialogOpen(false);
    setTemplateName("");
    setMessage("Saved as template!");
    setTimeout(() => setMessage(""), 3000);
    setSavingTemplate(false);
  };

  // Load segments
  useEffect(() => {
    supabase.from("segments").select("id, name").order("name").then(({ data }) => {
      if (data) setSegments(data);
    });
  }, []);

  const getPayload = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in");
      return null;
    }
    return {
      subject: subject.trim(),
      preview_text: previewText.trim(),
      content: content.value,
      from_name: fromName.trim(),
      reply_to: replyTo.trim(),
      user_id: user.id,
      segment_id: segmentId || null,
    };
  };

  const saveDraft = async () => {
    if (!subject.trim()) { setError("Subject is required"); return; }
    setSaving(true);
    setError("");
    const payload = await getPayload();
    if (!payload) { setSaving(false); return; }

    let result;
    if (editId) {
      result = await supabase.from("broadcasts").update(payload).eq("id", editId);
    } else {
      result = await supabase.from("broadcasts").insert(payload);
    }

    if (result.error) {
      setError("Failed to save: " + result.error.message);
    } else {
      setMessage("Draft saved!");
      setTimeout(() => setMessage(""), 3000);
      if (!editId) onSaved();
    }
    setSaving(false);
  };

  const scheduleBroadcast = async () => {
    if (!subject.trim()) { setError("Subject is required"); return; }
    if (!scheduleDate || !scheduleTime) { setError("Pick a date and time"); return; }
    setScheduling(true);
    setError("");
    const payload = await getPayload();
    if (!payload) { setScheduling(false); return; }

    const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();

    let result;
    if (editId) {
      result = await supabase.from("broadcasts").update({ ...payload, status: "scheduled", scheduled_at: scheduledAt }).eq("id", editId);
    } else {
      result = await supabase.from("broadcasts").insert({ ...payload, status: "scheduled", scheduled_at: scheduledAt });
    }

    if (result.error) {
      setError("Failed to schedule: " + result.error.message);
    } else {
      setMessage("Broadcast scheduled!");
      setScheduleOpen(false);
      setTimeout(() => onSaved(), 1500);
    }
    setScheduling(false);
  };

  const sendNow = async () => {
    if (!subject.trim()) { setError("Subject is required"); return; }
    if (!content.value.trim()) { setError("Email content is required"); return; }
    if (!confirm("Send this broadcast to all active subscribers?")) return;

    setSending(true);
    setError("");
    const payload = await getPayload();
    if (!payload) { setSending(false); return; }

    let broadcastId = editId;
    if (editId) {
      await supabase.from("broadcasts").update(payload).eq("id", editId);
    } else {
      const { data, error: insertError } = await supabase
        .from("broadcasts").insert(payload).select("id").single();
      if (insertError || !data) { setError("Failed to save broadcast"); setSending(false); return; }
      broadcastId = data.id;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-broadcast`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ broadcast_id: broadcastId }),
      }
    );

    const result = await res.json();
    if (!res.ok) {
      setError(result.error || "Failed to send broadcast");
    } else {
      setMessage(`Broadcast sent! ${result.sent} delivered, ${result.failed} failed.`);
      setTimeout(() => onSaved(), 2000);
    }
    setSending(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <a
            href="/dashboard/broadcasts"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </a>
          <button
            type="button"
            onClick={content.undo}
            disabled={!content.canUndo}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={content.redo}
            disabled={!content.canRedo}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground text-sm font-medium"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground text-sm font-medium disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => setScheduleOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground text-sm font-medium"
          >
            <Clock className="w-4 h-4" />
            Schedule
          </button>
          <button
            type="button"
            onClick={() => setTemplateDialogOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground text-sm font-medium"
          >
            <FileText className="w-4 h-4" />
            Save as Template
          </button>
          <button
            type="button"
            onClick={sendNow}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Now
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {message && <p className="text-sm text-primary">{message}</p>}

      {showPreview ? (
        <Card className="bg-card">
          <CardContent className="p-6">
            <div className="max-w-lg mx-auto">
              <p className="text-xs text-muted-foreground mb-1">Subject: {subject || "(no subject)"}</p>
              <p className="text-xs text-muted-foreground mb-4">Preview: {previewText || "(none)"}</p>
              <hr className="mb-4 border-border" />
              <div
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(
                    content.value || "<p class='text-muted-foreground'>No content yet</p>",
                    {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'a', 'img', 'hr', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
                      ALLOWED_ATTR: ['href', 'src', 'alt', 'class', 'style', 'target', 'width', 'height'],
                    }
                  ),
                }}
              />
              <hr className="my-4 border-border" />
              <p className="text-xs text-muted-foreground">
                Sent by {fromName} · <a href="#" className="underline">Unsubscribe</a>
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium w-20">To:</Label>
                <div className="flex-1 flex items-center gap-2">
                  <select
                    value={segmentId}
                    onChange={(e) => setSegmentId(e.target.value)}
                    className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="">All Active Subscribers</option>
                    {segments.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  {!segmentId && (
                    <Badge variant="secondary" className="flex items-center gap-1 bg-primary/20 text-primary">
                      <Users className="w-3 h-3" />
                      Everyone
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium w-20">Subject:</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Write a compelling subject line..." className="flex-1" />
              </div>
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium w-20">Preview:</Label>
                <Input value={previewText} onChange={(e) => setPreviewText(e.target.value)} placeholder="Preview text shown in inbox..." className="flex-1" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4">
              <Label className="text-sm font-medium mb-2 block">
                Email Content (HTML supported, use {"{{first_name}}"} for personalization)
              </Label>
              <Textarea
                value={content.value}
                onChange={(e) => content.setValue(e.target.value)}
                placeholder={`<h1>Hello {{first_name}}!</h1>\n<p>Your email content here...</p>`}
                className="min-h-[300px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Email Settings</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">From Name</Label>
                  <Input value={fromName} onChange={(e) => setFromName(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Reply-to Email</Label>
                  <Input value={replyTo} onChange={(e) => setReplyTo(e.target.value)} className="mt-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Schedule Dialog */}
      <Dialog open={scheduleOpen} onOpenChange={setScheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Broadcast</DialogTitle>
            <DialogDescription>Pick a date and time to send this broadcast.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="sched-date">Date</Label>
              <Input id="sched-date" type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sched-time">Time</Label>
              <Input id="sched-time" type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setScheduleOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              type="button"
              onClick={scheduleBroadcast}
              disabled={scheduling || !scheduleDate || !scheduleTime}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {scheduling ? "Scheduling…" : "Schedule"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save as Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save as Template</DialogTitle>
            <DialogDescription>Save this email as a reusable template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Template Name</Label>
              <Input value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder="e.g. Weekly Newsletter" />
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setTemplateDialogOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              type="button"
              onClick={saveAsTemplate}
              disabled={savingTemplate || !templateName.trim()}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {savingTemplate ? "Saving…" : "Save Template"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
