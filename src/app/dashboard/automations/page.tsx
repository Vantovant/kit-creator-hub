import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Zap } from "lucide-react";

export default function AutomationsPage() {
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
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Automation
          </button>
        </div>

        <Card className="bg-white">
          <CardContent className="p-12 text-center">
            <Zap className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-2">No automations yet</h3>
            <p className="text-gray-500">
              Create automated email sequences to engage your subscribers.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
