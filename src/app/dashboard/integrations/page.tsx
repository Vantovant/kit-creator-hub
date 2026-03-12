import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Copy,
  CheckCircle,
} from "lucide-react";

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
  category: string;
  isConnected: boolean;
  isPremium?: boolean;
}

const integrations: Integration[] = [
  { id: "shopify", name: "Shopify", description: "Sync customers and trigger automations from orders", icon: ShoppingCart, color: "#95BF47", category: "ecommerce", isConnected: false },
  { id: "stripe", name: "Stripe", description: "Connect payments and subscription data", icon: CreditCard, color: "#635BFF", category: "payments", isConnected: false },
  { id: "zapier", name: "Zapier", description: "Connect to 5,000+ apps with automated workflows", icon: Zap, color: "#FF4A00", category: "automation", isConnected: false },
  { id: "calendly", name: "Calendly", description: "Sync meeting bookings and send reminders", icon: Calendar, color: "#006BFF", category: "scheduling", isConnected: false },
  { id: "slack", name: "Slack", description: "Get notifications for new subscribers and sales", icon: MessageSquare, color: "#4A154B", category: "communication", isConnected: false },
  { id: "google-analytics", name: "Google Analytics", description: "Track email campaign performance and conversions", icon: BarChart3, color: "#E37400", category: "analytics", isConnected: false },
  { id: "teachable", name: "Teachable", description: "Sync course students and enrollment data", icon: BookOpen, color: "#FF5F26", category: "courses", isConnected: false },
  { id: "canva", name: "Canva", description: "Access your Canva designs in the email editor", icon: Palette, color: "#00C4CC", category: "design", isConnected: false },
  { id: "zoom", name: "Zoom", description: "Create webinar registrations and send links", icon: Video, color: "#2D8CFF", category: "video", isConnected: false },
  { id: "transistor", name: "Transistor.fm", description: "Embed podcast players in your emails", icon: Headphones, color: "#8B5CF6", category: "podcasts", isConnected: false },
  { id: "wordpress", name: "WordPress", description: "Embed signup forms and sync subscribers", icon: Globe, color: "#21759B", category: "cms", isConnected: false },
  { id: "woocommerce", name: "WooCommerce", description: "Sync customers from your WordPress store", icon: ShoppingCart, color: "#96588A", category: "ecommerce", isConnected: false },
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

const WEBHOOK_BASE = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID || "wwuenmmocxtwwgylngui"}.supabase.co/functions/v1`;

export default function IntegrationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [showConnected, setShowConnected] = useState(false);
  const [zapierModalOpen, setZapierModalOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const filteredIntegrations = integrations.filter((integration) => {
    const matchesSearch = integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      integration.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || integration.category === activeCategory;
    const matchesConnected = !showConnected || integration.isConnected;
    return matchesSearch && matchesCategory && matchesConnected;
  });

  const connectedCount = integrations.filter((i) => i.isConnected).length;

  const webhookUrl = `${WEBHOOK_BASE}/integration-webhook`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleConnect = (integrationId: string) => {
    if (integrationId === "zapier") {
      setZapierModalOpen(true);
    }
  };

  const logActivityPayload = JSON.stringify({
    action: "log_activity",
    email: "prospect@example.com",
    activity_type: "call",
    notes: "Called about product demo",
    outcome: "interested",
  }, null, 2);

  const getActivitiesPayload = JSON.stringify({
    action: "get_activities",
    email: "prospect@example.com",
    limit: 20,
  }, null, 2);

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
            <Card>
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-foreground">{connectedCount}</p>
                <p className="text-sm text-muted-foreground">Connected</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-foreground">{integrations.length}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-2xl font-bold text-green-600">Active</p>
                <p className="text-sm text-muted-foreground">Sync Status</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Show connected only</span>
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
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {category.label}
              </button>
            ))}
          </div>

          {/* Integrations Grid */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {showConnected ? "Connected Integrations" : "Available Integrations"}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredIntegrations.map((integration) => (
                <Card key={integration.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${integration.color}20` }}
                      >
                        <integration.icon className="w-6 h-6" style={{ color: integration.color }} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground">{integration.name}</h3>
                          {integration.isPremium && (
                            <Badge className="bg-amber-100 text-amber-700 text-xs">Premium</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{integration.description}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleConnect(integration.id)}
                      className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        integration.isConnected
                          ? "bg-muted text-muted-foreground"
                          : integration.id === "zapier"
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
                      }`}
                      disabled={integration.id !== "zapier" && !integration.isConnected}
                    >
                      {integration.isConnected ? (
                        <><Check className="w-4 h-4" /> Connected</>
                      ) : integration.id === "zapier" ? (
                        <><Zap className="w-4 h-4" /> Connect</>
                      ) : (
                        <><Plus className="w-4 h-4" /> Coming Soon</>
                      )}
                    </button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {filteredIntegrations.length === 0 && (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No integrations found</h3>
              <p className="text-muted-foreground">Try adjusting your search or filter criteria</p>
            </div>
          )}

          {/* Request integration */}
          <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-dashed mt-8">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold text-foreground mb-2">Don't see the integration you need?</h3>
              <p className="text-muted-foreground mb-4">Let us know and we'll consider adding it to our platform.</p>
              <button
                type="button"
                className="inline-flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-muted transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Request Integration
              </button>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Zapier Connect Modal */}
      <Dialog open={zapierModalOpen} onOpenChange={setZapierModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" style={{ color: "#FF4A00" }} />
              Connect Zapier
            </DialogTitle>
            <DialogDescription>
              Use these webhook URLs in your Zapier Zaps to read and write CRM activities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 mt-2">
            {/* Webhook URL */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Webhook URL</label>
              <div className="flex items-center gap-2">
                <Input value={webhookUrl} readOnly className="font-mono text-xs" />
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookUrl, "url")}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                >
                  {copiedUrl === "url" ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
                </button>
              </div>
            </div>

            {/* Required Header */}
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Required Header</label>
              <p className="text-xs text-muted-foreground mb-1">Add this header to your Zapier webhook action:</p>
              <code className="block p-2 bg-muted rounded text-xs font-mono">
                x-webhook-secret: [your WEBHOOK_REPLY_SECRET value]
              </code>
            </div>

            {/* Log Activity Example */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Log Activity Payload</label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(logActivityPayload, "log")}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {copiedUrl === "log" ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <pre className="p-3 bg-muted rounded text-xs font-mono overflow-x-auto">{logActivityPayload}</pre>
            </div>

            {/* Get Activities Example */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-foreground">Get Activities Payload</label>
                <button
                  type="button"
                  onClick={() => copyToClipboard(getActivitiesPayload, "get")}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  {copiedUrl === "get" ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Copy
                </button>
              </div>
              <pre className="p-3 bg-muted rounded text-xs font-mono overflow-x-auto">{getActivitiesPayload}</pre>
            </div>

            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <strong>Setup:</strong> In Zapier, create a new Zap → choose "Webhooks by Zapier" as the action → select "POST" → paste the webhook URL and add the header. Use the payload examples above as the body.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
