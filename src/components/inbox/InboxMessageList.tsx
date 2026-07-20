import { InboxMessage } from "@/hooks/useInbox";
import { Star, Archive, Clock, CheckCircle2, Trash2, MailOpen } from "lucide-react";
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

const TINTS = [
  "bg-pink-500/20 text-pink-500",
  "bg-purple-500/20 text-purple-500",
  "bg-blue-500/20 text-blue-500",
  "bg-emerald-500/20 text-emerald-500",
  "bg-amber-500/20 text-amber-500",
  "bg-rose-500/20 text-rose-500",
  "bg-cyan-500/20 text-cyan-500",
];
function tintFor(email: string) {
  let h = 0;
  for (let i = 0; i < email.length; i += 1) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return TINTS[h % TINTS.length];
}
function avatarInitial(msg: InboxMessage) {
  const src = msg.sender_name || msg.sender || "?";
  return src.trim().charAt(0).toUpperCase();
}

export type Density = "compact" | "comfortable";

export function InboxMessageList({
  messages,
  selectedId,
  selectedIds,
  onSelect,
  onToggleCheck,
  onToggleAll,
  onQuickAction,
  density = "compact",
}: {
  messages: InboxMessage[];
  selectedId: string | null;
  selectedIds: Set<string>;
  onSelect: (id: string) => void;
  onToggleCheck: (id: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onQuickAction: (id: string, action: string) => void;
  density?: Density;
}) {
  const allChecked = messages.length > 0 && messages.every((m) => selectedIds.has(m.id));
  const someChecked = messages.some((m) => selectedIds.has(m.id));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-2 border-b flex items-center gap-2 text-xs text-muted-foreground shrink-0">
        <input
          type="checkbox"
          checked={allChecked}
          ref={(el) => { if (el) el.indeterminate = !allChecked && someChecked; }}
          onChange={(e) => onToggleAll(e.target.checked)}
          className="cursor-pointer"
          aria-label="Select all messages"
        />
        <span>Select all</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No messages in this view.</div>
        ) : (
          messages.map((msg) => {
            const checked = selectedIds.has(msg.id);
            const rowPad = density === "compact" ? "py-1.5" : "py-2.5";
            return (
              <div
                key={msg.id}
                className={cn(
                  "group flex items-center gap-3 px-3 border-b cursor-pointer transition-colors",
                  rowPad,
                  checked
                    ? "bg-primary/10"
                    : selectedId === msg.id
                      ? "bg-muted"
                      : "hover:bg-muted/50 bg-background",
                )}
                onClick={() => onSelect(msg.id)}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => onToggleCheck(msg.id, e.target.checked)}
                  className="cursor-pointer shrink-0"
                  aria-label={`Select message from ${msg.sender_name || msg.sender}`}
                />
                <div className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0",
                  tintFor(msg.sender || ""),
                )}>
                  {avatarInitial(msg)}
                </div>
                <div className={cn("truncate text-sm w-[160px] shrink-0", !msg.is_read && "font-semibold")}>
                  {msg.sender_name || msg.sender}
                </div>
                <div className="truncate text-sm min-w-0 flex-1">
                  <span className={cn(!msg.is_read && "font-semibold")}>
                    {msg.subject || "(no subject)"}
                  </span>
                  <span className="text-muted-foreground"> — {msg.snippet || msg.body_preview || ""}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0 min-w-[92px] justify-end">
                  <div className="flex items-center gap-1 group-hover:hidden">
                    {msg.is_starred && <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />}
                    {msg.is_archived && <Archive className="w-3.5 h-3.5 text-muted-foreground" />}
                    {msg.snoozed_until && <Clock className="w-3.5 h-3.5 text-orange-400" />}
                    {msg.handled_at && <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />}
                    <span className="text-xs text-muted-foreground w-14 text-right">
                      {shortRelative(new Date(msg.date))}
                    </span>
                  </div>
                  <div className="hidden group-hover:flex items-center gap-0.5">
                    <QuickBtn title="Star" onClick={(e) => { e.stopPropagation(); onQuickAction(msg.id, msg.is_starred ? "unstar" : "star"); }}>
                      <Star className={cn("w-3.5 h-3.5", msg.is_starred && "fill-yellow-400 text-yellow-400")} />
                    </QuickBtn>
                    <QuickBtn title="Mark read" onClick={(e) => { e.stopPropagation(); onQuickAction(msg.id, "mark_read"); }}>
                      <MailOpen className="w-3.5 h-3.5" />
                    </QuickBtn>
                    <QuickBtn title="Archive" onClick={(e) => { e.stopPropagation(); onQuickAction(msg.id, "archive"); }}>
                      <Archive className="w-3.5 h-3.5" />
                    </QuickBtn>
                    <QuickBtn title="Delete" onClick={(e) => { e.stopPropagation(); onQuickAction(msg.id, "trash"); }}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </QuickBtn>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function QuickBtn({ children, title, onClick }: { children: React.ReactNode; title: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      title={title}
      onClick={onClick}
      className="p-1 rounded hover:bg-background border border-transparent hover:border-border"
    >
      {children}
    </button>
  );
}
