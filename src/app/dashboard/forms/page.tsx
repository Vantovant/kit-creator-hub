"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  MoreHorizontal,
  Copy,
  Trash2,
  Edit,
  ExternalLink,
  FormInput,
  Layout,
  Eye,
} from "lucide-react";
import { useState } from "react";

const forms = [
  {
    id: 1,
    name: "Newsletter Signup",
    type: "inline",
    status: "active",
    subscribers: 3421,
    conversionRate: "12.4%",
    views: 27589,
    createdAt: "Jan 5, 2026",
  },
  {
    id: 2,
    name: "Free Ebook Download",
    type: "modal",
    status: "active",
    subscribers: 1892,
    conversionRate: "8.7%",
    views: 21747,
    createdAt: "Dec 20, 2025",
  },
  {
    id: 3,
    name: "Webinar Registration",
    type: "landing",
    status: "active",
    subscribers: 567,
    conversionRate: "24.1%",
    views: 2352,
    createdAt: "Feb 1, 2026",
  },
  {
    id: 4,
    name: "Blog Sidebar Form",
    type: "inline",
    status: "active",
    subscribers: 892,
    conversionRate: "4.2%",
    views: 21238,
    createdAt: "Nov 15, 2025",
  },
  {
    id: 5,
    name: "Exit Intent Popup",
    type: "modal",
    status: "paused",
    subscribers: 234,
    conversionRate: "3.1%",
    views: 7548,
    createdAt: "Oct 28, 2025",
  },
];

const landingPages = [
  {
    id: 1,
    name: "Creator Newsletter",
    url: "newsletter.example.com",
    status: "published",
    subscribers: 4521,
    conversionRate: "32.5%",
    views: 13910,
  },
  {
    id: 2,
    name: "Free Course Signup",
    url: "course.example.com",
    status: "published",
    subscribers: 2341,
    conversionRate: "28.9%",
    views: 8100,
  },
  {
    id: 3,
    name: "Product Waitlist",
    url: "waitlist.example.com",
    status: "draft",
    subscribers: 0,
    conversionRate: "0%",
    views: 0,
  },
];

const typeIcons: Record<string, React.ReactNode> = {
  inline: <FormInput className="w-4 h-4" />,
  modal: <Layout className="w-4 h-4" />,
  landing: <ExternalLink className="w-4 h-4" />,
};

const statusColors: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  published: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  draft: "bg-gray-100 text-gray-700",
};

export default function FormsPage() {
  const [activeTab, setActiveTab] = useState("forms");

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Forms & Landing Pages"
        subtitle="Capture subscribers with beautiful opt-in forms"
      />

      <main className="p-6 space-y-6">
        {/* Tabs */}
        <div className="flex items-center justify-between">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="forms">Forms</TabsTrigger>
              <TabsTrigger value="landing">Landing Pages</TabsTrigger>
            </TabsList>
          </Tabs>
          <button
            type="button"
            className="flex items-center gap-2 px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            {activeTab === "forms" ? "New Form" : "New Landing Page"}
          </button>
        </div>

        {/* Forms list */}
        {activeTab === "forms" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <Card
                key={form.id}
                className="bg-white hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        {typeIcons[form.type]}
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {form.type}
                      </Badge>
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
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
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

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{form.name}</h3>
                      <Badge
                        variant="secondary"
                        className={statusColors[form.status]}
                      >
                        {form.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      Created {form.createdAt}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">
                        {form.subscribers.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Subscribers</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">
                        {form.views.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Views</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-green-600">
                        {form.conversionRate}
                      </p>
                      <p className="text-xs text-gray-500">Conv. Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Landing pages list */}
        {activeTab === "landing" && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {landingPages.map((page) => (
              <Card
                key={page.id}
                className="bg-white hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  {/* Preview placeholder */}
                  <div className="h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg mb-4 flex items-center justify-center">
                    <Layout className="w-8 h-8 text-gray-400" />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{page.name}</h3>
                      <Badge
                        variant="secondary"
                        className={statusColors[page.status]}
                      >
                        {page.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-[#5CC5DE] truncate">{page.url}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">
                        {page.subscribers.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Subscribers</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-gray-900">
                        {page.views.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">Views</p>
                    </div>
                    <div className="text-center">
                      <p className="font-semibold text-green-600">
                        {page.conversionRate}
                      </p>
                      <p className="text-xs text-gray-500">Conv. Rate</p>
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
                  Create Landing Page
                </h3>
                <p className="text-sm text-gray-500">
                  Build a high-converting page
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
