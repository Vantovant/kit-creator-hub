import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ActivityType = "call" | "whatsapp" | "meeting" | "email" | "email_reply";

export interface ActivityCount {
  type: ActivityType;
  count: number;
  target: number;
}

export interface ContactActivity {
  id: string;
  user_id: string;
  prospect_id: string | null;
  activity_type: string;
  notes: string | null;
  outcome: string | null;
  created_at: string;
}

export function useContactActivities() {
  const [activities, setActivities] = useState<ContactActivity[]>([]);
  const [todayCounts, setTodayCounts] = useState<ActivityCount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) { setLoading(false); return; }

    const today = new Date().toISOString().split("T")[0];

    const [activitiesRes, goalsRes] = await Promise.all([
      supabase
        .from("contact_activities")
        .select("*")
        .eq("user_id", user.id)
        .gte("created_at", `${today}T00:00:00Z`)
        .order("created_at", { ascending: false }),
      supabase
        .from("activity_goals")
        .select("*")
        .eq("user_id", user.id),
    ]);

    const todayActivities = (activitiesRes.data || []) as ContactActivity[];
    setActivities(todayActivities);

    const goals = (goalsRes.data || []) as { activity_type: string; daily_target: number }[];
    const goalMap: Record<string, number> = {};
    goals.forEach((g) => { goalMap[g.activity_type] = g.daily_target; });

    const activityTypes: ActivityType[] = ["call", "whatsapp", "meeting", "email", "email_reply"];
    const counts: ActivityCount[] = activityTypes.map((type) => ({
      type,
      count: todayActivities.filter((a) => a.activity_type === type).length,
      target: goalMap[type] || 10,
    }));

    setTodayCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  return { activities, todayCounts, loading, refresh: fetchActivities };
}
