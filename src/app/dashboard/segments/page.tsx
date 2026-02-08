import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Filter, Tag, Trash2, Pencil, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Segment {
  id: string;
  name: string;
  description: string | null;
  filters: unknown;
  created_at: string;
}

interface TagItem {
  id: string;
  name: string;
  color: string;
  created_at: string;
  subscriber_count?: number;
}

const TAG_COLORS = [
  "#5CC5DE", "#F59E0B", "#10B981", "#EF4444", "#8B5CF6",
  "#EC4899", "#F97316", "#06B6D4", "#84CC16", "#6366F1",
];

export default function SegmentsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("segments");

  // Segments state
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<Segment | null>(null);
  const [segmentName, setSegmentName] = useState("");
  const [segmentDesc, setSegmentDesc] = useState("");

  // Tags state
  const [tags, setTags] = useState<TagItem[]>([]);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(TAG_COLORS[0]);

  const [loading, setLoading] = useState(true);

  const fetchSegments = useCallback(async () => {
    const { data } = await supabase
      .from("segments")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setSegments(data as Segment[]);
  }, []);

  const fetchTags = useCallback(async () => {
    const { data } = await supabase
      .from("tags")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) {
      // Get subscriber counts per tag
      const { data: tagCounts } = await supabase
        .from("prospect_tags")
        .select("tag_id");
      const countMap: Record<string, number> = {};
      tagCounts?.forEach((pt: { tag_id: string }) => {
        countMap[pt.tag_id] = (countMap[pt.tag_id] || 0) + 1;
      });
      setTags(
        (data as TagItem[]).map((t) => ({
          ...t,
          subscriber_count: countMap[t.id] || 0,
        }))
      );
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchSegments(), fetchTags()]).finally(() => setLoading(false));
  }, [fetchSegments, fetchTags]);

  // Segment CRUD
  const openNewSegment = () => {
    setEditingSegment(null);
    setSegmentName("");
    setSegmentDesc("");
    setSegmentDialogOpen(true);
  };

  const openEditSegment = (seg: Segment) => {
    setEditingSegment(seg);
    setSegmentName(seg.name);
    setSegmentDesc(seg.description || "");
    setSegmentDialogOpen(true);
  };

  const saveSegment = async () => {
    if (!segmentName.trim() || !user) return;
    if (editingSegment) {
      await supabase
        .from("segments")
        .update({ name: segmentName.trim(), description: segmentDesc.trim() || null })
        .eq("id", editingSegment.id);
    } else {
      await supabase.from("segments").insert({
        name: segmentName.trim(),
        description: segmentDesc.trim() || null,
        user_id: user.id,
        filters: [],
      });
    }
    setSegmentDialogOpen(false);
    fetchSegments();
  };

  const deleteSegment = async (id: string) => {
    await supabase.from("segments").delete().eq("id", id);
    fetchSegments();
  };

  // Tag CRUD
  const openNewTag = () => {
    setEditingTag(null);
    setTagName("");
    setTagColor(TAG_COLORS[0]);
    setTagDialogOpen(true);
  };

  const openEditTag = (tag: TagItem) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color);
    setTagDialogOpen(true);
  };

  const saveTag = async () => {
    if (!tagName.trim() || !user) return;
    if (editingTag) {
      await supabase
        .from("tags")
        .update({ name: tagName.trim(), color: tagColor })
        .eq("id", editingTag.id);
    } else {
      await supabase.from("tags").insert({
        name: tagName.trim(),
        color: tagColor,
        user_id: user.id,
      });
    }
    setTagDialogOpen(false);
    fetchTags();
  };

  const deleteTag = async (id: string) => {
    await supabase.from("tags").delete().eq("id", id);
    fetchTags();
  };

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
                onClick={activeTab === "segments" ? openNewSegment : openNewTag}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {activeTab === "segments" ? "New Segment" : "New Tag"}
              </button>
            </div>

            {/* Segments Tab */}
            <TabsContent value="segments">
              {loading ? (
                <Card><CardContent className="p-12 text-center text-muted-foreground">Loading…</CardContent></Card>
              ) : segments.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Filter className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No segments yet</h3>
                    <p className="text-muted-foreground">Create segments to target specific groups of subscribers.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {segments.map((seg) => (
                    <Card key={seg.id} className="group">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-foreground truncate">{seg.name}</h3>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button type="button" onClick={() => openEditSegment(seg)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button type="button" onClick={() => deleteSegment(seg.id)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {seg.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{seg.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Created {new Date(seg.created_at).toLocaleDateString()}
                        </p>
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
                <Card>
                  <CardContent className="p-12 text-center">
                    <Tag className="w-12 h-12 text-muted-foreground/40 mx-auto mb-4" />
                    <h3 className="font-semibold text-foreground mb-2">No tags yet</h3>
                    <p className="text-muted-foreground">Create tags to organize and categorize your subscribers.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {tags.map((tag) => (
                    <Card key={tag.id} className="group">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ backgroundColor: tag.color }}
                            />
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
                          {tag.subscriber_count} subscriber{tag.subscriber_count !== 1 ? "s" : ""}
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

      {/* Segment Dialog */}
      <Dialog open={segmentDialogOpen} onOpenChange={setSegmentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSegment ? "Edit Segment" : "New Segment"}</DialogTitle>
            <DialogDescription>
              {editingSegment ? "Update your segment details." : "Create a new segment to target subscribers."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="seg-name">Name</Label>
              <Input id="seg-name" value={segmentName} onChange={(e) => setSegmentName(e.target.value)} placeholder="e.g. Active subscribers" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="seg-desc">Description (optional)</Label>
              <Input id="seg-desc" value={segmentDesc} onChange={(e) => setSegmentDesc(e.target.value)} placeholder="Describe this segment" />
            </div>
          </div>
          <DialogFooter>
            <button type="button" onClick={() => setSegmentDialogOpen(false)} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button type="button" onClick={saveSegment} disabled={!segmentName.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors">
              {editingSegment ? "Save" : "Create"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? "Edit Tag" : "New Tag"}</DialogTitle>
            <DialogDescription>
              {editingTag ? "Update your tag details." : "Create a new tag to categorize subscribers."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tag-name">Name</Label>
              <Input id="tag-name" value={tagName} onChange={(e) => setTagName(e.target.value)} placeholder="e.g. VIP" />
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
