import { Archive, Trash2, CheckCircle2, MailOpen, X } from "lucide-react";

export function BulkActionBar({
  count,
  onClear,
  onArchive,
  onTrash,
  onHandled,
  onMarkRead,
}: {
  count: number;
  onClear: () => void;
  onArchive: () => void;
  onTrash: () => void;
  onHandled: () => void;
  onMarkRead: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-b bg-primary/5">
      <span className="text-xs font-medium">{count} selected</span>
      <div className="flex items-center gap-1 ml-auto">
        <BulkBtn icon={<MailOpen className="w-3.5 h-3.5" />} label="Read" onClick={onMarkRead} />
        <BulkBtn icon={<CheckCircle2 className="w-3.5 h-3.5" />} label="Handled" onClick={onHandled} />
        <BulkBtn icon={<Archive className="w-3.5 h-3.5" />} label="Archive" onClick={onArchive} />
        <BulkBtn icon={<Trash2 className="w-3.5 h-3.5 text-destructive" />} label="Delete" onClick={onTrash} />
        <button onClick={onClear} className="p-1.5 rounded hover:bg-muted" title="Clear selection">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function BulkBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-xs px-2 py-1 rounded border bg-background hover:bg-muted"
      title={label}
    >
      {icon}<span>{label}</span>
    </button>
  );
}
