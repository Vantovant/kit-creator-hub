import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BroadcastEditor } from "@/components/dashboard/BroadcastEditor";

export default function NewBroadcastPage() {
  const [searchParams] = useSearchParams();
  const editId = searchParams.get("id");
  const templateSubject = searchParams.get("template_subject");
  const templateContent = searchParams.get("template_content");
  const navigate = useNavigate();

  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(!!editId);

  useEffect(() => {
    if (editId) {
      supabase
        .from("broadcasts")
        .select("*")
        .eq("id", editId)
        .single()
        .then(({ data }) => {
          setInitialData(data);
          setLoading(false);
        });
    } else if (templateSubject || templateContent) {
      setInitialData({
        subject: templateSubject || "",
        content: templateContent || "",
      });
    }
  }, [editId, templateSubject, templateContent]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <DashboardHeader title="Edit Broadcast" subtitle="Loading..." />
        <p className="text-center text-muted-foreground py-12">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title={editId ? "Edit Broadcast" : "New Broadcast"}
        subtitle="Create and send an email to your subscribers"
      />
      <main className="p-6">
        <BroadcastEditor
          initialData={initialData}
          editId={editId}
          onSaved={() => navigate("/dashboard/broadcasts")}
        />
      </main>
    </div>
  );
}
