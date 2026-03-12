// Smart Import/Export modal with AI column mapping, XLSX support, CRM detection, sequence enrollment

import { useState, useRef, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Upload, Download, FileText, CheckCircle2, AlertCircle, X, Tag,
  Sparkles, UserPlus, Loader2, ArrowRight, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { parseCsv, getSampleRows, normalizePhone } from "@/lib/csv-parser";
import { getSmartTags } from "@/lib/smart-tagging";
import type { ParsedSubscriber } from "@/lib/csv-parser";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  mode: "import" | "export";
}

type ImportStep = "upload" | "mapping" | "options" | "processing" | "success" | "error";

export function ImportExportModal({ isOpen, onClose, onImportComplete, mode }: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState(mode);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [importResults, setImportResults] = useState({ total: 0, added: 0, updated: 0, skipped: 0, tagged: 0, enrolled: 0 });
  const [importErrors, setImportErrors] = useState<string[]>([]);

  // AI mapping state
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importContext, setImportContext] = useState<"standard_email_list" | "crm_export">("standard_email_list");
  const [mappingMethod, setMappingMethod] = useState<"ai" | "fallback">("fallback");
  const [mappingLoading, setMappingLoading] = useState(false);
  const [parsedText, setParsedText] = useState("");

  // Options
  const [autoTag, setAutoTag] = useState("");
  const [enableAutoTag, setEnableAutoTag] = useState(true);
  const [enableSmartTags, setEnableSmartTags] = useState(true);
  const [importSource, setImportSource] = useState("csv_import");

  // Sequence enrollment
  const [sequences, setSequences] = useState<{ id: string; name: string; brand: string }[]>([]);
  const [selectedSequence, setSelectedSequence] = useState("");

  // Single entry form
  const [singleMode, setSingleMode] = useState(false);
  const [singleForm, setSingleForm] = useState({ email: "", full_name: "", phone_number: "", source: "manual_entry" });
  const [singleSaving, setSingleSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sequences
  useEffect(() => {
    if (isOpen) {
      supabase.from("email_sequences").select("id, name, brand").eq("status", "active")
        .then(({ data }) => setSequences(data || []));
    }
  }, [isOpen]);

  const handleFileSelect = async (file: File) => {
    setImportFile(file);
    setImportStep("upload");
    setImportErrors([]);

    let text: string;
    if (file.name.match(/\.xlsx?$/i)) {
      // Parse Excel with SheetJS
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      text = XLSX.utils.sheet_to_csv(ws);
    } else {
      text = await file.text();
    }
    setParsedText(text);

    // Get sample rows and request AI mapping
    const { headers, rows } = getSampleRows(text, 3);
    setRawHeaders(headers);

    // Fire AI mapping
    setMappingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-import", {
        body: { headers, sample_rows: rows },
      });
      if (error) throw error;
      setColumnMapping(data.mapping || {});
      setImportContext(data.context || "standard_email_list");
      setMappingMethod(data.method || "fallback");
      if (data.context === "crm_export") {
        setEnableSmartTags(true);
        setImportSource("crm_import");
      }
    } catch (err) {
      console.error("Smart mapping error:", err);
      // Parse without AI mapping
      const { headers: h } = parseCsv(text);
      setRawHeaders(h);
    }
    setMappingLoading(false);
    setImportStep("mapping");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  const proceedToOptions = () => setImportStep("options");

  const handleImport = async () => {
    if (!parsedText) return;
    setImportStep("processing");
    setImportErrors([]);

    try {
      const { subscribers, errors } = parseCsv(parsedText, columnMapping);

      if (subscribers.length === 0) {
        setImportStep("error");
        setImportErrors(errors.length ? errors : ["No valid subscribers found in file."]);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setImportStep("error");
        setImportErrors(["You must be logged in to import."]);
        return;
      }

      // SafeMerge upsert in batches
      let added = 0;
      let updated = 0;
      let skipped = 0;
      const batchSize = 100;

      for (let i = 0; i < subscribers.length; i += batchSize) {
        const batch = subscribers.slice(i, i + batchSize);

        for (const sub of batch) {
          const phoneNormalized = (sub as any)._phone_normalized || undefined;
          const emailNormalized = sub.email.toLowerCase().trim();

          // Build upsert record, filtering out undefined values for safeMerge
          const record: Record<string, any> = { email: sub.email, email_normalized: emailNormalized };
          if (sub.first_name) record.first_name = sub.first_name;
          if (sub.full_name) record.full_name = sub.full_name;
          if (sub.phone_number) record.phone_number = sub.phone_number;
          if (phoneNormalized) record.phone_normalized = phoneNormalized;
          record.source = sub.source || importSource;
          // CRM fields - only set if present (safeMerge)
          const crmFields = [
            "lead_type", "registration_status", "go_status", "associate_status",
            "communication_status", "lead_temperature", "city", "province", "state",
            "country", "interest_level", "focus_area", "lead_path", "sponsor_name",
            "assigned_to", "action_taken", "next_action", "aplgo_id", "additional_notes",
          ];
          for (const f of crmFields) {
            if (sub[f]) record[f] = sub[f];
          }
          if (sub.date_captured) record.date_captured = sub.date_captured;
          if (sub.meeting_time) record.meeting_time = sub.meeting_time;

          // Check if prospect exists by phone_normalized first, then email
          let existingId: string | null = null;

          if (phoneNormalized) {
            const { data: phoneMatch } = await supabase
              .from("prospects")
              .select("id")
              .eq("phone_normalized", phoneNormalized)
              .maybeSingle();
            if (phoneMatch) existingId = phoneMatch.id;
          }

          if (!existingId) {
            const { data: emailMatch } = await supabase
              .from("prospects")
              .select("id")
              .eq("email", sub.email)
              .maybeSingle();
            if (emailMatch) existingId = emailMatch.id;
          }

          if (existingId) {
            // SafeMerge: update only non-empty fields
            const { error } = await supabase.from("prospects").update(record).eq("id", existingId);
            if (!error) updated++;
            else skipped++;
          } else {
            const { error } = await supabase.from("prospects").insert(record as any);
            if (!error) added++;
            else skipped++;
          }
        }
      }

      // Collect all tag names
      const allTagNames = new Set<string>();
      if (enableAutoTag && autoTag.trim()) allTagNames.add(autoTag.trim());

      // CSV tags
      for (const s of subscribers) {
        if (s.tags) s.tags.forEach((t) => allTagNames.add(t));
      }

      // Smart tags from CRM fields
      if (enableSmartTags && importContext === "crm_export") {
        for (const s of subscribers) {
          const smartTags = getSmartTags(s);
          smartTags.forEach((t) => allTagNames.add(t));
        }
      }

      // Get all prospect IDs by email lookup
      const allEmails = subscribers.map((s) => s.email);
      const emailToId = new Map<string, string>();
      for (let i = 0; i < allEmails.length; i += 100) {
        const batch = allEmails.slice(i, i + 100);
        const { data: prospects } = await supabase
          .from("prospects")
          .select("id, email")
          .in("email", batch);
        if (prospects) prospects.forEach((p) => emailToId.set(p.email, p.id));
      }

      let taggedCount = 0;
      if (allTagNames.size > 0 && emailToId.size > 0) {
        taggedCount = await applyTags(subscribers, emailToId, allTagNames, user.id, enableAutoTag ? autoTag.trim() : null, enableSmartTags && importContext === "crm_export");
      }

      // Sequence enrollment
      let enrolledCount = 0;
      if (selectedSequence) {
        try {
          // Find a tag that all imported contacts have, or create a temp one
          const enrollTag = `import-enroll-${Date.now()}`;
          // Create temp tag
          const { data: tagData } = await supabase.from("tags").insert({ name: enrollTag, color: "#888888", user_id: user.id }).select("id").single();
          if (tagData) {
            // Tag all imported prospects
            const pairs = Array.from(emailToId.values()).map((pid) => ({ prospect_id: pid, tag_id: tagData.id }));
            for (let i = 0; i < pairs.length; i += 100) {
              await supabase.from("prospect_tags").upsert(pairs.slice(i, i + 100), { onConflict: "prospect_id,tag_id" });
            }
            // Enroll via batch-enroll-sequence
            const { data: enrollData } = await supabase.functions.invoke("batch-enroll-sequence", {
              body: { sequence_id: selectedSequence, tag_name: enrollTag },
            });
            enrolledCount = enrollData?.enrolled || 0;
          }
        } catch (enrollErr) {
          console.error("Sequence enrollment error:", enrollErr);
        }
      }

      setImportResults({
        total: subscribers.length + errors.length,
        added,
        updated,
        skipped: skipped + errors.length,
        tagged: taggedCount,
        enrolled: enrolledCount,
      });

      if (errors.length > 0) setImportErrors(errors.slice(0, 10));
      setImportStep("success");
      onImportComplete?.();
    } catch (err) {
      console.error("Import error:", err);
      setImportStep("error");
      setImportErrors(["Failed to process the file. Please check the format and try again."]);
    }
  };

  const applyTags = async (
    subscribers: ParsedSubscriber[],
    emailToId: Map<string, string>,
    allTagNames: Set<string>,
    userId: string,
    globalAutoTag: string | null,
    applySmartTags: boolean,
  ): Promise<number> => {
    // Ensure all tags exist
    const tagNameToId = new Map<string, string>();
    for (const tagName of allTagNames) {
      let { data: existingTag } = await supabase
        .from("tags").select("id").eq("name", tagName).maybeSingle();
      if (!existingTag) {
        const { data: newTag } = await supabase
          .from("tags").insert({ name: tagName, color: "#5CC5DE", user_id: userId }).select("id").single();
        existingTag = newTag;
      }
      if (existingTag) tagNameToId.set(tagName, existingTag.id);
    }

    const pairs: { prospect_id: string; tag_id: string }[] = [];
    for (const s of subscribers) {
      const pid = emailToId.get(s.email);
      if (!pid) continue;
      if (s.tags) {
        for (const t of s.tags) {
          const tid = tagNameToId.get(t);
          if (tid) pairs.push({ prospect_id: pid, tag_id: tid });
        }
      }
      if (globalAutoTag) {
        const tid = tagNameToId.get(globalAutoTag);
        if (tid) pairs.push({ prospect_id: pid, tag_id: tid });
      }
      if (applySmartTags) {
        const smartTags = getSmartTags(s);
        for (const t of smartTags) {
          const tid = tagNameToId.get(t);
          if (tid) pairs.push({ prospect_id: pid, tag_id: tid });
        }
      }
    }

    for (let i = 0; i < pairs.length; i += 100) {
      await supabase.from("prospect_tags").upsert(pairs.slice(i, i + 100), { onConflict: "prospect_id,tag_id" });
    }
    return pairs.length;
  };

  const handleSingleEntry = async () => {
    if (!singleForm.email.trim()) return;
    setSingleSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const phone = singleForm.phone_number ? normalizePhone(singleForm.phone_number) : undefined;
      const emailNormalized = singleForm.email.toLowerCase().trim();
      const firstName = singleForm.full_name ? singleForm.full_name.split(" ")[0] : undefined;

      const record: Record<string, any> = {
        email: singleForm.email.trim(),
        email_normalized: emailNormalized,
        full_name: singleForm.full_name || null,
        first_name: firstName || null,
        source: singleForm.source || "manual_entry",
      };
      if (phone) {
        record.phone_number = phone.phone_number;
        record.phone_normalized = phone.phone_normalized;
      }

      await supabase.from("prospects").upsert(record as any, { onConflict: "email", ignoreDuplicates: false });
      setSingleForm({ email: "", full_name: "", phone_number: "", source: "manual_entry" });
      onImportComplete?.();
    } catch (err) {
      console.error("Single entry error:", err);
    }
    setSingleSaving(false);
  };

  const handleExport = async (format: "csv" | "json") => {
    const { data } = await supabase.from("prospects").select("email, first_name, full_name, phone_number, source, lead_type, registration_status, city, country, created_at").order("created_at", { ascending: false });
    if (!data || data.length === 0) return;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "csv") {
      const headers = Object.keys(data[0]).join(",");
      const rows = data.map((r) => Object.values(r).map((v) => `"${v || ""}"`).join(","));
      content = [headers, ...rows].join("\n");
      filename = `subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
      mimeType = "text/csv";
    } else {
      content = JSON.stringify(data, null, 2);
      filename = `subscribers-${new Date().toISOString().slice(0, 10)}.json`;
      mimeType = "application/json";
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetImport = () => {
    setImportStep("upload");
    setImportFile(null);
    setImportErrors([]);
    setColumnMapping({});
    setRawHeaders([]);
    setParsedText("");
    setSelectedSequence("");
    setSingleMode(false);
  };

  const KNOWN_FIELDS = [
    "email", "first_name", "full_name", "phone_number", "source", "tags",
    "lead_type", "registration_status", "go_status", "associate_status",
    "communication_status", "lead_temperature", "city", "province", "state",
    "country", "date_captured", "interest_level", "focus_area", "lead_path",
    "sponsor_name", "assigned_to", "action_taken", "next_action", "meeting_time",
    "aplgo_id", "additional_notes",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Smart Import / Export
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="import" className="flex-1"><Upload className="w-4 h-4 mr-2" />Import</TabsTrigger>
            <TabsTrigger value="export" className="flex-1"><Download className="w-4 h-4 mr-2" />Export</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4 mt-4">
            {/* Mode toggle */}
            <div className="flex items-center gap-3 mb-2">
              <button type="button" onClick={() => setSingleMode(false)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${!singleMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                <Upload className="w-3.5 h-3.5 inline mr-1.5" />Bulk Upload
              </button>
              <button type="button" onClick={() => setSingleMode(true)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${singleMode ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                <UserPlus className="w-3.5 h-3.5 inline mr-1.5" />Add Single
              </button>
            </div>

            {singleMode ? (
              /* Single entry form */
              <div className="space-y-3">
                <div>
                  <Label className="text-sm">Email *</Label>
                  <Input value={singleForm.email} onChange={(e) => setSingleForm({ ...singleForm, email: e.target.value })} placeholder="john@example.com" />
                </div>
                <div>
                  <Label className="text-sm">Full Name</Label>
                  <Input value={singleForm.full_name} onChange={(e) => setSingleForm({ ...singleForm, full_name: e.target.value })} placeholder="John Doe" />
                </div>
                <div>
                  <Label className="text-sm">Phone</Label>
                  <Input value={singleForm.phone_number} onChange={(e) => setSingleForm({ ...singleForm, phone_number: e.target.value })} placeholder="082 123 4567" />
                </div>
                <div>
                  <Label className="text-sm">Source</Label>
                  <Input value={singleForm.source} onChange={(e) => setSingleForm({ ...singleForm, source: e.target.value })} placeholder="manual_entry" />
                </div>
                <button type="button" onClick={handleSingleEntry} disabled={!singleForm.email.trim() || singleSaving}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 disabled:bg-muted text-primary-foreground font-medium rounded-lg transition-colors">
                  {singleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  Add Subscriber
                </button>
              </div>
            ) : importStep === "error" ? (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Import Failed</h3>
                <div className="text-sm text-muted-foreground space-y-1 mb-4 max-h-32 overflow-y-auto">
                  {importErrors.map((err, i) => <p key={i}>{err}</p>)}
                </div>
                <button type="button" onClick={resetImport} className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg">Try Again</button>
              </div>
            ) : importStep === "success" ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
                <div className="flex flex-wrap justify-center gap-3 text-sm mb-4">
                  <span className="text-green-600">{importResults.added} added</span>
                  <span className="text-blue-600">{importResults.updated} updated</span>
                  <span className="text-amber-600">{importResults.skipped} skipped</span>
                  {importResults.tagged > 0 && <span className="text-purple-600">{importResults.tagged} tags applied</span>}
                  {importResults.enrolled > 0 && <span className="text-primary">{importResults.enrolled} enrolled in sequence</span>}
                </div>
                {importErrors.length > 0 && (
                  <div className="mt-3 text-xs text-muted-foreground max-h-24 overflow-y-auto">
                    {importErrors.map((err, i) => <p key={i}>{err}</p>)}
                  </div>
                )}
                <button type="button" onClick={resetImport} className="mt-6 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg">Import More</button>
              </div>
            ) : importStep === "processing" ? (
              <div className="text-center py-12">
                <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Importing and processing subscribers...</p>
                <p className="text-xs text-muted-foreground mt-2">This may take a moment for large files</p>
              </div>
            ) : importStep === "mapping" ? (
              /* Column mapping review */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-sm">Column Mapping</h4>
                    <p className="text-xs text-muted-foreground">
                      {mappingMethod === "ai" ? (
                        <span className="text-primary"><Sparkles className="w-3 h-3 inline mr-1" />AI-detected</span>
                      ) : "Rule-based mapping"}
                      {" · "}
                      {importContext === "crm_export" ? (
                        <span className="text-amber-600">CRM Export detected</span>
                      ) : "Standard email list"}
                    </p>
                  </div>
                </div>
                
                <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {rawHeaders.map((header) => (
                    <div key={header} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-muted-foreground truncate flex-1">{header}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground mx-2 shrink-0" />
                      <select
                        value={columnMapping[header] || ""}
                        onChange={(e) => setColumnMapping({ ...columnMapping, [header]: e.target.value })}
                        className="bg-muted border-none rounded px-2 py-1 text-sm max-w-[160px]"
                      >
                        <option value="">— skip —</option>
                        {KNOWN_FIELDS.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                <button type="button" onClick={proceedToOptions}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : importStep === "options" ? (
              /* Import options */
              <div className="space-y-4">
                {/* Source */}
                <div className="space-y-1">
                  <Label className="text-sm">Import Source Label</Label>
                  <Input value={importSource} onChange={(e) => setImportSource(e.target.value)} placeholder="e.g. crm_import" className="h-8 text-sm" />
                </div>

                {/* Auto-tag */}
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <Tag className="w-4 h-4 text-primary shrink-0" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Custom tag for all imports</span>
                      <Switch checked={enableAutoTag} onCheckedChange={setEnableAutoTag} />
                    </div>
                    {enableAutoTag && (
                      <Input value={autoTag} onChange={(e) => setAutoTag(e.target.value)} placeholder="e.g. newsletter-q3" className="h-8 text-sm" />
                    )}
                  </div>
                </div>

                {/* Smart tags (CRM only) */}
                {importContext === "crm_export" && (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                    <Zap className="w-4 h-4 text-amber-600 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Smart CRM Tags</span>
                        <Switch checked={enableSmartTags} onCheckedChange={setEnableSmartTags} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">Auto-apply tags based on lead_type, registration_status, etc.</p>
                    </div>
                  </div>
                )}

                {/* Sequence enrollment */}
                {sequences.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-sm">Enroll in Sequence (optional)</Label>
                    <select value={selectedSequence} onChange={(e) => setSelectedSequence(e.target.value)}
                      className="w-full h-9 rounded-lg border border-border bg-background px-3 text-sm">
                      <option value="">— None —</option>
                      {sequences.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.brand})</option>)}
                    </select>
                  </div>
                )}

                <button type="button" onClick={handleImport}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg">
                  <Upload className="w-4 h-4" /> Start Import
                </button>
              </div>
            ) : (
              /* Upload step */
              <>
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    importFile ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"
                  }`}
                >
                  {mappingLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="w-10 h-10 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">AI is analyzing your file columns...</p>
                    </div>
                  ) : importFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-primary" />
                      <div className="text-left">
                        <p className="font-medium">{importFile.name}</p>
                        <p className="text-sm text-muted-foreground">{(importFile.size / 1024).toFixed(1)} KB</p>
                      </div>
                      <button type="button" onClick={resetImport} className="ml-4 p-1 hover:bg-muted rounded">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-2">Drag and drop your CSV or Excel file here, or</p>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="text-primary hover:underline font-medium">browse to upload</button>
                      <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} className="hidden" />
                      <p className="text-xs text-muted-foreground mt-3">Supports CSV, XLSX, XLS</p>
                    </>
                  )}
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-sm flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" /> Smart Import
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>AI auto-detects standard email lists & CRM exports</li>
                    <li>Phone numbers normalized for South African format</li>
                    <li>Deduplication via phone + email matching</li>
                    <li>CRM exports get auto-tagged by lifecycle stage</li>
                  </ul>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <p className="text-muted-foreground">Export your subscriber list with all CRM fields.</p>
            <div className="grid grid-cols-2 gap-4">
              <button type="button" onClick={() => handleExport("csv")}
                className="flex flex-col items-center gap-3 p-6 border border-border rounded-lg hover:bg-muted hover:border-primary transition-colors">
                <FileText className="w-10 h-10 text-green-600" />
                <div className="text-center">
                  <p className="font-medium">CSV Format</p>
                  <p className="text-xs text-muted-foreground">Excel, Google Sheets</p>
                </div>
              </button>
              <button type="button" onClick={() => handleExport("json")}
                className="flex flex-col items-center gap-3 p-6 border border-border rounded-lg hover:bg-muted hover:border-primary transition-colors">
                <FileText className="w-10 h-10 text-amber-600" />
                <div className="text-center">
                  <p className="font-medium">JSON Format</p>
                  <p className="text-xs text-muted-foreground">Developers, APIs</p>
                </div>
              </button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
