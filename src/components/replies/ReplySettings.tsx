import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, Plus, Trash2, RefreshCw } from "lucide-react";
import { useReplyAccounts, type ReplyAccount } from "@/hooks/useReplyAccounts";

interface ReplySettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReplySettings({ open, onOpenChange }: ReplySettingsProps) {
  const { accounts, loading, create, update, remove } = useReplyAccounts();
  const [newEmail, setNewEmail] = useState("");
  const [newBrand, setNewBrand] = useState("aplgo");

  const handleAdd = async () => {
    if (!newEmail.trim()) return;
    await create({ account_email: newEmail.trim(), brand: newBrand, provider: "resend" });
    setNewEmail("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[440px] sm:max-w-none overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" /> Reply Capture Settings
          </SheetTitle>
        </SheetHeader>

        <div className="py-4 space-y-6">
          {/* Explainer */}
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">How Reply Capture Works</p>
            <p className="text-xs leading-relaxed">
              Zazi Mail tracks outbound emails sent via sequences and broadcasts.
              When a subscriber replies, the reply is matched to the original send
              and surfaced in your Reply Inbox. Only tracked replies appear — no unrelated mail.
            </p>
          </div>

          {/* Connected accounts */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Connected Reply Accounts</h3>
            {loading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : accounts.length === 0 ? (
              <p className="text-xs text-muted-foreground">No accounts configured yet.</p>
            ) : (
              <div className="space-y-3">
                {accounts.map(acc => (
                  <div key={acc.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{acc.account_email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">{acc.brand}</Badge>
                        <Badge variant={acc.sync_status === "active" ? "default" : "outline"} className="text-[10px]">
                          {acc.sync_status}
                        </Badge>
                        {acc.last_sync_at && (
                          <span className="text-[10px] text-muted-foreground">
                            Last sync: {new Date(acc.last_sync_at).toLocaleString("en-ZA")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Switch
                      checked={acc.is_active}
                      onCheckedChange={(v) => update(acc.id, { is_active: v })}
                    />
                    <button type="button" onClick={() => remove(acc.id)} className="text-destructive hover:text-destructive/80">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add account */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-3">Add Reply Account</h3>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Email Address</Label>
                <Input
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="replies@yourdomain.com"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Brand</Label>
                <select
                  value={newBrand}
                  onChange={e => setNewBrand(e.target.value)}
                  className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="aplgo">APLGO</option>
                  <option value="vantoos">VantoOS</option>
                </select>
              </div>
              <button
                type="button"
                onClick={handleAdd}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Account
              </button>
            </div>
          </div>

          {/* Webhook info */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-semibold mb-2">Webhook Endpoint</h3>
            <p className="text-xs text-muted-foreground mb-2">
              Configure your email provider to forward inbound replies to this endpoint:
            </p>
            <code className="block text-xs bg-muted px-3 py-2 rounded-lg break-all">
              {`https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/ingest-reply`}
            </code>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
