import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { useInboxAccounts } from "@/hooks/useInboxAccounts";
import { useInbox, InboxFilter } from "@/hooks/useInbox";
import { useResizablePanels, ResizeHandle } from "@/hooks/useResizablePanels";
import { InboxMessageList, Density } from "@/components/inbox/InboxMessageList";
import { InboxMessageDetail } from "@/components/inbox/InboxMessageDetail";
import { Contact360Panel } from "@/components/inbox/Contact360Panel";
import { AddAccountModal } from "@/components/inbox/AddAccountModal";
import { HelpOverlay } from "@/components/inbox/HelpOverlay";
import { InboxCommandPalette } from "@/components/inbox/InboxCommandPalette";
import { SnoozeMenu } from "@/components/inbox/SnoozeMenu";
import { WaitingPrompt } from "@/components/inbox/WaitingPrompt";
import { BulkActionBar } from "@/components/inbox/BulkActionBar";
import { Inbox, Star, Archive, Clock, CheckCircle2, RefreshCw, Plus, Keyboard, Layers, Rows2, Rows3, PanelRightClose, PanelRight } from "lucide-react";
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
  const [fullscreen, setFullscreen] = useState(false);
  const [density, setDensity] = useState<Density>(() => (localStorage.getItem("inbox-density") as Density) || "compact");
  const [showContact, setShowContact] = useState(() => localStorage.getItem("inbox-showContact") !== "0");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const menuAnchorRef = useRef<HTMLDivElement>(null);

  const { widths, startDrag } = useResizablePanels("inbox-widths-v2", [420, 620]);

  const selectedMessage = messages.find((m) => m.id === msgId) || messages[0] || null;

  useEffect(() => {
    if (scope === null && (accounts[0]?.id || accountsLoading === false)) {
      setScope(accounts[0]?.id ?? "all");
      if (accounts[0]?.id) setSelectedId(accounts[0].id);
    }
  }, [accounts, accountsLoading, scope, setSelectedId]);

  useEffect(() => { localStorage.setItem("inbox-density", density); }, [density]);
  useEffect(() => { localStorage.setItem("inbox-showContact", showContact ? "1" : "0"); }, [showContact]);

  // Reset selection when filter/scope changes
  useEffect(() => { setSelectedIds(new Set()); }, [filter, scope]);

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

  const toggleCheck = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback((checked: boolean) => {
    setSelectedIds(checked ? new Set(messages.map((m) => m.id)) : new Set());
  }, [messages]);

  const bulkRun = useCallback(async (action: string) => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    // Run sequentially to avoid gateway rate spikes
    for (const id of ids) {
      try { await doAction(id, action); } catch (e) { console.error("bulk", action, id, e); }
    }
    setSelectedIds(new Set());
    await refresh();
  }, [selectedIds, doAction, refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
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
      } else if (e.key === "x" && selectedMessage) {
        toggleCheck(selectedMessage.id, !selectedIds.has(selectedMessage.id));
      } else if (e.key === "e" && selectedMessage) {
        runAction(selectedMessage.is_archived ? "unarchive" : "archive");
      } else if (e.key === "s" && selectedMessage) {
        runAction(selectedMessage.is_starred ? "unstar" : "star");
      } else if (e.key === "h" && selectedMessage) {
        runAction("handled");
      } else if (e.key === "#" && selectedMessage) {
        runAction("trash");
      } else if (e.key === "r" && selectedMessage) {
        runAction("mark_read");
      } else if (e.key === "z" && selectedMessage) {
        setSnoozeOpen(true); setWaitingOpen(false);
      } else if (e.key === "w" && selectedMessage) {
        setWaitingOpen(true); setSnoozeOpen(false);
      } else if (e.key === "u" && selectedMessage) {
        runAction("unsnooze");
      } else if (e.key === "f") {
        setFullscreen((v) => !v);
      } else if (e.key === "Escape" && fullscreen) {
        setFullscreen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [messages, msgId, selectedMessage, runAction, setMsgId, selectedIds, toggleCheck, fullscreen]);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col">
      <DashboardHeader
        title="Inbox"
        subtitle="Superhuman triage + Nimble contact intelligence for your Gmail."
      />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-60 shrink-0 border-r flex flex-col">
          <div className="p-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mailboxes</span>
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-1 text-[11px] px-1.5 py-1 rounded hover:bg-muted"
                title="Add another Gmail account"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {accountsLoading ? (
              <p className="text-xs text-muted-foreground">Loading…</p>
            ) : (
              <div className="space-y-1">
                <button
                  onClick={() => setScope("all")}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors",
                    scope === "all" ? "bg-muted font-medium" : "hover:bg-muted/50",
                  )}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="truncate flex-1 text-left">All Inboxes</span>
                  <span className="text-[10px] text-muted-foreground">{accounts.length}</span>
                </button>
                {accounts.map((a) => {
                  const active = scope === a.id;
                  const needsAuth = a.status === "needs_authorization";
                  return (
                    <div
                      key={a.id}
                      className={cn(
                        "group rounded-md border transition-colors",
                        active ? "border-primary/40 bg-muted" : "border-transparent hover:bg-muted/50",
                      )}
                    >
                      <button
                        onClick={() => { setScope(a.id); setSelectedId(a.id); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left"
                        title={a.email_address}
                      >
                        <Inbox className="w-3.5 h-3.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="truncate text-sm font-medium">{a.email_address}</div>
                          {a.label && (
                            <div className="truncate text-[10px] text-muted-foreground">{a.label}</div>
                          )}
                        </div>
                        {needsAuth && (
                          <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400">AUTH</span>
                        )}
                      </button>
                      {active && (
                        <div className="flex items-center gap-1 px-2 pb-1.5 text-[10px] text-muted-foreground">
                          <button
                            onClick={() => syncAccount(a.id).then(() => refresh())}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded border hover:bg-background"
                            title="Sync this mailbox"
                          >
                            <RefreshCw className="w-3 h-3" /> Sync
                          </button>
                          <span className="truncate">
                            {a.last_sync_at ? `Last: ${new Date(a.last_sync_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not synced"}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={handleSync}
              disabled={syncing || !scope}
              className="w-full flex items-center justify-center gap-1.5 text-xs px-2 py-1.5 rounded-md border hover:bg-muted disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
              {scope === "all" ? "Sync all" : "Sync selected"}
            </button>
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
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
                className="flex-1 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted"
                title="Toggle row density"
              >
                {density === "compact" ? <Rows3 className="w-3.5 h-3.5" /> : <Rows2 className="w-3.5 h-3.5" />}
                {density === "compact" ? "Compact" : "Comfortable"}
              </button>
              <button
                onClick={() => setShowContact((v) => !v)}
                className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                title={showContact ? "Hide contact panel" : "Show contact panel"}
              >
                {showContact ? <PanelRightClose className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
              </button>
            </div>
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
          {!fullscreen && (
            <>
              <div className="shrink-0 flex flex-col border-r" style={{ width: widths[0] }}>
                <div className="px-4 py-2 border-b text-xs text-muted-foreground flex items-center justify-between shrink-0">
                  <span>{loading ? "Loading..." : `${messages.length} messages`}</span>
                  <span className="text-[10px] uppercase tracking-wider">{scope === "all" ? "all • " : ""}{filter}</span>
                </div>
                <BulkActionBar
                  count={selectedIds.size}
                  onClear={() => setSelectedIds(new Set())}
                  onArchive={() => bulkRun("archive")}
                  onTrash={() => bulkRun("trash")}
                  onHandled={() => bulkRun("handled")}
                  onMarkRead={() => bulkRun("mark_read")}
                  onStar={() => bulkRun("star")}
                  onUnstar={() => bulkRun("unstar")}
                />
                <InboxMessageList
                  messages={messages}
                  selectedId={msgId}
                  selectedIds={selectedIds}
                  onSelect={setMsgId}
                  onToggleCheck={toggleCheck}
                  onToggleAll={toggleAll}
                  onQuickAction={(id, action) => doAction(id, action)}
                  density={density}
                />
              </div>
              <ResizeHandle onPointerDown={startDrag(0)} />
            </>
          )}

          <div className="flex-1 min-w-0 relative" ref={menuAnchorRef} style={fullscreen || !showContact ? undefined : { width: widths[1] }}>
            <InboxMessageDetail
              message={selectedMessage}
              onAction={(action, data) => selectedMessage && doAction(selectedMessage.id, action, data)}
              accountId={selectedMessage?.account_id || selectedId}
              fullscreen={fullscreen}
              onToggleFullscreen={() => setFullscreen((v) => !v)}
              onReplySent={refresh}
            />
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

          {!fullscreen && showContact && (
            <>
              <ResizeHandle onPointerDown={startDrag(1)} />
              <div className="shrink-0 min-w-[260px]" style={{ width: "auto", flex: "0 0 320px" }}>
                <Contact360Panel message={selectedMessage} />
              </div>
            </>
          )}
        </main>
      </div>

      <AddAccountModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onOpenSettings={() => { window.location.href = "/dashboard/settings?tab=email"; }}
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
