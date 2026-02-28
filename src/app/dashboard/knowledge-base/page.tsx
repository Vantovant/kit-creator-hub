import { useEffect, useState, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { supabase } from "@/integrations/supabase/client";
import {
  Upload, Search, FileText, Trash2, RefreshCw, CheckCircle, XCircle,
  Clock, Loader2, FolderOpen, MessageSquare, ChevronDown, Send
} from "lucide-react";

const COLLECTIONS = [
  { id: "aplgo_business", label: "APLGO Business & Compensation" },
  { id: "aplgo_products", label: "APLGO Products & Benefits" },
  { id: "pricing_pv", label: "Pricing, PV, VAT, Bonuses" },
  { id: "scripts_templates", label: "Scripts & Templates (WhatsApp/Email)" },
  { id: "compliance", label: "Compliance & Disclaimers" },
];

const STORAGE_PATHS: Record<string, string> = {
  aplgo_business: "aplgo/business",
  aplgo_products: "aplgo/products",
  pricing_pv: "aplgo/pricing_pv",
  scripts_templates: "scripts",
  compliance: "compliance",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  queued: <Clock className="w-4 h-4 text-muted-foreground" />,
  processing: <Loader2 className="w-4 h-4 animate-spin text-primary" />,
  ready: <CheckCircle className="w-4 h-4 text-green-500" />,
  failed: <XCircle className="w-4 h-4 text-destructive" />,
};

type KBSource = {
  id: string;
  filename: string;
  storage_path: string;
  collection: string;
  version: number;
  status: string;
  file_size: number | null;
  created_at: string;
};

export default function KnowledgeBasePage() {
  const [sources, setSources] = useState<KBSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(COLLECTIONS[0].id);
  const [filterCollection, setFilterCollection] = useState<string | null>(null);

  // Ask KB panel
  const [askQuery, setAskQuery] = useState("");
  const [askLoading, setAskLoading] = useState(false);
  const [askResult, setAskResult] = useState<{ answer: string; sources: any[]; log_id?: string } | null>(null);

  const fetchSources = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("kb_sources").select("*").order("created_at", { ascending: false });
    if (filterCollection) query = query.eq("collection", filterCollection);
    const { data } = await query;
    setSources((data as KBSource[]) || []);
    setLoading(false);
  }, [filterCollection]);

  useEffect(() => { fetchSources(); }, [fetchSources]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["text/plain", "text/csv", "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type) && !file.name.match(/\.(txt|csv|pdf|docx)$/i)) {
      alert("Only PDF, DOCX, TXT, and CSV files are supported.");
      return;
    }

    setUploading(true);
    const folder = STORAGE_PATHS[selectedCollection] || "general";
    const storagePath = `${folder}/${Date.now()}_${file.name}`;

    const { error: uploadErr } = await supabase.storage.from("zazi_kb").upload(storagePath, file);
    if (uploadErr) {
      console.error("Upload error:", uploadErr);
      alert("Upload failed: " + uploadErr.message);
      setUploading(false);
      return;
    }

    // Check existing versions
    const { data: existing } = await supabase
      .from("kb_sources")
      .select("version")
      .eq("filename", file.name)
      .eq("collection", selectedCollection)
      .order("version", { ascending: false })
      .limit(1);

    const nextVersion = (existing && existing.length > 0) ? (existing[0] as any).version + 1 : 1;

    const { data: source, error: insertErr } = await supabase.from("kb_sources").insert({
      filename: file.name,
      storage_path: storagePath,
      collection: selectedCollection,
      version: nextVersion,
      status: "queued",
      file_size: file.size,
      mime_type: file.type,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id,
    }).select().single();

    if (insertErr) {
      console.error("Insert error:", insertErr);
      setUploading(false);
      return;
    }

    // Trigger ingestion
    if (source) {
      supabase.functions.invoke("kb-ingest", { body: { source_id: (source as any).id } })
        .then(() => { setTimeout(fetchSources, 2000); })
        .catch(console.error);
    }

    setUploading(false);
    fetchSources();
    e.target.value = "";
  };

  const handleDelete = async (source: KBSource) => {
    if (!confirm(`Delete "${source.filename}"?`)) return;
    await supabase.storage.from("zazi_kb").remove([source.storage_path]);
    await supabase.from("kb_sources").delete().eq("id", source.id);
    fetchSources();
  };

  const handleReprocess = async (sourceId: string) => {
    await supabase.from("kb_sources").update({ status: "queued" }).eq("id", sourceId);
    supabase.functions.invoke("kb-ingest", { body: { source_id: sourceId } })
      .then(() => setTimeout(fetchSources, 2000))
      .catch(console.error);
    fetchSources();
  };

  const handleAskKB = async () => {
    if (!askQuery.trim()) return;
    setAskLoading(true);
    setAskResult(null);
    const { data, error } = await supabase.functions.invoke("copilot-answer", {
      body: { user_query: askQuery, context: { action: "general" } },
    });
    if (error) {
      setAskResult({ answer: "Error querying KB.", sources: [] });
    } else {
      setAskResult(data);
    }
    setAskLoading(false);
  };

  const handleFeedback = async (outcome: string) => {
    if (!askResult?.log_id) return;
    await supabase.functions.invoke("copilot-answer", {
      body: { feedback: { log_id: askResult.log_id, outcome } },
    });
  };

  const collectionLabel = (id: string) => COLLECTIONS.find(c => c.id === id)?.label || id;
  const readyCount = sources.filter(s => s.status === "ready").length;
  const processingCount = sources.filter(s => s.status === "processing" || s.status === "queued").length;

  return (
    <div className="min-h-screen">
      <DashboardHeader title="Knowledge Base" subtitle="Upload and manage APLGO training files for Zazi Copilot" />

      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Total Files</p>
            <p className="text-2xl font-bold text-foreground">{sources.length}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Ready</p>
            <p className="text-2xl font-bold text-green-500">{readyCount}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Processing</p>
            <p className="text-2xl font-bold text-primary">{processingCount}</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground">Collections</p>
            <p className="text-2xl font-bold text-foreground">{COLLECTIONS.length}</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Upload + File List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Upload */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Upload File</h3>
              <div className="flex flex-col sm:flex-row gap-3">
                <select
                  value={selectedCollection}
                  onChange={(e) => setSelectedCollection(e.target.value)}
                  className="flex-1 text-sm px-3 py-2 rounded-lg bg-muted border-0 outline-none text-foreground"
                >
                  {COLLECTIONS.map(c => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:bg-primary/90 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Uploading..." : "Choose File"}
                  <input type="file" className="hidden" accept=".pdf,.docx,.txt,.csv" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Supports PDF, DOCX, TXT, CSV</p>
            </div>

            {/* Filter */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilterCollection(null)}
                className={`text-xs px-3 py-1.5 rounded-full transition-colors ${!filterCollection ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
              >
                All
              </button>
              {COLLECTIONS.map(c => (
                <button
                  key={c.id}
                  onClick={() => setFilterCollection(c.id)}
                  className={`text-xs px-3 py-1.5 rounded-full transition-colors ${filterCollection === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* File List */}
            <div className="bg-card border border-border rounded-xl divide-y divide-border">
              {loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : sources.length === 0 ? (
                <div className="p-8 text-center">
                  <FolderOpen className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No files uploaded yet. Upload APLGO docs to power the copilot.</p>
                </div>
              ) : (
                sources.map(source => (
                  <div key={source.id} className="flex items-center gap-3 p-4">
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{source.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {collectionLabel(source.collection)} · v{source.version}
                        {source.file_size ? ` · ${(source.file_size / 1024).toFixed(0)}KB` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {STATUS_ICON[source.status] || STATUS_ICON.queued}
                      <span className="text-xs text-muted-foreground capitalize">{source.status}</span>
                      <button onClick={() => handleReprocess(source.id)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Re-process">
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => handleDelete(source)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors" title="Delete">
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Ask KB Panel */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Ask KB (Test Search)
              </h3>
              <form onSubmit={(e) => { e.preventDefault(); handleAskKB(); }} className="space-y-3">
                <textarea
                  value={askQuery}
                  onChange={(e) => setAskQuery(e.target.value)}
                  placeholder="Ask a question to test KB retrieval..."
                  rows={3}
                  className="w-full text-sm px-3 py-2 rounded-lg bg-muted border-0 outline-none resize-none text-foreground placeholder:text-muted-foreground focus:ring-1 focus:ring-primary"
                />
                <button
                  type="submit"
                  disabled={askLoading || !askQuery.trim()}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:bg-primary/90 transition-colors"
                >
                  {askLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  Test Query
                </button>
              </form>

              {askResult && (
                <div className="mt-4 space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{askResult.answer}</p>
                  </div>
                  {askResult.sources?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Sources:</p>
                      {askResult.sources.map((s: any, i: number) => (
                        <p key={i} className="text-xs text-muted-foreground">
                          [{i + 1}] {s.filename} ({s.collection})
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button onClick={() => handleFeedback("helpful")} className="text-xs px-3 py-1 rounded-full bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors">
                      👍 Helpful
                    </button>
                    <button onClick={() => handleFeedback("not_helpful")} className="text-xs px-3 py-1 rounded-full bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                      👎 Not Helpful
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Missing Knowledge */}
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">📋 Missing Knowledge</h3>
              <div className="space-y-2">
                {COLLECTIONS.map(c => {
                  const count = sources.filter(s => s.collection === c.id && s.status === "ready").length;
                  return (
                    <div key={c.id} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{c.label}</span>
                      <span className={count > 0 ? "text-green-500 font-medium" : "text-amber-500 font-medium"}>
                        {count > 0 ? `${count} files` : "No files"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
