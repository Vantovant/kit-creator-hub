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
  ArrowUpRight,
} from "lucide-react";

interface Prospect {
  id: string;
  email: string;
  first_name: string | null;
  created_at: string;
  source: string | null;
}

export default function DashboardPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProspects() {
      const { data } = await supabase
        .from("prospects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setProspects(data || []);
      setLoading(false);
    }
    fetchProspects();
  }, []);

  const totalSubscribers = prospects.length;

  const stats = [
    {
      name: "Total Subscribers",
      value: totalSubscribers.toLocaleString(),
      icon: Users,
    },
    {
      name: "Emails Sent",
      value: "0",
      icon: Mail,
    },
    {
      name: "Open Rate",
      value: "—",
      icon: Eye,
    },
    {
      name: "Click Rate",
      value: "—",
      icon: MousePointerClick,
    },
  ];

  const recentSubscribers = prospects.slice(0, 5);

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
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
        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.name} className="bg-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <stat.icon className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900">
                    {loading ? "…" : stat.value}
                  </p>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent broadcasts - empty state */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Broadcasts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Mail className="w-10 h-10 text-gray-300 mb-3" />
                <p className="text-gray-500">No broadcasts sent yet.</p>
                <p className="text-sm text-gray-400">Create your first broadcast to get started.</p>
              </div>
            </CardContent>
          </Card>

          {/* Recent subscribers */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">New Subscribers</CardTitle>
              <a
                href="/dashboard/subscribers"
                className="text-sm text-primary hover:underline"
              >
                View all
              </a>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-gray-400 text-center py-8">Loading…</p>
              ) : recentSubscribers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Users className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-gray-500">No subscribers yet.</p>
                  <p className="text-sm text-gray-400">Share your welcome form to start growing.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentSubscribers.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                        {getInitials(sub.first_name, sub.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900">
                          {sub.first_name || sub.email}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{sub.email}</p>
                      </div>
                      <p className="text-sm text-gray-400">{getTimeAgo(sub.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Growth chart placeholder */}
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Subscriber Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Growth chart will appear as you gain subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
