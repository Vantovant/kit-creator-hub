import { cn } from "@/lib/utils";
import { Star, Mail, MailOpen, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { InboundReply } from "@/hooks/useReplies";

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

const statusIcon: Record<string, React.ReactNode> = {
  new: <Mail className="w-3.5 h-3.5 text-primary" />,
  waiting: <Clock className="w-3.5 h-3.5 text-amber-500" />,
  snoozed: <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />,
  handled: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
};

interface ReplyListProps {
  replies: InboundReply[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
}

export function ReplyList({ replies, selectedId, onSelect, onToggleStar }: ReplyListProps) {
  if (replies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
        <MailOpen className="w-10 h-10 mb-3 opacity-40" />
        <p className="text-sm font-medium">No replies yet</p>
        <p className="text-xs mt-1">Replies to your sequences & broadcasts will appear here</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border overflow-y-auto">
      {replies.map((reply) => (
        <button
          key={reply.id}
          type="button"
          onClick={() => onSelect(reply.id)}
          className={cn(
            "w-full text-left px-4 py-3 hover:bg-accent/50 transition-colors flex gap-3",
            selectedId === reply.id && "bg-accent",
            !reply.is_read && "bg-primary/5"
          )}
        >
          <div className="flex-shrink-0 mt-0.5">
            {statusIcon[reply.reply_status] || statusIcon.new}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className={cn("text-sm truncate", !reply.is_read && "font-semibold")}>
                {reply.sender_name || reply.sender_email}
              </span>
              <span className="text-[11px] text-muted-foreground flex-shrink-0">
                {timeAgo(reply.received_at)}
              </span>
            </div>
            <p className={cn("text-xs truncate mt-0.5", !reply.is_read ? "text-foreground" : "text-muted-foreground")}>
              {reply.subject || "(no subject)"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
              {reply.snippet || ""}
            </p>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {reply.reply_status === "waiting" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-400 text-amber-600">Waiting</Badge>
              )}
              {reply.reply_status === "handled" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-400 text-emerald-600">Handled</Badge>
              )}
              {reply.reply_status === "snoozed" && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">Snoozed</Badge>
              )}
              {reply.intent_tag && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{reply.intent_tag}</Badge>
              )}
              {reply.matched_sequence_id && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">Sequence</Badge>
              )}
              {reply.matched_broadcast_id && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary">Broadcast</Badge>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onToggleStar(reply.id); }}
            className="flex-shrink-0 mt-0.5"
          >
            <Star className={cn("w-4 h-4", reply.is_starred ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40 hover:text-amber-400")} />
          </button>
        </button>
      ))}
    </div>
  );
}
