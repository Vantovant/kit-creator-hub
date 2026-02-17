import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Mail, Eye, MousePointerClick, TrendingUp, AlertTriangle } from "lucide-react";

interface EventCounts {
  delivered: number;
  bounced: number;
  opened: number;
  clicked: number;
  complained: number;
}

export default function AnalyticsPage() {
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);
  const [totalSent, setTotalSent] = useState<number>(0);
  const [eventCounts, setEventCounts] = useState<EventCounts>({
    delivered: 0, bounced: 0, opened: 0, clicked: 0, complained: 0,
  });

  useEffect(() => {
    async function fetchData() {
      // Subscriber count
      const { count } = await supabase
        .from("prospects")
        .select("*", { count: "exact", head: true });
      setSubscriberCount(count ?? 0);

      // Count each event type server-side using exact count + head (no row limit issue)
      const eventTypes = [
        { key: "sent", filter: "email.sent" },
        { key: "delivered", filter: "email.delivered" },
        { key: "bounced", filter: "email.bounced" },
        { key: "opened", filter: "email.opened" },
        { key: "clicked", filter: "email.clicked" },
        { key: "complained", filter: "email.complained" },
      ] as const;

      const results = await Promise.all(
        eventTypes.map(({ filter }) =>
          supabase
            .from("email_events")
            .select("*", { count: "exact", head: true })
            .eq("event_type", filter)
        )
      );

      const countMap: Record<string, number> = {};
      eventTypes.forEach((et, i) => {
        countMap[et.key] = results[i].count ?? 0;
      });

      setTotalSent(countMap.sent);
      setEventCounts({
        delivered: countMap.delivered,
        bounced: countMap.bounced,
        opened: countMap.opened,
        clicked: countMap.clicked,
        complained: countMap.complained,
      });
    }
    fetchData();
  }, []);

  const openRate = totalSent > 0 ? ((eventCounts.opened / totalSent) * 100).toFixed(1) + "%" : "—";
  const clickRate = totalSent > 0 ? ((eventCounts.clicked / totalSent) * 100).toFixed(1) + "%" : "—";

  const stats = [
    { name: "Total Subscribers", value: subscriberCount !== null ? subscriberCount.toLocaleString() : "…", icon: Users },
    { name: "Emails Sent", value: totalSent.toLocaleString(), icon: Mail },
    { name: "Open Rate", value: openRate, icon: Eye },
    { name: "Click Rate", value: clickRate, icon: MousePointerClick },
  ];

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Analytics"
        subtitle="Track your email marketing performance"
      />

      <main className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name}>
              <CardContent className="p-6">
                <div className="p-2 bg-primary/10 rounded-lg w-fit mb-4">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Delivery breakdown */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Delivered</p>
              <p className="text-2xl font-bold text-green-600">{eventCounts.delivered}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground mb-1">Bounced</p>
              <p className="text-2xl font-bold text-destructive">{eventCounts.bounced}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Complaints</p>
                <p className="text-2xl font-bold text-amber-600">{eventCounts.complained}</p>
              </div>
              {eventCounts.complained > 0 && <AlertTriangle className="w-5 h-5 text-amber-500" />}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {totalSent === 0 ? (
              <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground">Analytics will populate as you send broadcasts</p>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center bg-muted/30 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="w-12 h-12 text-primary/30 mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    {totalSent} emails sent · {eventCounts.delivered} delivered · {eventCounts.opened} opened · {eventCounts.clicked} clicked
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
