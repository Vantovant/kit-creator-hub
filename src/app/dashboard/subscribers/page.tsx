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
import { Search, Download, Upload, Users, Tag, X, Plus, Flame, ChevronLeft, ChevronRight, Trash2, Loader2, CheckSquare, Bot } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

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

const PAGE_SIZE = 25;

export default function SubscribersPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<"import" | "export">("import");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Tag management
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [prospectTags, setProspectTags] = useState<Record<string, string[]>>({});
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);

  // Edit/delete subscriber
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProspect, setEditProspect] = useState<Prospect | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkConfirmDelete, setBulkConfirmDelete] = useState(false);

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === prospects.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(prospects.map((p) => p.id)));
    }
  };

  const bulkAddTag = async (tagId: string) => {
    // Get existing tags to avoid duplicates
    const { data: existing } = await supabase
      .from("prospect_tags")
      .select("prospect_id")
      .eq("tag_id", tagId)
      .in("prospect_id", Array.from(selectedIds));
    const existingSet = new Set((existing || []).map((e) => e.prospect_id));
    const inserts = Array.from(selectedIds)
      .filter((pid) => !existingSet.has(pid))
      .map((pid) => ({ prospect_id: pid, tag_id: tagId }));
    if (inserts.length > 0) {
      await supabase.from("prospect_tags").insert(inserts);
    }
    fetchProspectTags();
    setBulkTagDialogOpen(false);
  };

  const bulkDelete = async () => {
    setBulkDeleting(true);
    const ids = Array.from(selectedIds);
    await supabase.from("prospect_tags").delete().in("prospect_id", ids);
    await supabase.from("prospects").delete().in("id", ids);
    setBulkDeleting(false);
    setBulkConfirmDelete(false);
    setSelectedIds(new Set());
    fetchProspects();
    fetchProspectTags();
  };

  const fetchProspects = useCallback(async () => {
    setLoading(true);
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("prospects")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (searchQuery.trim()) {
      query = query.or(`first_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
    }

    const { data, count } = await query;
    setProspects(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, searchQuery]);

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
  }, [fetchProspects]);

  useEffect(() => {
    fetchTags();
    fetchProspectTags();
  }, [fetchTags, fetchProspectTags]);

  // Reset page when search changes
  useEffect(() => {
    setPage(0);
  }, [searchQuery]);

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

  const openEditDialog = (p: Prospect) => {
    setEditProspect(p);
    setEditName(p.first_name || "");
    setEditEmail(p.email);
    setConfirmDelete(false);
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editProspect || !editEmail.trim()) return;
    setSaving(true);
    await supabase
      .from("prospects")
      .update({ first_name: editName.trim() || null, email: editEmail.trim() })
      .eq("id", editProspect.id);
    setSaving(false);
    setEditDialogOpen(false);
    fetchProspects();
  };

  const deleteSubscriber = async () => {
    if (!editProspect) return;
    setDeleting(true);
    await supabase.from("prospect_tags").delete().eq("prospect_id", editProspect.id);
    await supabase.from("prospects").delete().eq("id", editProspect.id);
    setDeleting(false);
    setEditDialogOpen(false);
    setConfirmDelete(false);
    fetchProspects();
    fetchProspectTags();
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const getEngagementLabel = (score: number) => {
    if (score >= 10) return { label: "Hot", color: "text-red-500", bg: "bg-red-500/10" };
    if (score >= 5) return { label: "Warm", color: "text-amber-500", bg: "bg-amber-500/10" };
    if (score >= 1) return { label: "Cool", color: "text-blue-500", bg: "bg-blue-500/10" };
    if (score <= -3) return { label: "Cold", color: "text-muted-foreground", bg: "bg-muted" };
    return { label: "New", color: "text-muted-foreground", bg: "bg-muted" };
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Subscribers"
        subtitle="Manage your email list and subscriber segments"
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search subscribers..."
      />

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-foreground">
                {loading ? "…" : totalCount.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">Total Subscribers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-primary">
                {loading ? "…" : totalCount.toLocaleString()}
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

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <CheckSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => setBulkTagDialogOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Tag className="w-3.5 h-3.5" /> Add Tag
            </button>
            {!bulkConfirmDelete ? (
              <button
                type="button"
                onClick={() => setBulkConfirmDelete(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-destructive border border-destructive/30 rounded-lg hover:bg-destructive/10 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            ) : (
              <button
                type="button"
                onClick={bulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 disabled:opacity-50"
              >
                {bulkDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                Confirm Delete ({selectedIds.size})
              </button>
            )}
            <button
              type="button"
              onClick={() => { setSelectedIds(new Set()); setBulkConfirmDelete(false); }}
              className="p-1.5 text-muted-foreground hover:text-foreground rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="text-center text-muted-foreground py-12">Loading…</p>
            ) : prospects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-muted-foreground/40 mb-4" />
                <h3 className="font-semibold text-foreground mb-2">
                  {searchQuery ? "No results found" : "No subscribers yet"}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery ? "Try adjusting your search." : "Share your welcome form to start growing your list."}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === prospects.length && prospects.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded border-border accent-primary"
                        />
                      </TableHead>
                      <TableHead>Subscriber</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Subscribed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {prospects.map((p) => (
                      <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEditDialog(p)}>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id, { stopPropagation: () => {} } as React.MouseEvent)}
                            className="w-4 h-4 rounded border-border accent-primary"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
                              {p.first_name ? p.first_name[0].toUpperCase() : p.email[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{p.first_name || "—"}</p>
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
                          <Badge variant="outline" className="text-xs">{p.source || "unknown"}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatDate(p.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                      Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(0, p - 1))}
                        disabled={page === 0}
                        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-30"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-sm text-muted-foreground">
                        Page {page + 1} of {totalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                        className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-30"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
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

        {/* Edit/Delete subscriber dialog */}
        <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setConfirmDelete(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Subscriber</DialogTitle>
              <DialogDescription>
                Update subscriber details or remove them from your list.
              </DialogDescription>
            </DialogHeader>
            {editProspect && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Name</Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="First name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <Input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center justify-between pt-2">
                  {!confirmDelete ? (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Delete subscriber
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={deleteSubscriber}
                      disabled={deleting}
                      className="flex items-center gap-2 px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      Confirm delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={saveEdit}
                    disabled={saving || !editEmail.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk tag dialog */}
        <Dialog open={bulkTagDialogOpen} onOpenChange={setBulkTagDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Tag to {selectedIds.size} Subscribers</DialogTitle>
              <DialogDescription>Select a tag to apply to all selected subscribers.</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => bulkAddTag(tag.id)}
                  className="flex items-center gap-2 px-4 py-2 rounded-full border border-border hover:border-primary text-sm transition-colors"
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                  {tag.name}
                </button>
              ))}
              {allTags.length === 0 && (
                <p className="text-sm text-muted-foreground">No tags created yet.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
