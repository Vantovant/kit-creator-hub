import { useState } from "react";
import { Settings, X } from "lucide-react";

export function AddAccountModal({
  open,
  onClose,
  onAdd,
  onOpenSettings,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (email: string, label: string) => Promise<void>;
  onOpenSettings?: () => void;
}) {
  const [email, setEmail] = useState("");
  const [label, setLabel] = useState("Work");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="font-semibold">Add Gmail account</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="rounded-md border bg-muted/30 p-3 space-y-2">
            <p className="font-medium">Authorize Gmail first</p>
            <p className="text-muted-foreground">
              Google authorization happens in Lovable Connectors, not from this form. After the mailbox is authorized, refresh Gmail accounts in Settings so Zazi Mail can match the exact address.
            </p>
            {onOpenSettings && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md border hover:bg-muted"
              >
                <Settings className="w-3.5 h-3.5" />
                Open Email Settings
              </button>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full mt-1 bg-background border rounded px-2 py-1.5"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Label</label>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full mt-1 bg-background border rounded px-2 py-1.5"
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <button onClick={onClose} className="text-sm px-3 py-1.5 rounded border hover:bg-muted">Cancel</button>
          <button
            disabled={!email.trim() || saving}
            onClick={async () => {
              setSaving(true); setError(null);
              try { await onAdd(email.trim().toLowerCase(), label.trim() || "Inbox"); onClose(); }
              catch (e: any) { setError(e.message || "Failed to add"); }
              finally { setSaving(false); }
            }}
            className="text-sm px-3 py-1.5 rounded bg-primary text-primary-foreground disabled:opacity-40"
          >
            {saving ? "Adding…" : "Add pending account"}
          </button>
        </div>
      </div>
    </div>
  );
}
