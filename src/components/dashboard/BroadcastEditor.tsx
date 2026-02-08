import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Eye,
  Send,
  Save,
  Users,
  X,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface BroadcastEditorProps {
  initialData?: any;
  editId?: string | null;
  onSaved: () => void;
}

export function BroadcastEditor({ initialData, editId, onSaved }: BroadcastEditorProps) {
  const [subject, setSubject] = useState(initialData?.subject || "");
  const [previewText, setPreviewText] = useState(initialData?.preview_text || "");
  const [emailContent, setEmailContent] = useState(initialData?.content || "");
  const [fromName, setFromName] = useState(initialData?.from_name || "Vanto Zazi");
  const [replyTo, setReplyTo] = useState(initialData?.reply_to || "vanto@onlinecourseformlm.com");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const saveDraft = async () => {
    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }
    setSaving(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in");
      setSaving(false);
      return;
    }

    const payload = {
      subject: subject.trim(),
      preview_text: previewText.trim(),
      content: emailContent,
      from_name: fromName.trim(),
      reply_to: replyTo.trim(),
      user_id: user.id,
    };

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

  const sendNow = async () => {
    if (!subject.trim()) {
      setError("Subject is required");
      return;
    }
    if (!emailContent.trim()) {
      setError("Email content is required");
      return;
    }
    if (!confirm("Send this broadcast to all active subscribers?")) return;

    setSending(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError("You must be logged in");
      setSending(false);
      return;
    }

    // Save or create broadcast first
    const payload = {
      subject: subject.trim(),
      preview_text: previewText.trim(),
      content: emailContent,
      from_name: fromName.trim(),
      reply_to: replyTo.trim(),
      user_id: user.id,
    };

    let broadcastId = editId;
    if (editId) {
      await supabase.from("broadcasts").update(payload).eq("id", editId);
    } else {
      const { data, error: insertError } = await supabase
        .from("broadcasts")
        .insert(payload)
        .select("id")
        .single();
      if (insertError || !data) {
        setError("Failed to save broadcast");
        setSending(false);
        return;
      }
      broadcastId = data.id;
    }

    // Call edge function to send
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
      {/* Action bar */}
      <div className="flex items-center justify-between">
        <a
          href="/dashboard/broadcasts"
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </a>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
          >
            <Eye className="w-4 h-4" />
            Preview
          </button>
          <button
            type="button"
            onClick={saveDraft}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-foreground disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button
            type="button"
            onClick={sendNow}
            disabled={sending}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors disabled:opacity-50"
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
                  __html: emailContent || "<p class='text-muted-foreground'>No content yet</p>",
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
          {/* Recipients */}
          <Card className="bg-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium w-20">To:</Label>
                <div className="flex-1 flex items-center gap-2">
                  <Badge variant="secondary" className="flex items-center gap-1 bg-primary/20 text-primary">
                    <Users className="w-3 h-3" />
                    All Active Subscribers
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subject */}
          <Card className="bg-card">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium w-20">Subject:</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Write a compelling subject line..."
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium w-20">Preview:</Label>
                <Input
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Preview text shown in inbox..."
                  className="flex-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Content */}
          <Card className="bg-card">
            <CardContent className="p-4">
              <Label className="text-sm font-medium mb-2 block">
                Email Content (HTML supported, use {"{{first_name}}"} for personalization)
              </Label>
              <Textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder={`<h1>Hello {{first_name}}!</h1>\n<p>Your email content here...</p>`}
                className="min-h-[300px] font-mono text-sm"
              />
            </CardContent>
          </Card>

          {/* Settings */}
          <Card className="bg-card">
            <CardContent className="p-4">
              <h3 className="font-medium mb-4">Email Settings</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">From Name</Label>
                  <Input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Reply-to Email</Label>
                  <Input
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
