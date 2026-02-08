import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, Send, Clock, Pencil, Trash2 } from "lucide-react";

interface Broadcast {
  id: string;
  subject: string;
  status: string;
  total_recipients: number;
  total_sent: number;
  created_at: string;
  sent_at: string | null;
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

  useEffect(() => {
    const fetchBroadcasts = async () => {
      const { data } = await supabase
        .from("broadcasts")
        .select("*")
        .order("created_at", { ascending: false });
      setBroadcasts((data as Broadcast[]) || []);
      setLoading(false);
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
            {broadcasts.map((b) => (
              <Card key={b.id} className="bg-card">
                <CardContent className="p-4 flex items-center justify-between">
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
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
