import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Mail, Eye, MousePointerClick, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  const [subscriberCount, setSubscriberCount] = useState<number | null>(null);

  useEffect(() => {
    async function fetchCount() {
      const { count } = await supabase
        .from("prospects")
        .select("*", { count: "exact", head: true });
      setSubscriberCount(count ?? 0);
    }
    fetchCount();
  }, []);

  const stats = [
    { name: "Total Subscribers", value: subscriberCount !== null ? subscriberCount.toLocaleString() : "…", icon: Users },
    { name: "Emails Sent", value: "0", icon: Mail },
    { name: "Avg. Open Rate", value: "—", icon: Eye },
    { name: "Avg. Click Rate", value: "—", icon: MousePointerClick },
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
            <Card key={stat.name} className="bg-white">
              <CardContent className="p-6">
                <div className="p-2 bg-gray-100 rounded-lg w-fit mb-4">
                  <stat.icon className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Analytics will populate as you send broadcasts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
