"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Mail,
  TrendingUp,
  Eye,
  MousePointerClick,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";

const stats = [
  {
    name: "Total Subscribers",
    value: "12,847",
    change: "+12.5%",
    changeType: "positive",
    icon: Users,
  },
  {
    name: "Emails Sent",
    value: "48,293",
    change: "+8.2%",
    changeType: "positive",
    icon: Mail,
  },
  {
    name: "Open Rate",
    value: "42.3%",
    change: "+2.1%",
    changeType: "positive",
    icon: Eye,
  },
  {
    name: "Click Rate",
    value: "8.7%",
    change: "-0.4%",
    changeType: "negative",
    icon: MousePointerClick,
  },
];

const recentBroadcasts = [
  {
    id: 1,
    subject: "Welcome to our newsletter!",
    sentAt: "2 hours ago",
    opens: 1234,
    clicks: 89,
    openRate: "45.2%",
  },
  {
    id: 2,
    subject: "New product announcement",
    sentAt: "1 day ago",
    opens: 2341,
    clicks: 156,
    openRate: "41.8%",
  },
  {
    id: 3,
    subject: "Weekly digest #42",
    sentAt: "3 days ago",
    opens: 1876,
    clicks: 112,
    openRate: "38.9%",
  },
  {
    id: 4,
    subject: "Exclusive offer for subscribers",
    sentAt: "5 days ago",
    opens: 3102,
    clicks: 287,
    openRate: "52.1%",
  },
];

const recentSubscribers = [
  { id: 1, email: "alice@example.com", name: "Alice Johnson", joinedAt: "2 min ago" },
  { id: 2, email: "bob@example.com", name: "Bob Smith", joinedAt: "15 min ago" },
  { id: 3, email: "carol@example.com", name: "Carol Williams", joinedAt: "1 hour ago" },
  { id: 4, email: "david@example.com", name: "David Brown", joinedAt: "2 hours ago" },
  { id: 5, email: "emma@example.com", name: "Emma Davis", joinedAt: "3 hours ago" },
];

export default function DashboardPage() {
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
                  <div
                    className={`flex items-center gap-1 text-sm font-medium ${
                      stat.changeType === "positive"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {stat.changeType === "positive" ? (
                      <ArrowUpRight className="w-4 h-4" />
                    ) : (
                      <ArrowDownRight className="w-4 h-4" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.name}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent broadcasts */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">Recent Broadcasts</CardTitle>
              <a
                href="/dashboard/broadcasts"
                className="text-sm text-[#5CC5DE] hover:underline"
              >
                View all
              </a>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentBroadcasts.map((broadcast) => (
                  <div
                    key={broadcast.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {broadcast.subject}
                      </p>
                      <p className="text-sm text-gray-500">{broadcast.sentAt}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{broadcast.opens}</p>
                        <p className="text-gray-500">Opens</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{broadcast.openRate}</p>
                        <p className="text-gray-500">Rate</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent subscribers */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold">New Subscribers</CardTitle>
              <a
                href="/dashboard/subscribers"
                className="text-sm text-[#5CC5DE] hover:underline"
              >
                View all
              </a>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSubscribers.map((subscriber) => (
                  <div
                    key={subscriber.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#5CC5DE]/20 flex items-center justify-center text-[#5CC5DE] font-medium">
                      {subscriber.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{subscriber.name}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {subscriber.email}
                      </p>
                    </div>
                    <p className="text-sm text-gray-400">{subscriber.joinedAt}</p>
                  </div>
                ))}
              </div>
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
                <p className="text-gray-500">Growth chart visualization</p>
                <p className="text-sm text-gray-400">
                  +2,847 subscribers this month
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
