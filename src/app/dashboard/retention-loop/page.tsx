import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type DispatchRow = {
  id: string;
  idempotency_key: string;
  hub_event_id: string | null;
  origin_app: string;
  origin_event_id: string | null;
  campaign_type: string;
  template_name: string;
  recipient_email: string | null;
  recipient_hash: string | null;
  body_preview: string | null;
  status: string;
  skip_reason: string | null;
  email_send_id: string | null;
  received_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  sent: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  skipped: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  failed: "bg-rose-500/20 text-rose-300 border-rose-500/30",
};

export default function RetentionLoopPage() {
  const [rows, setRows] = useState<DispatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");
  const [campaign, setCampaign] = useState<string>("all");
  const [origin, setOrigin] = useState<string>("all");
  const [selected, setSelected] = useState<DispatchRow | null>(null);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("email_dispatch_log")
      .select("*")
      .order("received_at", { ascending: false })
      .limit(200);
    if (!error && data) setRows(data as DispatchRow[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => rows.filter(r =>
    (status === "all" || r.status === status) &&
    (campaign === "all" || r.campaign_type === campaign) &&
    (origin === "all" || r.origin_app === origin)
  ), [rows, status, campaign, origin]);

  const campaigns = useMemo(() => Array.from(new Set(rows.map(r => r.campaign_type))), [rows]);
  const origins = useMemo(() => Array.from(new Set(rows.map(r => r.origin_app))), [rows]);

  const counts = useMemo(() => {
    const c = { queued: 0, sent: 0, skipped: 0, failed: 0 };
    for (const r of rows) if (r.status in c) (c as any)[r.status]++;
    return c;
  }, [rows]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Retention Loop Inbox</h1>
          <p className="text-sm opacity-70 mt-1">
            Emails dispatched from the VantoOS Hub as follow-ups to GetWell Grow WhatsApp touches. Latest 200.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["queued","sent","skipped","failed"] as const).map(k => (
          <div key={k} className="rounded-lg border border-white/10 p-3">
            <div className="text-xs uppercase opacity-60">{k}</div>
            <div className="text-2xl font-bold mt-1">{counts[k]}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select value={status} onChange={e => setStatus(e.target.value)} className="bg-transparent border border-white/15 rounded-md px-2 py-1 text-sm">
          <option value="all">All statuses</option>
          <option value="queued">Queued</option>
          <option value="sent">Sent</option>
          <option value="skipped">Skipped</option>
          <option value="failed">Failed</option>
        </select>
        <select value={campaign} onChange={e => setCampaign(e.target.value)} className="bg-transparent border border-white/15 rounded-md px-2 py-1 text-sm">
          <option value="all">All campaigns</option>
          {campaigns.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={origin} onChange={e => setOrigin(e.target.value)} className="bg-transparent border border-white/15 rounded-md px-2 py-1 text-sm">
          <option value="all">All origins</option>
          {origins.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-white/10 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-white/5">
            <tr className="text-left">
              <th className="px-3 py-2">Received</th>
              <th className="px-3 py-2">Origin</th>
              <th className="px-3 py-2">Campaign</th>
              <th className="px-3 py-2">Template</th>
              <th className="px-3 py-2">Recipient</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="px-3 py-6 text-center opacity-60">Loading…</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-6 text-center opacity-60">No dispatches yet.</td></tr>
            )}
            {filtered.map(r => (
              <tr
                key={r.id}
                onClick={() => setSelected(r)}
                className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
              >
                <td className="px-3 py-2 whitespace-nowrap">{new Date(r.received_at).toLocaleString()}</td>
                <td className="px-3 py-2">{r.origin_app}</td>
                <td className="px-3 py-2">{r.campaign_type}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.template_name}</td>
                <td className="px-3 py-2">{r.recipient_email ?? <span className="opacity-50">—</span>}</td>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded border text-xs ${STATUS_COLORS[r.status] ?? ""}`}>
                    {r.status}{r.skip_reason ? ` · ${r.skip_reason}` : ""}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <div
          className="fixed inset-0 bg-black/60 flex items-end md:items-center justify-center z-50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-background border border-white/10 rounded-t-xl md:rounded-xl w-full md:max-w-2xl max-h-[85vh] overflow-y-auto p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-4">
              <div>
                <div className="text-xs opacity-60">{selected.origin_app} · {selected.campaign_type}</div>
                <h2 className="text-lg font-bold mt-1">{selected.template_name}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="text-xl opacity-60 hover:opacity-100">×</button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <Field label="Recipient" value={selected.recipient_email ?? selected.recipient_hash ?? "—"} />
              <Field label="Status" value={`${selected.status}${selected.skip_reason ? ` — ${selected.skip_reason}` : ""}`} />
              <Field label="Idempotency key" value={selected.idempotency_key} mono />
              <Field label="Hub event" value={selected.hub_event_id ?? "—"} mono />
              <Field label="Origin event" value={selected.origin_event_id ?? "—"} mono />
              <Field label="Email send id" value={selected.email_send_id ?? "—"} mono />
              <Field label="Received" value={new Date(selected.received_at).toLocaleString()} />
              {selected.body_preview && (
                <div>
                  <div className="text-xs uppercase opacity-60 mb-1">WhatsApp body this email echoes</div>
                  <div className="rounded-md border border-white/10 bg-white/5 p-3 whitespace-pre-wrap">
                    {selected.body_preview}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs uppercase opacity-60 shrink-0">{label}</span>
      <span className={`text-right break-all ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
