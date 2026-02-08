// Automations page

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit,
  Users,
  Mail,
  Zap,
} from "lucide-react";

const automations = [
  {
    id: 1,
    name: "Welcome Sequence",
    description: "4-email welcome series for new subscribers",
    status: "active",
    subscribers: 2341,
    emailsSent: 8923,
    trigger: "Subscription",
    steps: 4,
  },
  {
    id: 2,
    name: "Product Launch Funnel",
    description: "Pre-launch, launch day, and follow-up sequence",
    status: "active",
    subscribers: 1256,
    emailsSent: 4521,
    trigger: "Tag Added",
    steps: 6,
  },
  {
    id: 3,
    name: "Re-engagement Campaign",
    description: "Win back inactive subscribers",
    status: "paused",
    subscribers: 456,
    emailsSent: 1234,
    trigger: "Inactivity",
    steps: 3,
  },
  {
    id: 4,
    name: "Course Delivery",
    description: "Drip content for online course",
    status: "active",
    subscribers: 892,
    emailsSent: 5671,
    trigger: "Purchase",
    steps: 8,
  },
  {
    id: 5,
    name: "Birthday Celebration",
    description: "Send birthday wishes with special offer",
    status: "active",
    subscribers: 12847,
    emailsSent: 3421,
    trigger: "Date",
    steps: 1,
  },
];

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  draft: "bg-gray-100 text-gray-700",
};

export default function AutomationsPage() {
  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Automations"
        subtitle="Build automated email sequences that run 24/7"
      />

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Play className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">4</p>
                  <p className="text-sm text-gray-500">Active Automations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">17,792</p>
                  <p className="text-sm text-gray-500">Active Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Mail className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">23,770</p>
                  <p className="text-sm text-gray-500">Emails Sent (30d)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Your Automations</h2>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Automation
          </button>
        </div>

        {/* Automations grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {automations.map((automation) => (
            <Card
              key={automation.id}
              className="bg-white hover:shadow-md transition-shadow"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-[#5CC5DE]/10 rounded-lg">
                    <Zap className="w-5 h-5 text-[#5CC5DE]" />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-1 hover:bg-gray-100 rounded transition-colors"
                      >
                        <MoreHorizontal className="w-5 h-5 text-gray-400" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {automation.status === "active" ? (
                        <DropdownMenuItem>
                          <Pause className="w-4 h-4 mr-2" />
                          Pause
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem>
                          <Play className="w-4 h-4 mr-2" />
                          Activate
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

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">
                      {automation.name}
                    </h3>
                    <Badge
                      variant="secondary"
                      className={statusColors[automation.status]}
                    >
                      {automation.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">{automation.description}</p>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                  <span className="flex items-center gap-1">
                    <span className="font-medium text-gray-900">
                      {automation.steps}
                    </span>{" "}
                    steps
                  </span>
                  <span>|</span>
                  <span>Trigger: {automation.trigger}</span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">
                      {automation.subscribers.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Subscribers</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900">
                      {automation.emailsSent.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">Emails Sent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Create new card */}
          <Card className="bg-gray-50 border-dashed border-2 hover:bg-gray-100 transition-colors cursor-pointer">
            <CardContent className="p-6 h-full flex flex-col items-center justify-center text-center min-h-[280px]">
              <div className="p-3 bg-white rounded-full shadow-sm mb-4">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                Create Automation
              </h3>
              <p className="text-sm text-gray-500">
                Build your next email sequence
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
