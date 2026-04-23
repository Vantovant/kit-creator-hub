import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  Link2,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// Sequence names of interest for the bridge QA
const BRIDGE_SEQUENCE_NAMES = ["RLX_SLEEP_BRIDGE", "NRM_GUT_BRIDGE"];

interface QueueRow {
  id: string;
  automation_id: string;
  step_index: number;
  send_at: string;
  status: string;
  step_data: any;
}

interface EventRow {
  id: string;
  event_type: string;
  created_at: string;
  metadata: any;
}

interface OutboundRow {
  id: string;
  subject: string;
  sent_at: string;
  sequence_id: string | null;
  sequence_step_index: number | null;
  brand: string;
}

interface ReplyRow {
  id: string;
  subject: string | null;
  snippet: string | null;
  received_at: string;
  reply_status: string;
}

interface UrlCheck {
  url: string;
  status: number | null;
  ok: boolean;
  error?: string;
  ms: number;
}

interface SequenceValidation {
  id: string;
  name: string;
  brand: string;
  status: string;
  total_urls: number;
  broken_urls: number;
  steps: {
    step_index: number;
    subject?: string;
    urls: UrlCheck[];
  }[];
}

interface ValidatorResponse {
  checked_at: string;
  sequence_count: number;
  total_urls: number;
  broken_urls: number;
  sequences: SequenceValidation[];
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/20 text-amber-700 dark:text-amber-300",
    sent: "bg-green-500/20 text-green-700 dark:text-green-300",
    failed: "bg-destructive/20 text-destructive",
    skipped: "bg-muted text-muted-foreground",
    processed: "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        map[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {status}
    </span>
  );
}

function EventBadge({ type }: { type: string }) {
  const t = type.toLowerCase();
  let cls = "bg-muted text-muted-foreground";
  if (t.includes("clicked")) cls = "bg-primary/20 text-primary";
  else if (t.includes("opened")) cls = "bg-blue-500/20 text-blue-700 dark:text-blue-300";
  else if (t.includes("delivered")) cls = "bg-green-500/20 text-green-700 dark:text-green-300";
  else if (t.includes("sent")) cls = "bg-slate-500/20 text-slate-700 dark:text-slate-300";
  else if (t.includes("bounced") || t.includes("complained"))
    cls = "bg-destructive/20 text-destructive";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {type}
    </span>
  );
}

