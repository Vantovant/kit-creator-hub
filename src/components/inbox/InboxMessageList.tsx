
import { InboxMessage } from "@/hooks/useInbox";
import { Star, Archive, Clock, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";

function shortRelative(date: Date) {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function InboxMessageList({
  messages,
  selectedId,
  onSelect,
}: {
  messages: InboxMessage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-y-auto border-r">
      {messages.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No messages in this view.
        </div>
      ) : (
        messages.map((msg) => (
          <button
            key={msg.id}
            onClick={() => onSelect(msg.id)}
            className={cn(
              "w-full text-left px-4 py-3 border-b transition-colors hover:bg-muted/50",
              selectedId === msg.id ? "bg-muted" : "bg-background"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {msg.is_read ? (
                  <Circle className="w-4 h-4 text-muted-foreground/40" />
                ) : (
                  <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("truncate text-sm", !msg.is_read && "font-semibold")}>
                    {msg.sender_name || msg.sender}
                  </p>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(msg.date), { addSuffix: true })}
                  </span>
                </div>
                <p className={cn("text-sm truncate", !msg.is_read && "font-medium")}>
                  {msg.subject || "(no subject)"}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {msg.snippet || msg.body_preview || "No preview"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  {msg.is_starred && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />}
                  {msg.is_archived && <Archive className="w-3.5 h-3.5 text-muted-foreground" />}
                  {msg.snoozed_until && <Clock className="w-3.5 h-3.5 text-orange-400" />}
                  {msg.handled_at && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                </div>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
