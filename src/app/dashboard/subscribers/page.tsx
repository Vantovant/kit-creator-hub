import { useEffect, useState } from "react";
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
import { ImportExportModal } from "@/components/dashboard/ImportExportModal";
import { Search, Download, Upload, Users } from "lucide-react";

interface Prospect {
  id: string;
  email: string;
  first_name: string | null;
  created_at: string;
  source: string | null;
}

export default function SubscribersPage() {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [importExportOpen, setImportExportOpen] = useState(false);
  const [importExportMode, setImportExportMode] = useState<"import" | "export">("import");

  const fetchProspects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false });
    setProspects(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProspects();
  }, []);

  const filtered = prospects.filter(
    (p) =>
      (p.first_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Subscribers"
        subtitle="Manage your email list and subscriber segments"
      />

      <main className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "…" : prospects.length.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Total Subscribers</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-green-600">
                {loading ? "…" : prospects.length.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">Active</p>
            </CardContent>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <button
              type="button"
              onClick={() => { setImportExportMode("export"); setImportExportOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Table or empty state */}
        <Card className="bg-white">
          <CardContent className="p-0">
            {loading ? (
              <p className="text-center text-gray-400 py-12">Loading…</p>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="w-12 h-12 text-gray-300 mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">
                  {searchQuery ? "No results found" : "No subscribers yet"}
                </h3>
                <p className="text-gray-500">
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
                    <TableHead>Source</TableHead>
                    <TableHead>Subscribed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-sm">
                            {p.first_name ? p.first_name[0].toUpperCase() : p.email[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {p.first_name || "—"}
                            </p>
                            <p className="text-sm text-gray-500">{p.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {p.source || "unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500">
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
      </main>
    </div>
  );
}
