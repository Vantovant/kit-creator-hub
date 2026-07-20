import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useInboxAccounts } from "@/hooks/useInboxAccounts";
import { useInbox, InboxFilter } from "@/hooks/useInbox";
import { InboxMessageList } from "@/components/inbox/InboxMessageList";
import { InboxMessageDetail } from "@/components/inbox/InboxMessageDetail";
import { Contact360Panel } from "@/components/inbox/Contact360Panel";
import { AddAccountModal } from "@/components/inbox/AddAccountModal";
import { HelpOverlay } from "@/components/inbox/HelpOverlay";
import { InboxCommandPalette } from "@/components/inbox/InboxCommandPalette";
import { SnoozeMenu } from "@/components/inbox/SnoozeMenu";
import { WaitingPrompt } from "@/components/inbox/WaitingPrompt";
import { Inbox, Star, Archive, Clock, CheckCircle2, RefreshCw, Plus, Keyboard, Layers } from "lucide-react";
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
  const { accounts, selected, selectedId, setSelectedId, syncAccount, addAccount, loading: accountsLoading, refresh: refreshAccounts } =
    useInboxAccounts();
  const [scope, setScope] = useState<string | "all" | null>(null);
  const [filter, setFilter] = useState<InboxFilter>("inbox");
  const scopeForHook = useMemo(() => (scope === "all" ? "all" : scope), [scope]);
  const { messages, loading, selectedId: msgId, setSelectedId: setMsgId, doAction, refresh } = useInbox(scopeForHook, filter);
  const [syncing, setSyncing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [snoozeOpen, setSnoozeOpen] = useState(false);
  const [waitingOpen, setWaitingOpen] = useState(false);
  const menuAnchorRef = useRef<HTMLDivElement>(null);

  const selectedMessage = messages.find((m) => m.id === msgId) || messages[0] || null;

  useEffect(() => {
    if (scope === null && (accounts[0]?.id || accountsLoading === false)) {
      setScope(accounts[0]?.id ?? "all");
      if (accounts[0]?.id) setSelectedId(accounts[0].id);
    }
  }, [accounts, accountsLoading, scope, setSelectedId]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      if (scope === "all") {
        for (const a of accounts) await syncAccount(a.id).catch(() => null);
      } else if (scope) {
        await syncAccount(scope);
      }
      await refresh();
    } catch (e) { console.error("Sync failed", e); }
    setSyncing(false);
  }, [scope, accounts, syncAccount, refresh]);

  const runAction = useCallback((action: string, data?: any) => {
    if (selectedMessage) doAction(selectedMessage.id, action, data);
  }, [selectedMessage, doAction]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
      // Command palette works everywhere
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault(); setPaletteOpen((v) => !v); return;
      }
      if (typing) return;

      if (e.key === "?") { setHelpOpen((v) => !v); return; }
      if (!messages.length) return;
      const idx = messages.findIndex((m) => m.id === msgId);
      if (e.key === "j" || e.key === "ArrowDown") {
        setMsgId(messages[Math.min(idx + 1, messages.length - 1)]?.id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        setMsgId(messages[Math.max(idx - 1, 0)]?.id);
      } else if (e.key === "e" && selectedMessage) {
        runAction(selectedMessage.is_archived ? "unarchive" : "archive");
      } else if (e.key === "s" && selectedMessage) {
        runAction(selectedMessage.is_starred ? "unstar" : "star");
      } else if (e.key === "h" && selectedMessage) {
        runAction("handled");
      } else if (e.key === "r" && selectedMessage) {
        runAction("mark_read");
      } else if (e.key === "z" && selectedMessage) {
        setSnoozeOpen(true); setWaitingOpen(false);
      } else if (e.key === "w" && selectedMessage) {
        setWaitingOpen(true); setSnoozeOpen(false);
      } else if (e.key === "u" && selectedMessage) {
        runAction("unsnooze");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [messages, msgId, selectedMessage, runAction, setMsgId]);

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
                value={scope || ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setScope(v as any);
                  if (v !== "all") setSelectedId(v);
                }}
              >
                <option value="all">📥 All Inboxes</option>
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
                disabled={syncing || !scope}
                className="flex-1 flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
                Sync
              </button>
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border hover:bg-muted"
                title="Add another Gmail account"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>
            </div>
            {scope === "all" ? (
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Layers className="w-3 h-3" /> Merged view of {accounts.length} accounts</p>
            ) : selected?.last_sync_at ? (
              <p className="text-xs text-muted-foreground">Last sync: {new Date(selected.last_sync_at).toLocaleString()}</p>
            ) : null}
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

          <div className="p-3 border-t space-y-2">
            <button
              onClick={() => setHelpOpen(true)}
              className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted"
            >
              <Keyboard className="w-3.5 h-3.5" /> Shortcuts <kbd className="ml-auto font-mono border rounded px-1">?</kbd>
            </button>
            <button
              onClick={() => setPaletteOpen(true)}
              className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted"
            >
              Command palette <kbd className="ml-auto font-mono border rounded px-1">⌘K</kbd>
            </button>
          </div>
        </aside>

        <main className="flex-1 flex min-w-0">
          <div className="w-1/3 min-w-[320px] border-r flex flex-col">
            <div className="px-4 py-2 border-b text-xs text-muted-foreground flex items-center justify-between">
              <span>{loading ? "Loading..." : `${messages.length} messages`}</span>
              <span className="text-[10px] uppercase tracking-wider">{scope === "all" ? "all • " : ""}{filter}</span>
            </div>
            <InboxMessageList
              messages={messages}
              selectedId={msgId}
              onSelect={setMsgId}
            />
          </div>

          <div className="flex-1 min-w-0 border-r relative" ref={menuAnchorRef}>
            <InboxMessageDetail
              message={selectedMessage}
              onAction={(action, data) => selectedMessage && doAction(selectedMessage.id, action, data)}
            />
            {/* Global snooze/waiting menus triggered by keyboard */}
            {snoozeOpen && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40">
                <SnoozeMenu
                  open={snoozeOpen}
                  onClose={() => setSnoozeOpen(false)}
                  onPick={(until) => runAction("snooze", { until: until.toISOString() })}
                />
              </div>
            )}
            {waitingOpen && (
              <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40">
                <WaitingPrompt
                  open={waitingOpen}
                  onClose={() => setWaitingOpen(false)}
                  onSubmit={(person) => runAction("waiting_on", { person })}
                  defaultValue={selectedMessage?.waiting_on || ""}
                />
              </div>
            )}
          </div>

          <Contact360Panel message={selectedMessage} />
        </main>
      </div>

      <AddAccountModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdd={async (email, label) => { await addAccount(email, label); await refreshAccounts(); }}
      />
      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />
      <InboxCommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        accounts={accounts}
        setScope={(id) => { setScope(id); if (id !== "all") setSelectedId(id); }}
        setFilter={setFilter}
        runAction={(a) => runAction(a)}
        onHelp={() => setHelpOpen(true)}
      />
    </div>
  );
}