export default function SequenceQAPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookup state
  const [prospectId, setProspectId] = useState<string | null>(null);
  const [unsubscribed, setUnsubscribed] = useState<boolean>(false);
  const [bridgeSequences, setBridgeSequences] = useState<
    { id: string; name: string }[]
  >([]);
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [outbound, setOutbound] = useState<OutboundRow[]>([]);
  const [replies, setReplies] = useState<ReplyRow[]>([]);

  // Validator state
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidatorResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  async function runLookup() {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const cleanEmail = email.trim().toLowerCase();

      // 1. Bridge sequences
      const { data: seqs } = await supabase
        .from("email_sequences")
        .select("id, name")
        .in("name", BRIDGE_SEQUENCE_NAMES);
      const seqList = seqs ?? [];
      setBridgeSequences(seqList);
      const bridgeIds = seqList.map((s) => s.id);

      // 2. Prospect lookup
      const { data: prospect } = await supabase
        .from("prospects")
        .select("id, unsubscribed")
        .ilike("email", cleanEmail)
        .maybeSingle();
      setProspectId(prospect?.id ?? null);
      setUnsubscribed(prospect?.unsubscribed ?? false);

      // 3. automation_queue rows for THIS email scoped to bridge sequences
      let q = supabase
        .from("automation_queue")
        .select("id, automation_id, step_index, send_at, status, step_data")
        .ilike("email", cleanEmail)
        .order("send_at", { ascending: true });
      if (bridgeIds.length > 0) {
        q = q.in("automation_id", bridgeIds);
      }
      const { data: queueRows } = await q;
      setQueue(queueRows ?? []);

      // 4. Email events (latest 30)
      const { data: evRows } = await supabase
        .from("email_events")
        .select("id, event_type, created_at, metadata")
        .ilike("email", cleanEmail)
        .order("created_at", { ascending: false })
        .limit(30);
      setEvents(evRows ?? []);

      // 5. Outbound sends scoped to bridge sequences
      let outQ = supabase
        .from("zazi_outbound_sends")
        .select("id, subject, sent_at, sequence_id, sequence_step_index, brand")
        .ilike("recipient_email", cleanEmail)
        .order("sent_at", { ascending: false })
        .limit(20);
      if (bridgeIds.length > 0) {
        outQ = outQ.in("sequence_id", bridgeIds);
      }
      const { data: outRows } = await outQ;
      setOutbound(outRows ?? []);

      // 6. Replies (any inbound from this sender)
      const { data: repRows } = await supabase
        .from("zazi_inbound_replies")
        .select("id, subject, snippet, received_at, reply_status")
        .ilike("sender_email", cleanEmail)
        .order("received_at", { ascending: false })
        .limit(10);
      setReplies(repRows ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  async function runValidator() {
    setValidating(true);
    setValidationError(null);
    setValidation(null);
    try {
      // Validate both bridge sequences (one call each, merged)
      const responses = await Promise.all(
        BRIDGE_SEQUENCE_NAMES.map((name) =>
          supabase.functions.invoke("validate-lead-magnets", {
            body: null,
            method: "GET" as any,
          }).then(async () => {
            // functions.invoke doesn't pass query strings — call via fetch instead
            const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
            const url = `https://${projectId}.supabase.co/functions/v1/validate-lead-magnets?sequence_name=${encodeURIComponent(name)}`;
            const { data: { session } } = await supabase.auth.getSession();
            const r = await fetch(url, {
              headers: {
                Authorization: `Bearer ${session?.access_token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
            });
            if (!r.ok) throw new Error(`Validator returned ${r.status}`);
            return (await r.json()) as ValidatorResponse;
          })
        )
      );

      const merged: ValidatorResponse = {
        checked_at: new Date().toISOString(),
        sequence_count: responses.reduce((s, r) => s + r.sequence_count, 0),
        total_urls: responses.reduce((s, r) => s + r.total_urls, 0),
        broken_urls: responses.reduce((s, r) => s + r.broken_urls, 0),
        sequences: responses.flatMap((r) => r.sequences),
      };
      setValidation(merged);
    } catch (e) {
      setValidationError(e instanceof Error ? e.message : "Validator failed");
    } finally {
      setValidating(false);
    }
  }

  const enrolledIn = bridgeSequences
    .filter((s) => queue.some((q) => q.automation_id === s.id))
    .map((s) => s.name);

  const nextSend = queue
    .filter((q) => q.status === "pending")
    .sort((a, b) => a.send_at.localeCompare(b.send_at))[0];

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Sequence QA"
        subtitle="Diagnose a single test lead across the RLX & NRM bridge sequences"
      />

      <main className="p-6 space-y-6">
        {/* Lookup card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              Look up a test lead
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Label htmlFor="qa-email">Test lead email</Label>
                <Input
                  id="qa-email"
                  type="email"
                  placeholder="qa-lead-1@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runLookup()}
                />
              </div>
              <Button onClick={runLookup} disabled={loading || !email.trim()}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Search className="w-4 h-4 mr-2" />
                )}
                Lookup
              </Button>
            </div>
            {error && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {error}
              </p>
            )}
          </CardContent>
        </Card>

        {searched && !loading && (
          <>
            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Prospect</p>
                  <p className="text-sm font-semibold">
                    {prospectId ? (
                      <span className="text-green-600">Found</span>
                    ) : (
                      <span className="text-muted-foreground">Not in CRM</span>
                    )}
                  </p>
                  {unsubscribed && (
                    <p className="text-xs text-destructive mt-1">Unsubscribed</p>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Enrolled in</p>
                  <p className="text-sm font-semibold">
                    {enrolledIn.length > 0 ? (
                      enrolledIn.join(", ")
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Next send</p>
                  <p className="text-sm font-semibold">
                    {nextSend ? (
                      <>
                        Step {nextSend.step_index} ·{" "}
                        {new Date(nextSend.send_at).toLocaleString()}
                      </>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground mb-1">Events / Sends / Replies</p>
                  <p className="text-sm font-semibold">
                    {events.length} · {outbound.length} · {replies.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Queue */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Automation queue ({queue.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queue.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No bridge-sequence queue entries for this email.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="text-left py-2 pr-3">Sequence</th>
                          <th className="text-left py-2 pr-3">Step</th>
                          <th className="text-left py-2 pr-3">Send at</th>
                          <th className="text-left py-2 pr-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queue.map((q) => {
                          const seq = bridgeSequences.find(
                            (s) => s.id === q.automation_id
                          );
                          return (
                            <tr
                              key={q.id}
                              className="border-b border-border/50 last:border-0"
                            >
                              <td className="py-2 pr-3 font-mono text-xs">
                                {seq?.name ?? q.automation_id.slice(0, 8)}
                              </td>
                              <td className="py-2 pr-3">{q.step_index}</td>
                              <td className="py-2 pr-3">
                                {new Date(q.send_at).toLocaleString()}
                              </td>
                              <td className="py-2 pr-3">
                                <StatusBadge status={q.status} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Outbound sends */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Outbound sends ({outbound.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {outbound.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No bridge sends recorded for this email yet.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {outbound.map((o) => {
                      const seq = bridgeSequences.find(
                        (s) => s.id === o.sequence_id
                      );
                      return (
                        <li
                          key={o.id}
                          className="flex items-start justify-between gap-3 text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0"
                        >
                          <div>
                            <p className="font-medium">{o.subject}</p>
                            <p className="text-xs text-muted-foreground">
                              {seq?.name ?? "—"} · step{" "}
                              {o.sequence_step_index ?? "?"} · {o.brand}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(o.sent_at).toLocaleString()}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Email events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Email events ({events.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No delivery events recorded yet.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {events.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <EventBadge type={e.event_type} />
                          {e.metadata?.subject && (
                            <span className="text-xs text-muted-foreground truncate max-w-md">
                              {e.metadata.subject}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(e.created_at).toLocaleString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Replies */}
            {replies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Inbound replies ({replies.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {replies.map((r) => (
                      <li
                        key={r.id}
                        className="text-sm border-b border-border/50 last:border-0 pb-2 last:pb-0"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{r.subject ?? "(no subject)"}</p>
                          <Badge variant="outline" className="text-xs">
                            {r.reply_status}
                          </Badge>
                        </div>
                        {r.snippet && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {r.snippet}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(r.received_at).toLocaleString()}
                        </p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Lead magnet link validator */}
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Lead-magnet link validator
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={runValidator}
              disabled={validating}
            >
              {validating ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Validate now
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              HEAD-checks every URL inside <code>RLX_SLEEP_BRIDGE</code> and{" "}
              <code>NRM_GUT_BRIDGE</code> sequence steps. Read-only — does not
              touch sequence content.
            </p>

            {validationError && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {validationError}
              </p>
            )}

            {validation && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <span>
                    <strong>{validation.total_urls}</strong> URLs checked across{" "}
                    <strong>{validation.sequence_count}</strong> sequence
                    {validation.sequence_count === 1 ? "" : "s"}
                  </span>
                  {validation.broken_urls > 0 ? (
                    <Badge variant="destructive">
                      {validation.broken_urls} broken
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-transparent">
                      All OK
                    </Badge>
                  )}
                </div>

                {validation.sequences.map((seq) => (
                  <div
                    key={seq.id}
                    className="border border-border rounded-md p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">
                        {seq.name}{" "}
                        <span className="text-muted-foreground font-normal">
                          ({seq.brand} · {seq.status})
                        </span>
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {seq.broken_urls === 0
                          ? `${seq.total_urls} OK`
                          : `${seq.broken_urls}/${seq.total_urls} broken`}
                      </span>
                    </div>
                    {seq.steps.map((step) => (
                      <div key={step.step_index} className="text-xs space-y-1">
                        <p className="text-muted-foreground">
                          Step {step.step_index} · {step.subject ?? "(no subject)"}
                        </p>
                        <ul className="space-y-1 pl-3">
                          {step.urls.map((u) => (
                            <li
                              key={u.url}
                              className="flex items-start gap-2 font-mono text-[11px] break-all"
                            >
                              {u.ok ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                              )}
                              <span className="flex-1">{u.url}</span>
                              <span className="text-muted-foreground whitespace-nowrap">
                                {u.status ?? "ERR"} · {u.ms}ms
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
