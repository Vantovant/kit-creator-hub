import { InboxMessage } from "@/hooks/useInbox";
import { Badge } from "@/components/ui/badge";
import { Archive, Star, Clock, CheckCircle2, Reply, Trash2, MailOpen, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartExtractPanel } from "./SmartExtractPanel";
import { useState } from "react";
import { SnoozeMenu } from "./SnoozeMenu";
import { WaitingPrompt } from "./WaitingPrompt";

const iconBtn = "p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground";

export function InboxMessageDetail({
  message,
  onAction,
}: {
  message: InboxMessage | null;
  onAction: (action: string, data?: any) => void;
}) {
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [waitingOpen, setWaitingOpen] = useState(false);

  if (!message) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Select a message to read
      </div>
    );
  }

  const isSnoozed = !!(message.snoozed_until && new Date(message.snoozed_until) > new Date());
  const isWaiting = !!message.waiting_on;

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="relative flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-1">
          <button className={iconBtn} onClick={() => onAction(message.is_archived ? "unarchive" : "archive")} title="Archive (e)">
            <Archive className={cn("w-4 h-4", message.is_archived && "text-primary")} />
          </button>
          <button className={iconBtn} onClick={() => onAction(message.is_starred ? "unstar" : "star")} title="Star (s)">
            <Star className={cn("w-4 h-4", message.is_starred && "fill-yellow-400 text-yellow-400")} />
          </button>
          <div className="relative">
            <button
              className={iconBtn}
              onClick={() => { setSnoozeOpen((v) => !v); setWaitingOpen(false); }}
              title="Snooze (z)"
            >
              <Clock className={cn("w-4 h-4", isSnoozed && "text-orange-400")} />
            </button>
            <SnoozeMenu
              open={snoozeOpen}
              onClose={() => setSnoozeOpen(false)}
              onPick={(until) => onAction("snooze", { until: until.toISOString() })}
            />
          </div>
          <div className="relative">
            <button
              className={iconBtn}
              onClick={() => { setWaitingOpen((v) => !v); setSnoozeOpen(false); }}
              title="Waiting on (w)"
            >
              <CheckCircle2 className={cn("w-4 h-4", isWaiting && "text-orange-400")} />
            </button>
            <WaitingPrompt
              open={waitingOpen}
              onClose={() => setWaitingOpen(false)}
              onSubmit={(person) => onAction("waiting_on", { person })}
              defaultValue={message.waiting_on || ""}
            />
          </div>
          {(isSnoozed || isWaiting) && (
            <button
              className={iconBtn}
              onClick={() => onAction("unsnooze")}
              title="Unsnooze / clear waiting (u)"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          <button className={iconBtn} onClick={() => onAction("handled")} title="Handled (h)">
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
          {isWaiting && <Badge variant="outline" className="text-orange-500">Waiting on {message.waiting_on}</Badge>}
          {isSnoozed && (
            <Badge variant="outline" className="text-orange-500">
              Snoozed until {new Date(message.snoozed_until!).toLocaleString()}
            </Badge>
          )}
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
