import { supabase } from "@/integrations/supabase/client";

export interface PageContext {
  page: string;
  subscriber_count: number;
  broadcast_count: number;
  sent_broadcast_count: number;
  active_sequence_count: number;
  total_sequence_count: number;
  has_tags: boolean;
  tag_count: number;
  segment_count: number;
  automation_count: number;
  open_rate: number;
  click_rate: number;
}

export async function getPageContext(pathname: string): Promise<PageContext> {
  const page = pathname.replace("/dashboard/", "").replace("/dashboard", "home") || "home";

  const [
    { count: subscriberCount },
    { count: broadcastCount },
    { count: sentBroadcastCount },
    { count: activeSequenceCount },
    { count: totalSequenceCount },
    { count: tagCount },
    { count: segmentCount },
    { count: automationCount },
    { data: broadcastStats },
    { data: events },
  ] = await Promise.all([
    supabase.from("prospects").select("*", { count: "exact", head: true }).eq("unsubscribed", false),
    supabase.from("broadcasts").select("*", { count: "exact", head: true }),
    supabase.from("broadcasts").select("*", { count: "exact", head: true }).eq("status", "sent"),
    supabase.from("email_sequences").select("*", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("email_sequences").select("*", { count: "exact", head: true }),
    supabase.from("tags").select("*", { count: "exact", head: true }),
    supabase.from("segments").select("*", { count: "exact", head: true }),
    supabase.from("automations").select("*", { count: "exact", head: true }),
    supabase.from("broadcasts").select("total_sent").eq("status", "sent"),
    supabase.from("email_events").select("event_type"),
  ]);

  const totalSent = (broadcastStats || []).reduce((s, b) => s + (b.total_sent || 0), 0);
  const opens = (events || []).filter(e => e.event_type?.toLowerCase().includes("opened")).length;
  const clicks = (events || []).filter(e => e.event_type?.toLowerCase().includes("clicked")).length;

  return {
    page,
    subscriber_count: subscriberCount || 0,
    broadcast_count: broadcastCount || 0,
    sent_broadcast_count: sentBroadcastCount || 0,
    active_sequence_count: activeSequenceCount || 0,
    total_sequence_count: totalSequenceCount || 0,
    has_tags: (tagCount || 0) > 0,
    tag_count: tagCount || 0,
    segment_count: segmentCount || 0,
    automation_count: automationCount || 0,
    open_rate: totalSent > 0 ? Math.round((opens / totalSent) * 100) : 0,
    click_rate: totalSent > 0 ? Math.round((clicks / totalSent) * 100) : 0,
  };
}
