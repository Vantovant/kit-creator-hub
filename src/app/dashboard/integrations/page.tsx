"use client";

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  ExternalLink,
  Check,
  Settings,
  RefreshCw,
  Unplug,
  Plus,
  Zap,
  ShoppingCart,
  CreditCard,
  Calendar,
  MessageSquare,
  BarChart3,
  BookOpen,
  Palette,
  Video,
  Headphones,
  Globe,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  category: string;
  isConnected: boolean;
  isPremium?: boolean;
}

const integrations: Integration[] = [
  {
    id: "shopify",
    name: "Shopify",
    description: "Sync customers and trigger automations from orders",
    icon: ShoppingCart,
    color: "#95BF47",
    category: "ecommerce",
    isConnected: true,
  },
  {
    id: "stripe",
    name: "Stripe",
    description: "Connect payments and subscription data",
    icon: CreditCard,
    color: "#635BFF",
    category: "payments",
    isConnected: true,
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Connect to 5,000+ apps with automated workflows",
    icon: Zap,
    color: "#FF4A00",
    category: "automation",
    isConnected: false,
  },
  {
    id: "calendly",
    name: "Calendly",
    description: "Sync meeting bookings and send reminders",
    icon: Calendar,
    color: "#006BFF",
    category: "scheduling",
    isConnected: false,
  },
  {
    id: "slack",
    name: "Slack",
    description: "Get notifications for new subscribers and sales",
    icon: MessageSquare,
    color: "#4A154B",
    category: "communication",
    isConnected: true,
  },
  {
    id: "google-analytics",
    name: "Google Analytics",
    description: "Track email campaign performance and conversions",
    icon: BarChart3,
    color: "#E37400",
    category: "analytics",
    isConnected: false,
  },
  {
    id: "teachable",
    name: "Teachable",
    description: "Sync course students and enrollment data",
    icon: BookOpen,
    color: "#FF5F26",
    category: "courses",
    isConnected: false,
  },
  {
    id: "canva",
    name: "Canva",
    description: "Access your Canva designs in the email editor",
    icon: Palette,
    color: "#00C4CC",
    category: "design",
    isConnected: true,
  },
  {
    id: "zoom",
    name: "Zoom",
    description: "Create webinar registrations and send links",
    icon: Video,
    color: "#2D8CFF",
    category: "video",
    isConnected: false,
  },
  {
    id: "transistor",
    name: "Transistor.fm",
    description: "Embed podcast players in your emails",
    icon: Headphones,
    color: "#8B5CF6",
    category: "podcasts",
    isConnected: false,
  },
  {
    id: "wordpress",
    name: "WordPress",
    description: "Embed signup forms and sync subscribers",
    icon: Globe,
    color: "#21759B",
    category: "cms",
    isConnected: true,
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    description: "Sync customers from your WordPress store",
    icon: ShoppingCart,
    color: "#96588A",
    category: "ecommerce",
    isConnected: false,
  },
];

const categories = [
  { id: "all", label: "All Integrations" },
  { id: "ecommerce", label: "E-commerce" },
  { id: "payments", label: "Payments" },
  { id: "automation", label: "Automation" },
  { id: "analytics", label: "Analytics" },
  { id: "communication", label: "Communication" },
  { id: "courses", label: "Courses" },
];

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showConnected, setShowConnected] = useState(false);

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || integration.category === activeCategory;
    const matchesConnected = !showConnected || integration.isConnected;
    return matchesSearch && matchesCategory && matchesConnected;
  });

  const connectedCount = integrations.filter((i) => i.isConnected).length;

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Integrations"
        subtitle="Connect your favorite tools and services"
      />

      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {connectedCount}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Connected</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {integrations.length}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Available</p>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-gray-800">
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-green-600">Active</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sync Status</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 dark:text-gray-400">Show connected only</span>
              <Switch checked={showConnected} onCheckedChange={setShowConnected} />
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === category.id
                    ? "bg-[#5CC5DE] text-black"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Connected integrations */}
          {!showConnected && connectedCount > 0 && (
            <div className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Connected ({connectedCount})
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {integrations
                  .filter((i) => i.isConnected)
                  .map((integration) => (
                    <Card
                      key={integration.id}
                      className="bg-white dark:bg-gray-800 border-green-200 dark:border-green-800"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center"
                              style={{ backgroundColor: `${integration.color}20` }}
                            >
                              <integration.icon
                                className="w-5 h-5"
                                style={{ color: integration.color }}
                              />
                            </div>
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                {integration.name}
                              </h3>
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                <Check className="w-3 h-3 mr-1" />
                                Connected
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Settings className="w-4 h-4" />
                            Settings
                          </button>
                          <button
                            type="button"
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Unplug className="w-4 h-4" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}

          {/* Available integrations */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              {showConnected ? "Connected Integrations" : "Available Integrations"}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIntegrations
                .filter((i) => showConnected || !i.isConnected)
                .map((integration) => (
                  <Card
                    key={integration.id}
                    className="bg-white dark:bg-gray-800 hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4 mb-4">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${integration.color}20` }}
                        >
                          <integration.icon
                            className="w-6 h-6"
                            style={{ color: integration.color }}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                              {integration.name}
                            </h3>
                            {integration.isPremium && (
                              <Badge className="bg-amber-100 text-amber-700 text-xs">
                                Premium
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {integration.description}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                          integration.isConnected
                            ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                            : "bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black"
                        }`}
                      >
                        {integration.isConnected ? (
                          <>
                            <Check className="w-4 h-4" />
                            Connected
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Connect
                          </>
                        )}
                      </button>
                    </CardContent>
                  </Card>
                ))}
            </div>
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No integrations found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}

          {/* Request integration */}
          <Card className="bg-gradient-to-r from-[#5CC5DE]/10 to-[#7BC47F]/10 border-dashed mt-8">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Don't see the integration you need?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Let us know and we'll consider adding it to our platform.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Request Integration
              </button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
