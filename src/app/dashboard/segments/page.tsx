"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Tag,
  Users,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  ChevronRight,
  Search,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const tags = [
  { id: 1, name: "Newsletter", color: "#5CC5DE", subscribers: 8934 },
  { id: 2, name: "Premium", color: "#E8B86D", subscribers: 2341 },
  { id: 3, name: "Course", color: "#7BC47F", subscribers: 1567 },
  { id: 4, name: "Webinar", color: "#9B8BDE", subscribers: 892 },
  { id: 5, name: "Free Trial", color: "#E88B8B", subscribers: 456 },
  { id: 6, name: "VIP", color: "#F59E0B", subscribers: 234 },
  { id: 7, name: "Inactive", color: "#94A3B8", subscribers: 1123 },
  { id: 8, name: "New", color: "#22C55E", subscribers: 567 },
];

const segments = [
  {
    id: 1,
    name: "Engaged Subscribers",
    description: "Opened at least 3 emails in the last 30 days",
    subscribers: 5672,
    conditions: [
      { field: "Opens", operator: "greater than", value: "3" },
      { field: "Last 30 days", operator: "is", value: "true" },
    ],
    isActive: true,
  },
  {
    id: 2,
    name: "Premium Members",
    description: "Subscribers with Premium tag who made a purchase",
    subscribers: 1892,
    conditions: [
      { field: "Tag", operator: "contains", value: "Premium" },
      { field: "Purchase", operator: "is", value: "true" },
    ],
    isActive: true,
  },
  {
    id: 3,
    name: "At-Risk Subscribers",
    description: "Haven't opened emails in 60+ days",
    subscribers: 2341,
    conditions: [
      { field: "Last Open", operator: "older than", value: "60 days" },
    ],
    isActive: true,
  },
  {
    id: 4,
    name: "Course Completers",
    description: "Finished the main course and eligible for upsell",
    subscribers: 876,
    conditions: [
      { field: "Tag", operator: "contains", value: "Course" },
      { field: "Progress", operator: "equals", value: "100%" },
    ],
    isActive: false,
  },
  {
    id: 5,
    name: "High-Value Leads",
    description: "Clicked 5+ times and visited pricing page",
    subscribers: 432,
    conditions: [
      { field: "Clicks", operator: "greater than", value: "5" },
      { field: "Page Visit", operator: "contains", value: "/pricing" },
    ],
    isActive: true,
  },
];

const conditionFields = [
  "Tag", "Email Opens", "Email Clicks", "Subscription Date",
  "Last Activity", "Purchase History", "Location", "Custom Field"
];

const conditionOperators = [
  "equals", "not equals", "contains", "greater than", "less than",
  "is before", "is after", "is empty", "is not empty"
];

export default function SegmentsPage() {
  const [activeTab, setActiveTab] = useState("segments");
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewSegment, setShowNewSegment] = useState(false);
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#5CC5DE");

  const tagColors = [
    "#5CC5DE", "#E8B86D", "#7BC47F", "#9B8BDE", "#E88B8B",
    "#F59E0B", "#EC4899", "#8B5CF6", "#06B6D4", "#84CC16"
  ];

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Segments & Tags"
        subtitle="Organize and target your subscribers effectively"
      />

      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="segments" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Segments
                </TabsTrigger>
                <TabsTrigger value="tags" className="gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </TabsTrigger>
              </TabsList>

              <button
                type="button"
                onClick={() => activeTab === "segments" ? setShowNewSegment(true) : setShowNewTag(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {activeTab === "segments" ? "New Segment" : "New Tag"}
              </button>
            </div>

            {/* Segments Tab */}
            <TabsContent value="segments" className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card className="bg-white dark:bg-gray-800">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{segments.length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Segments</p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-green-600">{segments.filter(s => s.isActive).length}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Segments</p>
                  </CardContent>
                </Card>
                <Card className="bg-white dark:bg-gray-800">
                  <CardContent className="p-4">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {segments.reduce((acc, s) => acc + s.subscribers, 0).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Subscribers in Segments</p>
                  </CardContent>
                </Card>
              </div>

              {/* Segments list */}
              <div className="space-y-4">
                {segments.map((segment) => (
                  <Card key={segment.id} className="bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {segment.name}
                            </h3>
                            <Badge
                              variant="secondary"
                              className={segment.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}
                            >
                              {segment.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                            {segment.description}
                          </p>

                          {/* Conditions */}
                          <div className="flex flex-wrap gap-2">
                            {segment.conditions.map((condition, idx) => (
                              <div
                                key={`${segment.id}-condition-${idx}`}
                                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm"
                              >
                                <span className="font-medium text-gray-700 dark:text-gray-200">
                                  {condition.field}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {condition.operator}
                                </span>
                                <span className="text-[#5CC5DE] font-medium">
                                  {condition.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                              {segment.subscribers.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">subscribers</p>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                                <MoreHorizontal className="w-5 h-5 text-gray-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit Segment
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Users className="w-4 h-4 mr-2" />
                                View Subscribers
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Zap className="w-4 h-4 mr-2" />
                                Send Broadcast
                              </DropdownMenuItem>
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
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            {/* Tags Tab */}
            <TabsContent value="tags" className="space-y-6">
              {/* Search */}
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="search"
                  placeholder="Search tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 dark:bg-gray-800 dark:border-gray-700"
                />
              </div>

              {/* New tag form */}
              {showNewTag && (
                <Card className="bg-white dark:bg-gray-800 border-[#5CC5DE]">
                  <CardContent className="p-4">
                    <div className="flex items-end gap-4">
                      <div className="flex-1">
                        <Label className="dark:text-gray-200">Tag Name</Label>
                        <Input
                          value={newTagName}
                          onChange={(e) => setNewTagName(e.target.value)}
                          placeholder="Enter tag name..."
                          className="mt-1 dark:bg-gray-700 dark:border-gray-600"
                        />
                      </div>
                      <div>
                        <Label className="dark:text-gray-200">Color</Label>
                        <div className="flex gap-2 mt-1">
                          {tagColors.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => setNewTagColor(color)}
                              className={`w-8 h-8 rounded-full transition-transform ${
                                newTagColor === color ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""
                              }`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setShowNewTag(false)}
                          className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg"
                        >
                          Create Tag
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tags grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {tags
                  .filter((tag) => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((tag) => (
                    <Card key={tag.id} className="bg-white dark:bg-gray-800 hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: tag.color }}
                            />
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {tag.name}
                            </h3>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                                <MoreHorizontal className="w-4 h-4 text-gray-400" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Users className="w-4 h-4 mr-2" />
                                View Subscribers
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {tag.subscribers.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">subscribers</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
