import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FormInput, ExternalLink, ListOrdered, Copy, Check } from "lucide-react";

interface SequenceForm {
  id: string;
  name: string;
  description: string | null;
  status: string;
}

export default function FormsPage() {
  const [sequences, setSequences] = useState<SequenceForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from("email_sequences")
        .select("id, name, description, status")
        .order("created_at", { ascending: false });
      setSequences(data || []);
      setLoading(false);
    }
    fetch();
  }, []);

  const getFormUrl = (id: string) => {
    const base = window.location.origin;
    return `${base}/forms/sequence/${id}`;
  };

  const copyUrl = (id: string) => {
    navigator.clipboard.writeText(getFormUrl(id));
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Forms & Landing Pages"
        subtitle="Capture subscribers with beautiful opt-in forms"
      />

      <main className="p-6 space-y-6">
        {/* Welcome form */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FormInput className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Welcome Form</h3>
                  <p className="text-sm text-muted-foreground">Public lead capture form</p>
                </div>
              </div>
              <a
                href="/forms/welcome"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm text-foreground"
              >
                <ExternalLink className="w-4 h-4" />
                View Form
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Sequence forms */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Sequence Forms</h2>
          {loading ? (
            <p className="text-muted-foreground text-center py-8">Loading…</p>
          ) : sequences.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <ListOrdered className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No sequences yet. Create a sequence to get its opt-in form.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {sequences.map((seq) => (
                <Card key={seq.id}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="p-2 bg-accent/50 rounded-lg">
                          <ListOrdered className="w-5 h-5 text-accent-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">{seq.name}</h3>
                            <Badge
                              variant={seq.status === "active" ? "default" : "outline"}
                              className="text-xs capitalize"
                            >
                              {seq.status}
                            </Badge>
                          </div>
                          {seq.description && (
                            <p className="text-sm text-muted-foreground truncate mt-0.5">{seq.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                            {getFormUrl(seq.id)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyUrl(seq.id)}
                          className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm text-foreground"
                        >
                          {copiedId === seq.id ? (
                            <><Check className="w-4 h-4 text-green-600" /> Copied</>
                          ) : (
                            <><Copy className="w-4 h-4" /> Copy URL</>
                          )}
                        </button>
                        <a
                          href={`/forms/sequence/${seq.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm text-foreground"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View
                        </a>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
