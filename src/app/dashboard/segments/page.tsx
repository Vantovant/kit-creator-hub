import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Filter, Tag } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

export default function SegmentsPage() {
  const [activeTab, setActiveTab] = useState("segments");

  return (
    <div className="min-h-screen">
      <DashboardHeader
        title="Segments & Tags"
        subtitle="Organize and target your subscribers effectively"
      />

      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between mb-6">
              <TabsList>
                <TabsTrigger value="segments" className="gap-2">
                  <Filter className="w-4 h-4" />
                  Segments
                </TabsTrigger>
                <TabsTrigger value="tags" className="gap-2">
                  <Tag className="w-4 h-4" />
                  Tags
                </TabsTrigger>
              </TabsList>

              <button
                type="button"
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                {activeTab === "segments" ? "New Segment" : "New Tag"}
              </button>
            </div>

            <TabsContent value="segments">
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">No segments yet</h3>
                  <p className="text-gray-500">
                    Create segments to target specific groups of subscribers.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tags">
              <Card className="bg-white">
                <CardContent className="p-12 text-center">
                  <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-semibold text-gray-900 mb-2">No tags yet</h3>
                  <p className="text-gray-500">
                    Create tags to organize and categorize your subscribers.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
