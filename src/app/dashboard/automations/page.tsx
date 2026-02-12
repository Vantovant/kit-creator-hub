import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Zap, Play, Pause, Trash2, Pencil } from "lucide-react";

interface Automation {
  id: string;
  name: string;
  description: string | null;
  status: string;
  trigger_type: string;
  created_at: string;
  updated_at: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  subscribe: "When someone subscribes",
  tag_added: "When a tag is added",
  purchase: "When a purchase is made",
  link_click: "When a link is clicked",
  date: "On a specific date",
};

export default function AutomationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAutomations = useCallback(async () => {
    const { data } = await supabase
      .from("automations")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAutomations(data as Automation[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAutomations();
  }, [fetchAutomations]);

  const openNew = () => {
    navigate("/dashboard/automations/builder");
  };

  const openEdit = (a: Automation) => {
    navigate(`/dashboard/automations/builder?id=${a.id}`);
  };

  const toggleStatus = async (a: Automation) => {
    const newStatus = a.status === "active" ? "draft" : "active";
    await supabase.from("automations").update({ status: newStatus }).eq("id", a.id);
    fetchAutomations();
  };

  const deleteAutomation = async (id: string) => {
    if (!confirm("Delete this automation?")) return;
    await supabase.from("automations").delete().eq("id", id);
    fetchAutomations();
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Automations"
        subtitle="Build automated email sequences that run 24/7"
      />

      <main className="p-6 space-y-6">
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Automation
          </button>
        </div>

        {loading ? (
          <Card><CardContent className="p-12 text-center text-muted-foreground">Loading…</CardContent></Card>
        ) : automations.length === 0 ? (
          <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={openNew}>
            <CardContent className="p-12 text-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No automations yet</h3>
              <p className="text-muted-foreground mb-4">Create automated email sequences to engage your subscribers.</p>
              <span className="text-sm font-medium text-primary">+ Create your first automation</span>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {automations.map((a) => (
              <Card key={a.id} className="group">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground truncate">{a.name}</h3>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => openEdit(a)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button type="button" onClick={() => deleteAutomation(a.id)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {a.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{a.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mb-3">
                    {TRIGGER_LABELS[a.trigger_type] || a.trigger_type}
                  </p>
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className={a.status === "active" ? "bg-green-500/10 text-green-600" : ""}
                    >
                      {a.status === "active" ? "Active" : "Draft"}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => toggleStatus(a)}
                      className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded transition-colors ${
                        a.status === "active"
                          ? "text-amber-600 hover:bg-amber-50"
                          : "text-green-600 hover:bg-green-50"
                      }`}
                    >
                      {a.status === "active" ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {a.status === "active" ? "Pause" : "Activate"}
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

    </div>
  );
}
