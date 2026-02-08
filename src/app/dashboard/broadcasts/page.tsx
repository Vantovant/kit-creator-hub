import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";

export default function BroadcastsPage() {
  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Broadcasts"
        subtitle="Create and manage your email campaigns"
      />

      <main className="p-6 space-y-6">
        <div className="flex items-center justify-end">
          <a
            href="/dashboard/broadcasts/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Broadcast
          </a>
        </div>

        <Card className="bg-white">
          <CardContent className="p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">No broadcasts yet</h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first broadcast.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
