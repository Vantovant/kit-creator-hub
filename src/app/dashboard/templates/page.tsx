import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Copy,
  MoreHorizontal,
  Sparkles,
  Mail,
  Megaphone,
  Gift,
  BookOpen,
  ShoppingCart,
  Calendar,
  Pencil,
  Trash2,
} from "lucide-react";

interface Template {
  id: string;
  name: string;
  category: string;
  description: string | null;
  content: string;
  subject: string;
  preview_gradient: string | null;
  is_premium: boolean;
  created_at: string;
}

const categories = [
  { id: "all", label: "All Templates", icon: Sparkles },
  { id: "newsletter", label: "Newsletter", icon: Mail },
  { id: "announcement", label: "Announcement", icon: Megaphone },
  { id: "welcome", label: "Welcome", icon: Gift },
  { id: "educational", label: "Educational", icon: BookOpen },
  { id: "promotional", label: "Promotional", icon: ShoppingCart },
  { id: "event", label: "Event", icon: Calendar },
];

const GRADIENTS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  "linear-gradient(135deg, #d299c2 0%, #fef9d7 100%)",
  "linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)",
];

export default function TemplatesPage() {
  const { user } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("newsletter");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");

  const fetchTemplates = useCallback(async () => {
    const { data } = await supabase
      .from("email_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTemplates(data as Template[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const openNew = () => {
    setEditing(null);
    setName("");
    setCategory("newsletter");
    setDescription("");
    setSubject("");
    setContent("");
    setDialogOpen(true);
  };

  const openEdit = (t: Template) => {
    setEditing(t);
    setName(t.name);
    setCategory(t.category);
    setDescription(t.description || "");
    setSubject(t.subject);
    setContent(t.content);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!name.trim() || !user) return;
    const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];

    if (editing) {
      await supabase.from("email_templates").update({
        name: name.trim(),
        category,
        description: description.trim() || null,
        subject: subject.trim(),
        content,
      }).eq("id", editing.id);
    } else {
      await supabase.from("email_templates").insert({
        name: name.trim(),
        category,
        description: description.trim() || null,
        subject: subject.trim(),
        content,
        preview_gradient: gradient,
        user_id: user.id,
      });
    }
    setDialogOpen(false);
    fetchTemplates();
  };

  const deleteTemplate = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await supabase.from("email_templates").delete().eq("id", id);
    fetchTemplates();
  };

  const useTemplate = (t: Template) => {
    // Navigate to new broadcast with template content pre-filled via URL
    window.location.href = `/dashboard/broadcasts/new?template_subject=${encodeURIComponent(t.subject)}&template_content=${encodeURIComponent(t.content)}`;
  };

  const filtered = templates.filter((t) => {
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || t.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Email Templates"
        subtitle="Create and manage reusable email templates"
      />

      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <button
              type="button"
              onClick={openNew}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Template
            </button>
          </div>

          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <cat.icon className="w-4 h-4" />
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {templates.length === 0 ? "No templates yet" : "No templates found"}
              </h3>
              <p className="text-muted-foreground">
                {templates.length === 0
                  ? "Create your first template to get started."
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((template) => (
                <Card key={template.id} className="group overflow-hidden hover:shadow-lg transition-all">
                  <div
                    className="h-48 relative"
                    style={{ background: template.preview_gradient || GRADIENTS[0] }}
                  >
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => useTemplate(template)}
                        className="p-3 bg-primary rounded-full hover:scale-110 transition-transform"
                      >
                        <Copy className="w-5 h-5 text-primary-foreground" />
                      </button>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground">{template.name}</h3>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button type="button" className="p-1 hover:bg-muted rounded">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => useTemplate(template)}>
                            <Copy className="w-4 h-4 mr-2" /> Use Template
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEdit(template)}>
                            <Pencil className="w-4 h-4 mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteTemplate(template.id)} className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{template.description}</p>
                    <Badge variant="outline" className="text-xs capitalize">{template.category}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Template" : "New Template"}</DialogTitle>
            <DialogDescription>{editing ? "Update your template." : "Create a reusable email template."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly Newsletter" />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
              >
                {categories.filter((c) => c.id !== "all").map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's this template for?" />
            </div>
            <div className="space-y-2">
              <Label>Subject Line</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject line" />
            </div>
            <div className="space-y-2">
              <Label>Content (HTML)</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="<h1>Hello {{first_name}}!</h1>"
                className="min-h-[150px] font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setDialogOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button type="button" onClick={save} disabled={!name.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {editing ? "Save" : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
