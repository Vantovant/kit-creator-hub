import { useContactActivities, ActivityType } from "@/hooks/useContactActivities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MessageCircle, Calendar, Mail, MailOpen } from "lucide-react";

const activityMeta: Record<ActivityType, { label: string; icon: typeof Phone; color: string }> = {
  call: { label: "Calls", icon: Phone, color: "bg-blue-500" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, color: "bg-green-500" },
  meeting: { label: "Meetings", icon: Calendar, color: "bg-purple-500" },
  email: { label: "Emails Sent", icon: Mail, color: "bg-primary" },
  email_reply: { label: "Replies Received", icon: MailOpen, color: "bg-amber-500" },
};

export function ActivitySummaryPanel() {
  const { todayCounts, loading } = useContactActivities();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground text-center py-4">Loading activities…</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Today's Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {todayCounts.map((item) => {
          const meta = activityMeta[item.type];
          const Icon = meta.icon;
          const pct = Math.min((item.count / item.target) * 100, 100);

          return (
            <div key={item.type} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">{meta.label}</span>
                </div>
                <span className="text-sm text-muted-foreground">
                  {item.count} / {item.target}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${meta.color}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
