import { InboxMessage } from "@/hooks/useInbox";
import { Badge } from "@/components/ui/badge";
import { Archive, Star, Clock, CheckCircle2, Reply, Trash2, MailOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartExtractPanel } from "./SmartExtractPanel";

const iconBtn = "p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground";

export function InboxMessageDetail({
  message,
  onAction,
}: {
  message: InboxMessage | null;
  onAction: (action: string, data?: any) => void;
}) {
  if (!message) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Select a message to read
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-1">
          <button className={iconBtn} onClick={() => onAction(message.is_archived ? "unarchive" : "archive")}>
            <Archive className={cn("w-4 h-4", message.is_archived && "text-primary")} />
          </button>
          <button className={iconBtn} onClick={() => onAction(message.is_starred ? "unstar" : "star")}>
            <Star className={cn("w-4 h-4", message.is_starred && "fill-yellow-400 text-yellow-400")} />
          </button>
          <button className={iconBtn} onClick={() => onAction("snooze")}>
            <Clock className="w-4 h-4" />
          </button>
          <button className={iconBtn} onClick={() => onAction("waiting_on")}>
            <CheckCircle2 className="w-4 h-4" />
          </button>
          <button className={iconBtn} onClick={() => onAction("handled")}>
            <MailOpen className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button className={iconBtn} onClick={() => onAction("reply")}>
            <Reply className="w-4 h-4" />
          </button>
          <button className={iconBtn} onClick={() => onAction("trash")}>
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold">{message.subject || "(no subject)"}</h2>
          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground flex-wrap">
            <span className="font-medium text-foreground">{message.sender_name || message.sender}</span>
            <span>&lt;{message.sender}&gt;</span>
            <span>•</span>
            <span>{new Date(message.date).toLocaleString()}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {!message.is_read && <Badge variant="secondary">Unread</Badge>}
          {message.category && <Badge variant="outline">{message.category}</Badge>}
          {message.intent && <Badge variant="outline">{message.intent}</Badge>}
          {message.waiting_on && <Badge variant="outline" className="text-orange-500">Waiting on {message.waiting_on}</Badge>}
          {message.snoozed_until && <Badge variant="outline" className="text-orange-500">Snoozed</Badge>}
        </div>

        <SmartExtractPanel messageId={message.id} />

        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {message.body_preview || message.snippet || "No body preview available."}
          </p>
        </div>
      </div>
    </div>
  );
}
