import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Filter, Tag, Trash2, Pencil, Users, Copy, Zap, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SmartAudienceBuilder } from "@/components/segments/SmartAudienceBuilder";
import { generateNLSummary, TAG_COLORS } from "@/components/segments/constants";
import { normalizeFilters, filtersForSave } from "@/components/segments/types";
import type { Segment, TagItem, SegmentFilters } from "@/components/segments/types";

export default function SegmentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("segments");

  const [segments, setSegments] = useState<Segment[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Builder state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [quickTestEmail, setQuickTestEmail] = useState<string | undefined>(undefined);

  // Tag dialog state
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);

  const fetchSegments = useCallback(async () => {
    const { data } = await supabase
      .from("segments")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      const enriched = await Promise.all(
        (data as Segment[]).map(async (seg) => {
          try {
            const filters = seg.filters;
            const isNew = filters && typeof filters === "object" && !Array.isArray(filters) && filters.groups;
            const payload = isNew ? filters : (Array.isArray(filters) ? filters : []);
            const { data: prospects, error } = await supabase.rpc("get_segment_prospects", {
              segment_filters: payload,
            });
            return { ...seg, subscriber_count: error ? 0 : (prospects?.length || 0) };
          } catch {
            return { ...seg, subscriber_count: 0 };
          }
        })
      );
      setSegments(enriched);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    const { data } = await supabase.from("tags").select("*").order("created_at", { ascending: false });
    if (data) {
      const { data: tagCounts } = await supabase.from("prospect_tags").select("tag_id");
      const countMap: Record<string, number> = {};
      tagCounts?.forEach((pt: { tag_id: string }) => {
        countMap[pt.tag_id] = (countMap[pt.tag_id] || 0) + 1;
      });
      setTags(
        (data as TagItem[]).map((t) => ({ ...t, subscriber_count: countMap[t.id] || 0 }))
      );
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSegments(), fetchTags()]).finally(() => setLoading(false));
  }, [fetchSegments, fetchTags]);

  // Segment actions
  const openNewSegment = () => {
    setEditingSegment(null);
    setQuickTestEmail(undefined);
    setBuilderOpen(true);
  };

  const openQuickTest = () => {
    setEditingSegment(null);
    setQuickTestEmail("");
    setBuilderOpen(true);
  };

  const openEditSegment = (seg: Segment) => {
    setEditingSegment(seg);
    setQuickTestEmail(undefined);
    setBuilderOpen(true);
  };

  const duplicateSegment = (seg: Segment) => {
    setEditingSegment({ ...seg, id: "", name: `${seg.name} (copy)` });
    setQuickTestEmail(undefined);
    setBuilderOpen(true);
  };

  const saveSegment = async (name: string, description: string, filters: SegmentFilters) => {
    if (!user) return;
    if (editingSegment?.id) {
      await supabase
        .from("segments")
        .update({ name, description: description || null, filters: filters as any })
        .eq("id", editingSegment.id);
    } else {
      await supabase.from("segments").insert({
        name,
        description: description || null,
        user_id: user.id,
        filters: filters as any,
      });
    }
    fetchSegments();
  };

  const deleteSegment = async (id: string) => {
    await supabase.from("segments").delete().eq("id", id);
    fetchSegments();
  };

  // Tag CRUD
  const openNewTag = () => { setEditingTag(null); setTagName(""); setTagColor(TAG_COLORS[0]); setTagDialogOpen(true); };
  const openEditTag = (tag: TagItem) => { setEditingTag(tag); setTagName(tag.name); setTagColor(tag.color); setTagDialogOpen(true); };

  const saveTag = async () => {
    if (!tagName.trim() || !user) return;
    if (editingTag) {
      await supabase.from("tags").update({ name: tagName.trim(), color: tagColor }).eq("id", editingTag.id);
    } else {
      await supabase.from("tags").insert({ name: tagName.trim(), color: tagColor, user_id: user.id });
    }
    setTagDialogOpen(false);
    fetchTags();
  };

  const deleteTag = async (id: string) => {
    await supabase.from("tags").delete().eq("id", id);
    fetchTags();
  };

  const getSegmentSummary = (seg: Segment) => {
    try {
      const normalized = normalizeFilters(seg.filters);
      return generateNLSummary(normalized);
    } catch {
      return "Custom filters";
    }
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Smart Audiences" subtitle="Build powerful segments to target the right contacts" />

      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="segments" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Audiences
                </TabsTrigger>
                <TabsTrigger value="tags" className="gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-2">
                {activeTab === "segments" && (
                  <button
                    type="button"
                    onClick={openQuickTest}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Quick Test
                  </button>
                )}
                <button
                  type="button"
                  onClick={activeTab === "segments" ? openNewSegment : openNewTag}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {activeTab === "segments" ? "New Audience" : "New Tag"}
                </button>
              </div>
            </div>

            {/* Segments Tab */}
            <TabsContent value="segments">
              {loading ? (
                <Card><CardContent className="p-12 text-center text-muted-foreground">Loading…</CardContent></Card>
              ) : segments.length === 0 ? (
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={openNewSegment}>
                  <CardContent className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">No audiences yet</h3>
                    <p className="text-muted-foreground mb-4">Create smart audiences to target specific groups of contacts.</p>
                    <span className="text-sm font-medium text-primary">+ Create your first audience</span>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {segments.map((seg) => (
                    <Card key={seg.id} className="group hover:border-primary/30 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-foreground truncate">{seg.name}</h3>
                          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => openEditSegment(seg)} className="p-1 text-muted-foreground hover:text-foreground rounded" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => duplicateSegment(seg)} className="p-1 text-muted-foreground hover:text-foreground rounded" title="Duplicate">
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => deleteSegment(seg.id)} className="p-1 text-muted-foreground hover:text-destructive rounded" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                          {seg.description || getSegmentSummary(seg)}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="gap-1">
                            <Users className="w-3 h-3" />
                            {seg.subscriber_count || 0} contact{(seg.subscriber_count || 0) !== 1 ? "s" : ""}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Tags Tab */}
            <TabsContent value="tags">
              {loading ? (
                <Card><CardContent className="p-12 text-center text-muted-foreground">Loading…</CardContent></Card>
              ) : tags.length === 0 ? (
                <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={openNewTag}>
                  <CardContent className="p-12 text-center">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Plus className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">No tags yet</h3>
                    <p className="text-muted-foreground mb-4">Create tags to organize and categorize your contacts.</p>
                    <span className="text-sm font-medium text-primary">+ Create your first tag</span>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tags.map((tag) => (
                    <Card key={tag.id} className="group">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                            <h3 className="font-semibold text-foreground truncate">{tag.name}</h3>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => openEditTag(tag)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => deleteTag(tag.id)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <Badge variant="secondary" className="gap-1">
                          <Users className="w-3 h-3" />
                          {tag.subscriber_count} contact{tag.subscriber_count !== 1 ? "s" : ""}
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Smart Audience Builder */}
      <SmartAudienceBuilder
        open={builderOpen}
        onOpenChange={setBuilderOpen}
        segment={editingSegment}
        tags={tags}
        onSave={saveSegment}
        quickTestEmail={quickTestEmail}
      />

      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit Tag" : "New Tag"}</DialogTitle>
            <DialogDescription>
              {editingTag ? "Update your tag details." : "Create a new tag to categorize contacts."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="e.g. VIP" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {TAG_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setTagColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${tagColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setTagDialogOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button type="button" onClick={saveTag} disabled={!tagName.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {editingTag ? "Save" : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
