"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload,
  Download,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "import" | "export";
}

const sampleSubscribers = [
  { email: "alice@example.com", name: "Alice Johnson", tags: "Newsletter,Premium" },
  { email: "bob@example.com", name: "Bob Smith", tags: "Newsletter" },
  { email: "carol@example.com", name: "Carol Williams", tags: "Premium,Course" },
];

export function ImportExportModal({ isOpen, onClose, mode }: ImportExportModalProps) {
  const [activeTab, setActiveTab] = useState(mode);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [importResults, setImportResults] = useState({ total: 0, added: 0, skipped: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportStatus("idle");
    }
  };

  const handleImport = () => {
    if (!importFile) return;

    setImportStatus("processing");

    // Simulate import process
    setTimeout(() => {
      setImportStatus("success");
      setImportResults({ total: 150, added: 142, skipped: 8 });
    }, 2000);
  };

  const handleExport = (format: "csv" | "json") => {
    const data = sampleSubscribers;
    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === "csv") {
      const headers = "email,name,tags";
      const rows = data.map((s) => `${s.email},${s.name},"${s.tags}"`);
      content = [headers, ...rows].join("\n");
      filename = "subscribers.csv";
      mimeType = "text/csv";
    } else {
      content = JSON.stringify(data, null, 2);
      filename = "subscribers.json";
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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === "text/csv" || file.name.endsWith(".csv"))) {
      setImportFile(file);
      setImportStatus("idle");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import / Export Subscribers</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "import" | "export")}>
          <TabsList className="w-full">
            <TabsTrigger value="import" className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </TabsTrigger>
            <TabsTrigger value="export" className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Export
            </TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4 mt-4">
            {importStatus === "success" ? (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Import Complete!</h3>
                <p className="text-gray-500 mb-4">
                  Successfully imported {importResults.added} of {importResults.total} subscribers.
                </p>
                <div className="flex justify-center gap-4 text-sm">
                  <span className="text-green-600">
                    {importResults.added} added
                  </span>
                  <span className="text-amber-600">
                    {importResults.skipped} skipped (duplicates)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setImportStatus("idle");
                    setImportFile(null);
                  }}
                  className="mt-6 px-4 py-2 bg-[#5CC5DE] hover:bg-[#4AB5CE] text-black font-medium rounded-lg"
                >
                  Import More
                </button>
              </div>
            ) : (
              <>
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    importFile
                      ? "border-[#5CC5DE] bg-[#5CC5DE]/5"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  {importFile ? (
                    <div className="flex items-center justify-center gap-3">
                      <FileText className="w-8 h-8 text-[#5CC5DE]" />
                      <div className="text-left">
                        <p className="font-medium">{importFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(importFile.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setImportFile(null)}
                        className="ml-4 p-1 hover:bg-gray-100 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-600 mb-2">
                        Drag and drop your CSV file here, or
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-[#5CC5DE] hover:underline font-medium"
                      >
                        browse to upload
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h4 className="font-medium mb-2 text-sm">CSV Format Requirements</h4>
                  <ul className="text-sm text-gray-500 space-y-1">
                    <li>First row should contain headers: email, name, tags</li>
                    <li>Email column is required</li>
                    <li>Multiple tags should be comma-separated in quotes</li>
                  </ul>
                  <div className="mt-3 p-2 bg-white dark:bg-gray-700 rounded border text-xs font-mono">
                    email,name,tags<br />
                    john@example.com,John Doe,"Newsletter,Premium"
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleImport}
                  disabled={!importFile || importStatus === "processing"}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#5CC5DE] hover:bg-[#4AB5CE] disabled:bg-gray-300 text-black font-medium rounded-lg transition-colors"
                >
                  {importStatus === "processing" ? (
                    <>
                      <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      Import Subscribers
                    </>
                  )}
                </button>
              </>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <p className="text-gray-600 dark:text-gray-300">
              Export your subscriber list to use in other tools or for backup.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleExport("csv")}
                className="flex flex-col items-center gap-3 p-6 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-[#5CC5DE] transition-colors"
              >
                <FileText className="w-10 h-10 text-green-600" />
                <div className="text-center">
                  <p className="font-medium">CSV Format</p>
                  <p className="text-xs text-gray-500">Excel, Google Sheets</p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleExport("json")}
                className="flex flex-col items-center gap-3 p-6 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-[#5CC5DE] transition-colors"
              >
                <FileText className="w-10 h-10 text-amber-600" />
                <div className="text-center">
                  <p className="font-medium">JSON Format</p>
                  <p className="text-xs text-gray-500">Developers, APIs</p>
                </div>
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-medium mb-2 text-sm">Export includes:</h4>
              <ul className="text-sm text-gray-500 space-y-1">
                <li>Email addresses</li>
                <li>Subscriber names</li>
                <li>Tags and segments</li>
                <li>Subscription date</li>
                <li>Status (active, inactive, bounced)</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
