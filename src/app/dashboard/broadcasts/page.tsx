import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Send, Clock, Pencil, Trash2, BarChart3, Eye } from "lucide-react";

interface Broadcast {
  id: string;
  subject: string;
  status: string;
  total_recipients: number;
  total_sent: number;
  total_failed: number | null;
  created_at: string;
  sent_at: string | null;
}

interface BroadcastStats {
  opens: number;
  clicks: number;
  bounces: number;
}

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  sending: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  sent: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  failed: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsMap, setStatsMap] = useState<Record<string, BroadcastStats>>({});
  const [expandedStats, setExpandedStats] = useState<string | null>(null);

  useEffect(() => {
    const fetchBroadcasts = async () => {
      const { data } = await supabase
        .from("broadcasts")
        .select("*")
        .order("created_at", { ascending: false });
      const list = (data as Broadcast[]) || [];
      setBroadcasts(list);
      setLoading(false);

      // Fetch stats for sent broadcasts
      const sentIds = list.filter((b) => b.status === "sent").map((b) => b.id);
      if (sentIds.length > 0) {
        const { data: events } = await supabase
          .from("email_events")
          .select("broadcast_id, event_type")
          .in("broadcast_id", sentIds);
        const map: Record<string, BroadcastStats> = {};
        for (const id of sentIds) {
          map[id] = { opens: 0, clicks: 0, bounces: 0 };
        }
        if (events) {
          for (const e of events) {
            if (!e.broadcast_id || !map[e.broadcast_id]) continue;
            if (e.event_type === "email.opened") map[e.broadcast_id].opens++;
            else if (e.event_type === "email.clicked") map[e.broadcast_id].clicks++;
            else if (e.event_type === "email.bounced") map[e.broadcast_id].bounces++;
          }
        }
        setStatsMap(map);
      }
    };
    fetchBroadcasts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this broadcast draft?")) return;
    await supabase.from("broadcasts").delete().eq("id", id);
    setBroadcasts((prev) => prev.filter((b) => b.id !== id));
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Broadcasts"
        subtitle="Create and manage your email campaigns"
      />

      <main className="p-6 space-y-6">
        <div className="flex items-center justify-end">
          <a
            href="/dashboard/broadcasts/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Broadcast
          </a>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading…</p>
        ) : broadcasts.length === 0 ? (
          <Card className="bg-card">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="font-semibold text-foreground mb-2">No broadcasts yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first broadcast.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {broadcasts.map((b) => {
              const stats = statsMap[b.id];
              const openRate = stats && b.total_sent ? Math.round((stats.opens / b.total_sent) * 100) : 0;
              const clickRate = stats && b.total_sent ? Math.round((stats.clicks / b.total_sent) * 100) : 0;
              return (
                <Card key={b.id} className="bg-card">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-medium text-foreground">{b.subject || "Untitled"}</h3>
                          <Badge className={statusColors[b.status] || ""}>
                            {b.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {b.status === "sent"
                            ? `Sent to ${b.total_sent} of ${b.total_recipients} subscribers on ${formatDate(b.sent_at!)}`
                            : `Created ${formatDate(b.created_at)}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {b.status === "sent" && (
                          <button
                            type="button"
                            onClick={() => setExpandedStats(expandedStats === b.id ? null : b.id)}
                            className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground"
                            title="View Stats"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                        )}
                        {b.status === "sent" && (
                          <a
                            href={`/dashboard/broadcasts/new?id=${b.id}`}
                            className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </a>
                        )}
                        {b.status === "draft" && (
                          <>
                            <a
                              href={`/dashboard/broadcasts/new?id=${b.id}`}
                              className="p-2 rounded hover:bg-muted transition-colors text-muted-foreground"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => handleDelete(b.id)}
                              className="p-2 rounded hover:bg-destructive/10 transition-colors text-destructive"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    {expandedStats === b.id && stats && (
                      <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-lg font-semibold text-foreground">{openRate}%</p>
                          <p className="text-xs text-muted-foreground">Open Rate ({stats.opens})</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{clickRate}%</p>
                          <p className="text-xs text-muted-foreground">Click Rate ({stats.clicks})</p>
                        </div>
                        <div>
                          <p className="text-lg font-semibold text-foreground">{stats.bounces}</p>
                          <p className="text-xs text-muted-foreground">Bounces</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
