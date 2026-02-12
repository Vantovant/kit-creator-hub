import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Mail,
  Eye,
  MousePointerClick,
  TrendingUp,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Prospect {
  id: string;
  email: string;
  first_name: string | null;
  created_at: string;
  source: string | null;
}

interface GrowthPoint {
  date: string;
  subscribers: number;
}

export default function DashboardPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [growthData, setGrowthData] = useState<GrowthPoint[]>([]);
  const [emailStats, setEmailStats] = useState({ sent: 0, opens: 0, clicks: 0 });
  const [recentBroadcasts, setRecentBroadcasts] = useState<{ id: string; subject: string; status: string; sent_at: string | null; total_sent: number | null; total_recipients: number | null; created_at: string }[]>([]);

  useEffect(() => {
    async function fetchData() {
      // Fetch recent prospects, total count, broadcasts stats, and email events in parallel
      const [prospectsRes, countRes, broadcastsRes, eventsRes, recentBroadcastsRes] = await Promise.all([
        supabase
          .from("prospects")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("prospects")
          .select("*", { count: "exact", head: true }),
        supabase
          .from("broadcasts")
          .select("total_sent")
          .eq("status", "sent"),
        supabase
          .from("email_events")
          .select("event_type"),
        supabase
          .from("broadcasts")
          .select("id, subject, status, sent_at, total_sent, total_recipients, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      setProspects(prospectsRes.data || []);
      setTotalCount(countRes.count || 0);

      // Calculate email stats
      const totalSent = (broadcastsRes.data || []).reduce((sum, b) => sum + (b.total_sent || 0), 0);
      const events = eventsRes.data || [];
      const opens = events.filter((e) => e.event_type?.toLowerCase().includes("opened")).length;
      const clicks = events.filter((e) => e.event_type?.toLowerCase().includes("clicked")).length;
      setEmailStats({ sent: totalSent, opens, clicks });
      setRecentBroadcasts(recentBroadcastsRes.data || []);

      // Build growth chart from prospect created_at dates
      const allProspects = prospectsRes.data || [];
      // We need all prospects for growth chart, fetch creation dates
      const { data: allDates } = await supabase
        .from("prospects")
        .select("created_at")
        .order("created_at", { ascending: true });

      if (allDates && allDates.length > 0) {
        const dailyMap: Record<string, number> = {};
        allDates.forEach((p) => {
          const day = new Date(p.created_at).toISOString().split("T")[0];
          dailyMap[day] = (dailyMap[day] || 0) + 1;
        });

        // Build cumulative growth
        const sorted = Object.keys(dailyMap).sort();
        let cumulative = 0;
        const points: GrowthPoint[] = sorted.map((date) => {
          cumulative += dailyMap[date];
          return {
            date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            subscribers: cumulative,
          };
        });
        setGrowthData(points);
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  const openRate = emailStats.sent > 0 ? ((emailStats.opens / emailStats.sent) * 100).toFixed(1) + "%" : "—";
  const clickRate = emailStats.sent > 0 ? ((emailStats.clicks / emailStats.sent) * 100).toFixed(1) + "%" : "—";

  const stats = [
    { name: "Total Subscribers", value: totalCount.toLocaleString(), icon: Users },
    { name: "Emails Sent", value: emailStats.sent.toLocaleString(), icon: Mail },
    { name: "Open Rate", value: openRate, icon: Eye },
    { name: "Click Rate", value: clickRate, icon: MousePointerClick },
  ];

  const recentSubscribers = prospects.slice(0, 5);

  const getInitials = (name: string | null, email: string) => {
    if (name) return name.split(" ").map((n) => n[0]).join("").toUpperCase();
    return email[0].toUpperCase();
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Dashboard"
        subtitle="Welcome back! Here's what's happening with your newsletter."
      />

      <main className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name} className="bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-muted rounded-lg">
                    <stat.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-foreground">
                    {loading ? "…" : stat.value}
                  </p>
                  <p className="text-sm text-muted-foreground">{stat.name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Broadcasts</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Loading…</p>
              ) : recentBroadcasts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Mail className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No broadcasts yet.</p>
                  <p className="text-sm text-muted-foreground/70">Create your first broadcast to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentBroadcasts.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground truncate">{b.subject}</p>
                        <p className="text-sm text-muted-foreground">
                          {b.status === "sent"
                            ? `Sent to ${b.total_recipients || 0} · ${new Date(b.sent_at || b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                            : b.status === "scheduled"
                            ? `Scheduled`
                            : `Draft · Created ${new Date(b.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        b.status === "sent" ? "bg-green-500/10 text-green-600" :
                        b.status === "scheduled" ? "bg-blue-500/10 text-blue-600" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {b.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">New Subscribers</CardTitle>
              <a href="/dashboard/subscribers" className="text-sm text-primary hover:underline">View all</a>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground text-center py-8">Loading…</p>
              ) : recentSubscribers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">No subscribers yet.</p>
                  <p className="text-sm text-muted-foreground/70">Share your welcome form to start growing.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSubscribers.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                        {getInitials(sub.first_name, sub.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground">{sub.first_name || sub.email}</p>
                        <p className="text-sm text-muted-foreground truncate">{sub.email}</p>
                      </div>
                      <p className="text-sm text-muted-foreground">{getTimeAgo(sub.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Growth chart */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Subscriber Growth</CardTitle>
          </CardHeader>
          <CardContent>
            {growthData.length === 0 ? (
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground">Growth chart will appear as you gain subscribers</p>
                </div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={growthData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        color: "hsl(var(--foreground))",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="subscribers"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fill="url(#growthGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
