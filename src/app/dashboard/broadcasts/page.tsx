// Broadcasts page

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Send,
  Copy,
  Trash2,
  Eye,
  Edit,
  Clock,
  CheckCircle2,
  FileText,
} from "lucide-react";

const broadcasts = [
  {
    id: 1,
    subject: "Welcome to our newsletter!",
    status: "sent",
    sentAt: "Feb 7, 2026 at 10:00 AM",
    recipients: 12847,
    opens: 5423,
    clicks: 892,
    openRate: "42.2%",
    clickRate: "6.9%",
  },
  {
    id: 2,
    subject: "New product announcement - You won't believe this!",
    status: "sent",
    sentAt: "Feb 5, 2026 at 2:00 PM",
    recipients: 12654,
    opens: 4891,
    clicks: 756,
    openRate: "38.7%",
    clickRate: "6.0%",
  },
  {
    id: 3,
    subject: "Weekly digest #42 - Top stories this week",
    status: "sent",
    sentAt: "Feb 3, 2026 at 9:00 AM",
    recipients: 12501,
    opens: 5102,
    clicks: 623,
    openRate: "40.8%",
    clickRate: "5.0%",
  },
  {
    id: 4,
    subject: "Exclusive offer for subscribers",
    status: "scheduled",
    scheduledFor: "Feb 10, 2026 at 10:00 AM",
    recipients: 12847,
  },
  {
    id: 5,
    subject: "Behind the scenes - How we built our new feature",
    status: "draft",
    lastEdited: "Feb 6, 2026",
  },
  {
    id: 6,
    subject: "Monthly roundup - January 2026",
    status: "draft",
    lastEdited: "Feb 1, 2026",
  },
];

const statusIcons: Record<string, React.ReactNode> = {
  sent: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  scheduled: <Clock className="w-4 h-4 text-amber-500" />,
  draft: <FileText className="w-4 h-4 text-gray-400" />,
};

const statusColors: Record<string, string> = {
  sent: "bg-green-100 text-green-700",
  scheduled: "bg-amber-100 text-amber-700",
  draft: "bg-gray-100 text-gray-700",
};

export default function BroadcastsPage() {
  const [activeTab, setActiveTab] = useState("all");

  const filteredBroadcasts = broadcasts.filter((broadcast) => {
    if (activeTab === "all") return true;
    return broadcast.status === activeTab;
  });

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Broadcasts"
        subtitle="Create and manage your email campaigns"
      />

      <main className="p-6 space-y-6">
        {/* Action bar */}
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="scheduled">Scheduled</TabsTrigger>
              <TabsTrigger value="draft">Drafts</TabsTrigger>
            </TabsList>
          </Tabs>
          <a
            href="/dashboard/broadcasts/new"
            className="flex items-center gap-2 px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Broadcast
          </a>
        </div>

        {/* Broadcasts list */}
        <div className="space-y-4">
          {filteredBroadcasts.map((broadcast) => (
            <Card key={broadcast.id} className="bg-white hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">{statusIcons[broadcast.status]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {broadcast.subject}
                        </h3>
                        <Badge
                          variant="secondary"
                          className={statusColors[broadcast.status]}
                        >
                          {broadcast.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {broadcast.status === "sent" && `Sent ${broadcast.sentAt}`}
                        {broadcast.status === "scheduled" &&
                          `Scheduled for ${broadcast.scheduledFor}`}
                        {broadcast.status === "draft" &&
                          `Last edited ${broadcast.lastEdited}`}
                      </p>
                    </div>
                  </div>

                  {/* Stats for sent emails */}
                  {broadcast.status === "sent" && (
                    <div className="hidden md:flex items-center gap-8 text-sm">
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">
                          {broadcast.recipients?.toLocaleString()}
                        </p>
                        <p className="text-gray-500">Sent</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">
                          {broadcast.openRate}
                        </p>
                        <p className="text-gray-500">Open Rate</p>
                      </div>
                      <div className="text-center">
                        <p className="font-semibold text-gray-900">
                          {broadcast.clickRate}
                        </p>
                        <p className="text-gray-500">Click Rate</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5 text-gray-500" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {broadcast.status === "draft" && (
                        <>
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Send className="w-4 h-4 mr-2" />
                            Send Now
                          </DropdownMenuItem>
                        </>
                      )}
                      {broadcast.status === "sent" && (
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          View Report
                        </DropdownMenuItem>
                      )}
                      {broadcast.status === "scheduled" && (
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <Copy className="w-4 h-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredBroadcasts.length === 0 && (
          <Card className="bg-white">
            <CardContent className="p-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">No broadcasts found</h3>
              <p className="text-gray-500 mb-4">
                Get started by creating your first broadcast.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Broadcast
              </button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
