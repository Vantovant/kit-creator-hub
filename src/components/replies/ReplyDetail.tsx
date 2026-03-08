import { useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Star, Clock, CheckCircle2, ArrowLeft, User, Send, Calendar, ListTodo, Bell, MessageSquare, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InboundReply } from "@/hooks/useReplies";

interface ReplyDetailProps {
  reply: InboundReply;
  onBack: () => void;
  onMarkHandled: () => void;
  onMarkWaiting: (waitingOn?: string) => void;
  onSnooze: () => void;
  onToggleStar: () => void;
  onCreateTask: () => void;
  onCreateReminder: () => void;
  onCreateMeeting: () => void;
  onMarkRead: () => void;
  onSetIntentTag: (tag: string) => void;
  onAddNote: (note: string) => void;
}

const INTENT_TAGS = [
  "interested", "objection", "support", "unsubscribe_risk",
  "onboarding", "payment_issue", "meeting_request", "follow_up",
  "customer_care", "general_info",
];

export function ReplyDetail({
  reply, onBack, onMarkHandled, onMarkWaiting, onSnooze,
  onToggleStar, onCreateTask, onCreateReminder, onCreateMeeting,
  onMarkRead, onSetIntentTag, onAddNote,
}: ReplyDetailProps) {
  useEffect(() => {
    if (!reply.is_read) onMarkRead();
  }, [reply.id]);

  const formatDate = (d: string) => new Date(d).toLocaleString("en-ZA", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-3">
        <button type="button" onClick={onBack} className="lg:hidden p-1 rounded hover:bg-accent">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold truncate">{reply.subject || "(no subject)"}</h2>
          <p className="text-xs text-muted-foreground truncate">
            From: {reply.sender_name || reply.sender_email} &lt;{reply.sender_email}&gt;
          </p>
        </div>
        <button type="button" onClick={onToggleStar}>
          <Star className={cn("w-4 h-4", reply.is_starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground")} />
        </button>
      </div>

      {/* Source context */}
      <div className="px-4 py-2 bg-muted/30 border-b border-border flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
        <Send className="w-3 h-3" />
        {reply.matched_sequence_id && <Badge variant="secondary" className="text-[10px]">Sequence reply</Badge>}
        {reply.matched_broadcast_id && <Badge variant="secondary" className="text-[10px]">Broadcast reply</Badge>}
        {reply.matched_sequence_step_index != null && (
          <span>Step {reply.matched_sequence_step_index + 1}</span>
        )}
        <span>•</span>
        <span>{formatDate(reply.received_at)}</span>
        {reply.reply_status === "handled" && (
          <>
            <span>•</span>
            <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-600">
              <CheckCircle2 className="w-3 h-3 mr-1" /> Handled {reply.handled_at ? formatDate(reply.handled_at) : ""}
            </Badge>
          </>
        )}
        {reply.reply_status === "waiting" && (
          <>
            <span>•</span>
            <Badge variant="outline" className="text-[10px] border-amber-400 text-amber-600">
              <Clock className="w-3 h-3 mr-1" /> Waiting{reply.waiting_on ? `: ${reply.waiting_on}` : ""}
            </Badge>
          </>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="prose prose-sm max-w-none dark:prose-invert">
          {reply.body_html ? (
            <div dangerouslySetInnerHTML={{ __html: reply.body_html }} />
          ) : (
            <pre className="whitespace-pre-wrap text-sm font-sans">{reply.body_text || reply.snippet || "No content"}</pre>
          )}
        </div>

        {/* Intent tags */}
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Intent Tag</p>
          <div className="flex flex-wrap gap-1.5">
            {INTENT_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => onSetIntentTag(tag)}
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full border transition-colors",
                  reply.intent_tag === tag
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                {tag.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        {/* Internal notes */}
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-medium text-muted-foreground mb-2">Internal Notes</p>
          <textarea
            defaultValue={reply.internal_notes || ""}
            onBlur={(e) => onAddNote(e.target.value)}
            placeholder="Add internal notes…"
            className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Action bar */}
      <div className="px-4 py-3 border-t border-border flex items-center gap-2 flex-wrap">
        <button type="button" onClick={onCreateTask} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Create Task (T)">
          <ListTodo className="w-3.5 h-3.5" /> Task
        </button>
        <button type="button" onClick={onCreateReminder} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Create Reminder (R)">
          <Bell className="w-3.5 h-3.5" /> Reminder
        </button>
        <button type="button" onClick={onCreateMeeting} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Create Meeting (M)">
          <Calendar className="w-3.5 h-3.5" /> Meeting
        </button>
        <div className="flex-1" />
        <button type="button" onClick={() => onMarkWaiting()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-300 transition-colors" title="Mark Waiting (W)">
          <Clock className="w-3.5 h-3.5" /> Waiting
        </button>
        <button type="button" onClick={onSnooze} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 transition-colors" title="Snooze (S)">
          Snooze
        </button>
        <button type="button" onClick={onMarkHandled} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 transition-colors" title="Mark Handled (H)">
          <CheckCircle2 className="w-3.5 h-3.5" /> Handled
        </button>
      </div>
    </div>
  );
}
