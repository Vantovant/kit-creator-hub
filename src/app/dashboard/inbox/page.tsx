import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Inbox, Zap, Users, ListChecks, Sparkles } from "lucide-react";

export default function InboxPage() {
  return (
    <div>
      <DashboardHeader
        title="Inbox"
        description="Superhuman-style triage + Nimble-style contact intelligence for your Gmail."
      />

      <div className="p-6 max-w-5xl space-y-6">
        <Card className="border-dashed">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Inbox className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Phase 0 complete — foundations installed</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Database, RLS, and audit trail are ready. Next: connect Gmail (Phase 1).
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <FeatureRow icon={<Zap className="w-4 h-4" />} title="Gmail sync (Phase 1)" desc="Read-only OAuth, every 2 min." />
              <FeatureRow icon={<Sparkles className="w-4 h-4" />} title="Superhuman UI (Phase 2)" desc="J/K nav · snooze · waiting · handled · ⌘K." />
              <FeatureRow icon={<Users className="w-4 h-4" />} title="Contact 360 (Phase 3)" desc="Nimble panel: prospect, tags, sequences, activity." />
              <FeatureRow icon={<ListChecks className="w-4 h-4" />} title="Auto-enroll + reply → task (Phase 4-5)" desc="Registrations → sequences, replies → tags + Plan tasks." />
            </div>
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground mb-3">
                To start Phase 1 I need Google OAuth credentials. Reply with{" "}
                <span className="font-mono text-foreground">APPROVE PHASE 1</span> and I'll walk you through
                creating them in Google Cloud Console (5 min).
              </p>
              <Button disabled variant="outline">Connect Gmail (Phase 1 — pending)</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
