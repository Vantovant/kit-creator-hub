import { useEffect, useState, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useInboxAccounts } from "@/hooks/useInboxAccounts";
import { useInbox, InboxFilter } from "@/hooks/useInbox";
import { InboxMessageList } from "@/components/inbox/InboxMessageList";
import { InboxMessageDetail } from "@/components/inbox/InboxMessageDetail";
import { Contact360Panel } from "@/components/inbox/Contact360Panel";
import { Inbox, Star, Archive, Clock, CheckCircle2, Send, RefreshCw, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const filters: { key: InboxFilter; label: string; icon: React.ReactNode }[] = [
  { key: "inbox", label: "Inbox", icon: <Inbox className="w-4 h-4" /> },
  { key: "starred", label: "Starred", icon: <Star className="w-4 h-4" /> },
  { key: "snoozed", label: "Snoozed", icon: <Clock className="w-4 h-4" /> },
  { key: "waiting", label: "Waiting", icon: <CheckCircle2 className="w-4 h-4" /> },
  { key: "handled", label: "Handled", icon: <CheckCircle2 className="w-4 h-4" /> },
  { key: "archive", label: "Archive", icon: <Archive className="w-4 h-4" /> },
];

export default function InboxPage() {
  const { accounts, selected, selectedId, setSelectedId, syncAccount, loading: accountsLoading } = useInboxAccounts();
  const [filter, setFilter] = useState<InboxFilter>("inbox");
  const { messages, loading, selectedId: msgId, setSelectedId: setMsgId, doAction, refresh } = useInbox(selectedId, filter);
  const [syncing, setSyncing] = useState(false);

  const selectedMessage = messages.find((m) => m.id === msgId) || messages[0] || null;

  const handleSync = useCallback(async () => {
    if (!selectedId) return;
    setSyncing(true);
    try {
      await syncAccount(selectedId);
      await refresh();
    } catch (e) {
      console.error("Sync failed", e);
    }
    setSyncing(false);
  }, [selectedId, syncAccount, refresh]);

  useEffect(() => {
    if (!selectedId && accounts[0]?.id) setSelectedId(accounts[0].id);
  }, [accounts, selectedId, setSelectedId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!messages.length) return;
      const idx = messages.findIndex((m) => m.id === msgId);
      if (e.key === "j" || e.key === "ArrowDown") {
        const next = Math.min(idx + 1, messages.length - 1);
        setMsgId(messages[next]?.id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        const prev = Math.max(idx - 1, 0);
        setMsgId(messages[prev]?.id);
      } else if (e.key === "e") {
        if (selectedMessage) doAction(selectedMessage.id, selectedMessage.is_archived ? "unarchive" : "archive");
      } else if (e.key === "s") {
        if (selectedMessage) doAction(selectedMessage.id, selectedMessage.is_starred ? "unstar" : "star");
      } else if (e.key === "h") {
        if (selectedMessage) doAction(selectedMessage.id, "handled");
      } else if (e.key === "r") {
        if (selectedMessage) doAction(selectedMessage.id, "mark_read");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [messages, msgId, selectedMessage, doAction, setMsgId]);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <DashboardHeader
        title="Inbox"
        subtitle="Superhuman triage + Nimble contact intelligence for your Gmail."
      />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 border-r flex flex-col">
          <div className="p-4 border-b space-y-3">
            {accountsLoading ? (
              <p className="text-sm text-muted-foreground">Loading accounts...</p>
            ) : (
              <select
                className="w-full text-sm bg-background border rounded-md px-2 py-1.5"
                value={selectedId || ""}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label || a.email_address}
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing || !selectedId}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                Sync
              </button>
              <button
                disabled
                className="flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border opacity-50 cursor-not-allowed"
                title="Multi-account support coming in Phase 3"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            {selected?.last_sync_at && (
              <p className="text-xs text-muted-foreground">Last sync: {new Date(selected.last_sync_at).toLocaleString()}</p>
            )}
          </div>

          <nav className="flex-1 p-2 space-y-0.5">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                  filter === f.key ? "bg-muted font-medium" : "hover:bg-muted/50"
                )}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t text-xs text-muted-foreground space-y-1">
            <p><kbd className="font-mono border rounded px-1">j/k</kbd> navigate</p>
            <p><kbd className="font-mono border rounded px-1">e</kbd> archive</p>
            <p><kbd className="font-mono border rounded px-1">s</kbd> star</p>
            <p><kbd className="font-mono border rounded px-1">h</kbd> handled</p>
            <p><kbd className="font-mono border rounded px-1">r</kbd> read</p>
          </div>
        </aside>

        <main className="flex-1 flex min-w-0">
          <div className="w-1/3 min-w-[320px] border-r flex flex-col">
            <div className="px-4 py-2 border-b text-xs text-muted-foreground flex items-center justify-between">
              <span>{loading ? "Loading..." : `${messages.length} messages`}</span>
              <span className="text-[10px] uppercase tracking-wider">{filter}</span>
            </div>
            <InboxMessageList
              messages={messages}
              selectedId={msgId}
              onSelect={setMsgId}
            />
          </div>

          <div className="flex-1 min-w-0 border-r">
            <InboxMessageDetail
              message={selectedMessage}
              onAction={(action, data) => selectedMessage && doAction(selectedMessage.id, action, data)}
            />
          </div>

          <Contact360Panel message={selectedMessage} />
        </main>
      </div>
    </div>
  );
}
