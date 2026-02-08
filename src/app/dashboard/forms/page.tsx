import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { FormInput, ExternalLink } from "lucide-react";

export default function FormsPage() {
  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Forms & Landing Pages"
        subtitle="Capture subscribers with beautiful opt-in forms"
      />

      <main className="p-6 space-y-6">
        {/* Active welcome form */}
        <Card className="bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FormInput className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Welcome Form</h3>
                  <p className="text-sm text-gray-500">Public lead capture form</p>
                </div>
              </div>
              <a
                href="/forms/welcome"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                View Form
              </a>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
