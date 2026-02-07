"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Mail,
  Eye,
  MousePointerClick,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const overviewStats = [
  {
    name: "Total Subscribers",
    value: "12,847",
    change: "+847",
    changePercent: "+7.1%",
    changeType: "positive",
    icon: Users,
  },
  {
    name: "Emails Sent",
    value: "48,293",
    change: "+12,341",
    changePercent: "+34.3%",
    changeType: "positive",
    icon: Mail,
  },
  {
    name: "Avg. Open Rate",
    value: "42.3%",
    change: "+2.1%",
    changePercent: "",
    changeType: "positive",
    icon: Eye,
  },
  {
    name: "Avg. Click Rate",
    value: "8.7%",
    change: "-0.4%",
    changePercent: "",
    changeType: "negative",
    icon: MousePointerClick,
  },
];

const subscriberGrowthData = [
  { month: "Sep", subscribers: 8234, newSubs: 512 },
  { month: "Oct", subscribers: 9102, newSubs: 868 },
  { month: "Nov", subscribers: 10456, newSubs: 1354 },
  { month: "Dec", subscribers: 11234, newSubs: 778 },
  { month: "Jan", subscribers: 12000, newSubs: 766 },
  { month: "Feb", subscribers: 12847, newSubs: 847 },
];

const emailPerformanceData = [
  { date: "Week 1", opens: 4200, clicks: 890 },
  { date: "Week 2", opens: 3800, clicks: 720 },
  { date: "Week 3", opens: 4500, clicks: 950 },
  { date: "Week 4", opens: 5100, clicks: 1100 },
];

const topSources = [
  { source: "Newsletter Form", subscribers: 3421, percent: 26.6, color: "#5CC5DE" },
  { source: "Creator Network", subscribers: 2891, percent: 22.5, color: "#7BC47F" },
  { source: "Landing Page", subscribers: 2341, percent: 18.2, color: "#E8B86D" },
  { source: "Blog Sidebar", subscribers: 1892, percent: 14.7, color: "#E88B8B" },
  { source: "Exit Popup", subscribers: 1456, percent: 11.3, color: "#9B8BDE" },
  { source: "Other", subscribers: 846, percent: 6.7, color: "#94A3B8" },
];

const pieData = topSources.map((s) => ({
  name: s.source,
  value: s.subscribers,
  color: s.color,
}));

const topPerformingEmails = [
  {
    subject: "Exclusive offer for subscribers",
    openRate: "52.1%",
    clickRate: "12.3%",
    sentAt: "Jan 28, 2026",
  },
  {
    subject: "Welcome to our newsletter!",
    openRate: "48.7%",
    clickRate: "9.8%",
    sentAt: "Feb 7, 2026",
  },
  {
    subject: "Your weekly digest #42",
    openRate: "45.2%",
    clickRate: "7.4%",
    sentAt: "Feb 3, 2026",
  },
  {
    subject: "New product announcement",
    openRate: "43.9%",
    clickRate: "8.1%",
    sentAt: "Feb 5, 2026",
  },
  {
    subject: "Behind the scenes",
    openRate: "41.2%",
    clickRate: "6.2%",
    sentAt: "Jan 31, 2026",
  },
];

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Analytics"
        subtitle="Track your email marketing performance"
      />

      <main className="p-6 space-y-6">
        {/* Time range selector */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Overview</h2>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <Calendar className="w-4 h-4" />
            Last 30 days
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {overviewStats.map((stat) => (
            <Card key={stat.name} className="bg-white dark:bg-gray-800">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <stat.icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
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
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.name}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Subscriber growth chart */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-gray-100">
                Subscriber Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={subscriberGrowthData}>
                    <defs>
                      <linearGradient id="subscriberGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5CC5DE" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#5CC5DE" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="subscribers"
                      stroke="#5CC5DE"
                      strokeWidth={2}
                      fill="url(#subscriberGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-sm font-medium">+56% growth</span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">vs last 6 months</span>
              </div>
            </CardContent>
          </Card>

          {/* Email performance chart */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-gray-100">
                Email Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={emailPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Bar dataKey="opens" fill="#5CC5DE" radius={[4, 4, 0, 0]} name="Opens" />
                    <Bar dataKey="clicks" fill="#7BC47F" radius={[4, 4, 0, 0]} name="Clicks" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Subscriber sources pie chart */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-gray-100">
                Subscriber Sources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72 flex items-center">
                <div className="w-1/2">
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => value?.toLocaleString() ?? ""}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #e5e7eb",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-1/2 space-y-2">
                  {topSources.slice(0, 5).map((source) => (
                    <div key={source.source} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: source.color }}
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">
                        {source.source}
                      </span>
                      <span className="text-sm font-medium dark:text-gray-200">
                        {source.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New subscribers chart */}
          <Card className="bg-white dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg font-semibold dark:text-gray-100">
                New Subscribers Per Month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={subscriberGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: "8px",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="newSubs"
                      stroke="#7BC47F"
                      strokeWidth={2}
                      dot={{ fill: "#7BC47F", strokeWidth: 2 }}
                      name="New Subscribers"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top performing emails */}
        <Card className="bg-white dark:bg-gray-800">
          <CardHeader>
            <CardTitle className="text-lg font-semibold dark:text-gray-100">
              Top Performing Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Subject
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Open Rate
                    </th>
                    <th className="text-center py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Click Rate
                    </th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                      Sent
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topPerformingEmails.map((email, index) => (
                    <tr
                      key={email.subject}
                      className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 rounded-full bg-[#5CC5DE]/20 text-[#5CC5DE] flex items-center justify-center text-xs font-medium">
                            {index + 1}
                          </span>
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {email.subject}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-green-600 font-medium">
                          <TrendingUp className="w-4 h-4" />
                          {email.openRate}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center font-medium text-gray-900 dark:text-gray-100">
                        {email.clickRate}
                      </td>
                      <td className="py-4 px-4 text-right text-gray-500 dark:text-gray-400">
                        {email.sentAt}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
