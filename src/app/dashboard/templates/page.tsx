// Templates page

import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Plus,
  Star,
  Download,
  Eye,
  Copy,
  MoreHorizontal,
  Sparkles,
  Mail,
  Megaphone,
  Gift,
  BookOpen,
  ShoppingCart,
  Calendar,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const categories = [
  { id: "all", label: "All Templates", icon: Sparkles },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "announcement", label: "Announcement", icon: Megaphone },
  { id: "welcome", label: "Welcome", icon: Gift },
  { id: "educational", label: "Educational", icon: BookOpen },
  { id: "promotional", label: "Promotional", icon: ShoppingCart },
  { id: "event", label: "Event", icon: Calendar },
];

const templates = [
  {
    id: 1,
    name: "Minimal Newsletter",
    category: "newsletter",
    description: "Clean, simple newsletter layout with focus on content",
    preview: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    downloads: 2341,
    isNew: true,
    isPremium: false,
  },
  {
    id: 2,
    name: "Product Launch",
    category: "announcement",
    description: "Bold announcement template for new product releases",
    preview: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    downloads: 1892,
    isNew: false,
    isPremium: false,
  },
  {
    id: 3,
    name: "Welcome Series",
    category: "welcome",
    description: "Warm welcome email for new subscribers",
    preview: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    downloads: 3421,
    isNew: false,
    isPremium: false,
  },
  {
    id: 4,
    name: "Weekly Digest",
    category: "newsletter",
    description: "Organized layout for weekly content roundups",
    preview: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    downloads: 1567,
    isNew: true,
    isPremium: false,
  },
  {
    id: 5,
    name: "Flash Sale",
    category: "promotional",
    description: "High-impact promotional template with countdown",
    preview: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
    downloads: 2108,
    isNew: false,
    isPremium: true,
  },
  {
    id: 6,
    name: "Course Lesson",
    category: "educational",
    description: "Structured template for online course content",
    preview: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
    downloads: 987,
    isNew: false,
    isPremium: false,
  },
  {
    id: 7,
    name: "Event Invitation",
    category: "event",
    description: "Elegant invitation for webinars and events",
    preview: "linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)",
    downloads: 1234,
    isNew: false,
    isPremium: true,
  },
  {
    id: 8,
    name: "Personal Update",
    category: "newsletter",
    description: "Casual, personal letter-style template",
    preview: "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",
    downloads: 1876,
    isNew: false,
    isPremium: false,
  },
  {
    id: 9,
    name: "Black Friday",
    category: "promotional",
    description: "Dark theme promotional for sales events",
    preview: "linear-gradient(135deg, #434343 0%, #000000 100%)",
    downloads: 3210,
    isNew: false,
    isPremium: false,
  },
  {
    id: 10,
    name: "Thank You",
    category: "welcome",
    description: "Appreciation email for customers and subscribers",
    preview: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
    downloads: 1654,
    isNew: true,
    isPremium: false,
  },
  {
    id: 11,
    name: "Case Study",
    category: "educational",
    description: "Professional template for sharing success stories",
    preview: "linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)",
    downloads: 876,
    isNew: false,
    isPremium: true,
  },
  {
    id: 12,
    name: "Webinar Reminder",
    category: "event",
    description: "Reminder email with clear CTA for events",
    preview: "linear-gradient(135deg, #f6d365 0%, #fda085 100%)",
    downloads: 1432,
    isNew: false,
    isPremium: false,
  },
];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [previewTemplate, setPreviewTemplate] = useState<number | null>(null);

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch = template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || template.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Email Templates"
        subtitle="Choose from our library of professionally designed templates"
      />

      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Search and filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="search"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 dark:bg-gray-800 dark:border-gray-700"
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-2 px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>

          {/* Categories */}
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === category.id
                    ? "bg-[#5CC5DE] text-black"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                }`}
              >
                <category.icon className="w-4 h-4" />
                {category.label}
              </button>
            ))}
          </div>

          {/* Templates grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTemplates.map((template) => (
              <Card
                key={template.id}
                className="group bg-white dark:bg-gray-800 overflow-hidden hover:shadow-lg transition-all"
              >
                {/* Preview */}
                <div
                  className="h-48 relative"
                  style={{ background: template.preview }}
                >
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {template.isNew && (
                      <Badge className="bg-green-500 text-white">New</Badge>
                    )}
                    {template.isPremium && (
                      <Badge className="bg-amber-500 text-white">
                        <Star className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>

                  {/* Hover actions */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPreviewTemplate(template.id)}
                      className="p-3 bg-white rounded-full hover:scale-110 transition-transform"
                    >
                      <Eye className="w-5 h-5 text-gray-700" />
                    </button>
                    <button
                      type="button"
                      className="p-3 bg-[#5CC5DE] rounded-full hover:scale-110 transition-transform"
                    >
                      <Copy className="w-5 h-5 text-black" />
                    </button>
                  </div>
                </div>

                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {template.name}
                    </h3>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                          <MoreHorizontal className="w-4 h-4 text-gray-400" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="w-4 h-4 mr-2" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="w-4 h-4 mr-2" />
                          Use Template
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                    {template.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-xs capitalize">
                      {template.category}
                    </Badge>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {template.downloads.toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                No templates found
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Try adjusting your search or filter criteria
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
