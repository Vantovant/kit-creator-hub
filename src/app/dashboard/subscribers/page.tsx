import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ImportExportModal } from "@/components/dashboard/ImportExportModal";
import { Search, Download, Upload, Users, Tag, X, Plus, Flame } from "lucide-react";

interface Prospect {
  id: string;
  email: string;
  first_name: string | null;
  created_at: string;
  source: string | null;
  engagement_score: number;
  last_activity_at: string | null;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
}

export default function SubscribersPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<"import" | "export">("import");

  // Tag management
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [prospectTags, setProspectTags] = useState<Record<string, string[]>>({});
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  const fetchProspects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false });
    setProspects(data || []);
    setLoading(false);
  };

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from("tags").select("id, name, color");
    if (data) setAllTags(data);
  }, []);

  const fetchProspectTags = useCallback(async () => {
    const { data } = await supabase.from("prospect_tags").select("prospect_id, tag_id");
    if (data) {
      const map: Record<string, string[]> = {};
      data.forEach((pt: { prospect_id: string; tag_id: string }) => {
        if (!map[pt.prospect_id]) map[pt.prospect_id] = [];
        map[pt.prospect_id].push(pt.tag_id);
      });
      setProspectTags(map);
    }
  }, []);

  useEffect(() => {
    fetchProspects();
    fetchTags();
    fetchProspectTags();
  }, [fetchTags, fetchProspectTags]);

  const addTagToProspect = async (prospectId: string, tagId: string) => {
    await supabase.from("prospect_tags").insert({ prospect_id: prospectId, tag_id: tagId });
    fetchProspectTags();
  };

  const removeTagFromProspect = async (prospectId: string, tagId: string) => {
    await supabase.from("prospect_tags").delete().eq("prospect_id", prospectId).eq("tag_id", tagId);
    fetchProspectTags();
  };

  const getTagsForProspect = (prospectId: string) => {
    const tagIds = prospectTags[prospectId] || [];
    return allTags.filter((t) => tagIds.includes(t.id));
  };

  const getAvailableTags = (prospectId: string) => {
    const tagIds = prospectTags[prospectId] || [];
    return allTags.filter((t) => !tagIds.includes(t.id));
  };

  const filtered = prospects.filter(
    (p) =>
      (p.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getEngagementLabel = (score: number) => {
    if (score >= 10) return { label: "Hot", color: "text-red-500", bg: "bg-red-500/10" };
    if (score >= 5) return { label: "Warm", color: "text-amber-500", bg: "bg-amber-500/10" };
    if (score >= 1) return { label: "Cool", color: "text-blue-500", bg: "bg-blue-500/10" };
    if (score <= -3) return { label: "Cold", color: "text-muted-foreground", bg: "bg-muted" };
    return { label: "New", color: "text-muted-foreground", bg: "bg-muted" };
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Subscribers"
        subtitle="Manage your email list and subscriber segments"
      />

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {loading ? "…" : prospects.length.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total Subscribers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-primary">
                {loading ? "…" : prospects.length.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search subscribers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => { setImportExportMode("import"); setImportExportOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              type="button"
              onClick={() => { setImportExportMode("export"); setImportExportOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Table or empty state */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">Loading…</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="font-semibold text-foreground mb-2">
                  {searchQuery ? "No results found" : "No subscribers yet"}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "Try adjusting your search."
                    : "Share your welcome form to start growing your list."}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subscriber</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Subscribed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
                            {p.first_name ? p.first_name[0].toUpperCase() : p.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {p.first_name || "—"}
                            </p>
                            <p className="text-sm text-muted-foreground">{p.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const eng = getEngagementLabel(p.engagement_score);
                          return (
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${eng.bg} ${eng.color}`}>
                                <Flame className="w-3 h-3" />
                                {eng.label}
                              </span>
                              <span className="text-xs text-muted-foreground">{p.engagement_score}</span>
                            </div>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {getTagsForProspect(p.id).map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="secondary"
                              className="text-xs gap-1 pr-1"
                              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                            >
                              {tag.name}
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); removeTagFromProspect(p.id, tag.id); }}
                                className="ml-0.5 hover:opacity-70"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                          <button
                            type="button"
                            onClick={() => { setSelectedProspect(p); setTagDialogOpen(true); }}
                            className="w-6 h-6 rounded-full border border-dashed border-muted-foreground/40 flex items-center justify-center hover:border-primary hover:text-primary transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {p.source || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(p.created_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <ImportExportModal
          isOpen={importExportOpen}
          onClose={() => setImportExportOpen(false)}
          onImportComplete={fetchProspects}
          mode={importExportMode}
        />

        {/* Tag assignment dialog */}
        <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Tags</DialogTitle>
              <DialogDescription>
                {selectedProspect
                  ? `Assign tags to ${selectedProspect.first_name || selectedProspect.email}`
                  : "Select tags"}
              </DialogDescription>
            </DialogHeader>
            {selectedProspect && (
              <div className="space-y-4">
                {/* Current tags */}
                {getTagsForProspect(selectedProspect.id).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Current tags</p>
                    <div className="flex flex-wrap gap-2">
                      {getTagsForProspect(selectedProspect.id).map((tag) => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="gap-1 pr-1"
                          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                        >
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => removeTagFromProspect(selectedProspect.id, tag.id)}
                            className="ml-1 hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                {/* Available tags */}
                {getAvailableTags(selectedProspect.id).length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Add a tag</p>
                    <div className="flex flex-wrap gap-2">
                      {getAvailableTags(selectedProspect.id).map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => addTagToProspect(selectedProspect.id, tag.id)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-border hover:border-primary text-sm transition-colors"
                        >
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : allTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tags created yet. Go to Segments & Tags to create some.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">All tags already assigned.</p>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
