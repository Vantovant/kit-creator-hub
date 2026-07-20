import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InboxMessage } from "@/hooks/useInbox";
import { Loader2, Send, X } from "lucide-react";

export function ReplyComposer({
  message,
  accountId,
  onSent,
  onClose,
}: {
  message: InboxMessage;
  accountId: string | null;
  onSent?: () => void;
  onClose: () => void;
}) {
  const [to, setTo] = useState(message.sender);
  const [cc, setCc] = useState("");
  const [subject, setSubject] = useState(
    message.subject?.startsWith("Re:") ? message.subject : `Re: ${message.subject || ""}`,
  );
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async () => {
    if (!accountId) { setErr("No Gmail account selected."); return; }
    if (!to.trim() || !body.trim()) { setErr("To and message body are required."); return; }
    setSending(true); setErr(null);
    const { data, error } = await supabase.functions.invoke("gmail-send", {
      body: {
        account_id: accountId,
        to: to.trim(),
        cc: cc.trim() || undefined,
        subject: subject.trim(),
        body_text: body,
        reply_to_message_id: message.id,
      },
    });
    setSending(false);
    if (error || (data as any)?.error) {
      setErr((data as any)?.detail || error?.message || "Send failed");
      return;
    }
    onSent?.();
    onClose();
  };

  return (
    <div className="border-t bg-background">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40">
        <span className="text-sm font-medium">Reply</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
      </div>
      <div className="p-4 space-y-2">
        <div className="grid grid-cols-[60px_1fr] items-center gap-2 text-sm">
          <label className="text-muted-foreground">To</label>
          <input value={to} onChange={(e) => setTo(e.target.value)} className="border rounded px-2 py-1 bg-background" />
          <label className="text-muted-foreground">Cc</label>
          <input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="optional" className="border rounded px-2 py-1 bg-background" />
          <label className="text-muted-foreground">Subject</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} className="border rounded px-2 py-1 bg-background" />
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          placeholder="Write your reply..."
          className="w-full border rounded px-3 py-2 text-sm bg-background resize-y min-h-[120px]"
        />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={send}
            disabled={sending}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {sending ? "Sending..." : "Send reply"}
          </button>
        </div>
      </div>
    </div>
  );
}
