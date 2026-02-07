"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImportExportModal } from "@/components/dashboard/ImportExportModal";
import {
  Search,
  Filter,
  Download,
  Upload,
  Plus,
  MoreHorizontal,
  Mail,
  Tag,
  Trash2,
  UserPlus,
} from "lucide-react";

const subscribers = [
  {
    id: 1,
    email: "alice.johnson@example.com",
    name: "Alice Johnson",
    status: "active",
    tags: ["Newsletter", "Premium"],
    subscribedAt: "Jan 15, 2026",
    openRate: "68%",
  },
  {
    id: 2,
    email: "bob.smith@example.com",
    name: "Bob Smith",
    status: "active",
    tags: ["Newsletter"],
    subscribedAt: "Jan 12, 2026",
    openRate: "45%",
  },
  {
    id: 3,
    email: "carol.williams@example.com",
    name: "Carol Williams",
    status: "active",
    tags: ["Premium", "Course"],
    subscribedAt: "Jan 10, 2026",
    openRate: "82%",
  },
  {
    id: 4,
    email: "david.brown@example.com",
    name: "David Brown",
    status: "inactive",
    tags: ["Newsletter"],
    subscribedAt: "Dec 28, 2025",
    openRate: "12%",
  },
  {
    id: 5,
    email: "emma.davis@example.com",
    name: "Emma Davis",
    status: "active",
    tags: ["Newsletter", "Webinar"],
    subscribedAt: "Dec 22, 2025",
    openRate: "91%",
  },
  {
    id: 6,
    email: "frank.miller@example.com",
    name: "Frank Miller",
    status: "active",
    tags: ["Premium"],
    subscribedAt: "Dec 15, 2025",
    openRate: "55%",
  },
  {
    id: 7,
    email: "grace.wilson@example.com",
    name: "Grace Wilson",
    status: "bounced",
    tags: ["Newsletter"],
    subscribedAt: "Dec 10, 2025",
    openRate: "0%",
  },
  {
    id: 8,
    email: "henry.taylor@example.com",
    name: "Henry Taylor",
    status: "active",
    tags: ["Newsletter", "Premium", "Course"],
    subscribedAt: "Dec 5, 2025",
    openRate: "73%",
  },
];

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  inactive: "bg-gray-100 text-gray-700",
  bounced: "bg-red-100 text-red-700",
};

export default function SubscribersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<"import" | "export">("import");

  const openImportModal = () => {
    setImportExportMode("import");
    setImportExportOpen(true);
  };

  const openExportModal = () => {
    setImportExportMode("export");
    setImportExportOpen(true);
  };

  const filteredSubscribers = subscribers.filter(
    (sub) =>
      sub.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Subscribers"
        subtitle="Manage your email list and subscriber segments"
      />

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">12,847</p>
              <p className="text-sm text-gray-500">Total Subscribers</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-green-600">11,923</p>
              <p className="text-sm text-gray-500">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-600">812</p>
              <p className="text-sm text-gray-500">Inactive</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-red-600">112</p>
              <p className="text-sm text-gray-500">Bounced</p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search subscribers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">Filter</span>
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openImportModal}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              type="button"
              onClick={openExportModal}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Subscriber
            </button>
          </div>
        </div>

        {/* Subscribers table */}
        <Card className="bg-white">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <input type="checkbox" className="rounded border-gray-300" />
                  </TableHead>
                  <TableHead>Subscriber</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Subscribed</TableHead>
                  <TableHead>Open Rate</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscribers.map((subscriber) => (
                  <TableRow key={subscriber.id} className="hover:bg-gray-50">
                    <TableCell>
                      <input type="checkbox" className="rounded border-gray-300" />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#5CC5DE]/20 flex items-center justify-center text-[#5CC5DE] font-medium text-sm">
                          {subscriber.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {subscriber.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {subscriber.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[subscriber.status]}
                      >
                        {subscriber.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {subscriber.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-500">
                      {subscriber.subscribedAt}
                    </TableCell>
                    <TableCell className="font-medium">
                      {subscriber.openRate}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="p-1 hover:bg-gray-100 rounded"
                          >
                            <MoreHorizontal className="w-4 h-4 text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Tag className="w-4 h-4 mr-2" />
                            Add Tag
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <UserPlus className="w-4 h-4 mr-2" />
                            Add to Sequence
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Import/Export Modal */}
        <ImportExportModal
          isOpen={importExportOpen}
          onClose={() => setImportExportOpen(false)}
          mode={importExportMode}
        />
      </main>
    </div>
  );
}
