import { cn } from "@/lib/utils";
import { Mail, MailOpen, Clock, CheckCircle2, AlertCircle, Inbox } from "lucide-react";
import type { ReplyFilter } from "@/hooks/useReplies";

const FILTERS: { value: ReplyFilter; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "All", icon: <Inbox className="w-3.5 h-3.5" /> },
  { value: "unread", label: "Unread", icon: <Mail className="w-3.5 h-3.5" /> },
  { value: "new", label: "New", icon: <MailOpen className="w-3.5 h-3.5" /> },
  { value: "waiting", label: "Waiting", icon: <Clock className="w-3.5 h-3.5" /> },
  { value: "snoozed", label: "Snoozed", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  { value: "handled", label: "Handled", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
];

interface ReplyFiltersProps {
  active: ReplyFilter;
  onChange: (filter: ReplyFilter) => void;
  counts?: Record<ReplyFilter, number>;
}

export function ReplyFilters({ active, onChange, counts }: ReplyFiltersProps) {
  return (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
      {FILTERS.map(f => (
        <button
          key={f.value}
          type="button"
          onClick={() => onChange(f.value)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
            active === f.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-foreground"
          )}
        >
          {f.icon}
          {f.label}
          {counts && counts[f.value] > 0 && (
            <span className={cn(
              "ml-1 text-[10px] px-1.5 rounded-full",
              active === f.value ? "bg-primary-foreground/20" : "bg-muted"
            )}>
              {counts[f.value]}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
