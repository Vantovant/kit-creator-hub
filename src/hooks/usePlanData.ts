import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PlanTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  order_index: number;
  source: string | null;
  estimated_minutes: number | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanReminder = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  reminder_time: string;
  is_done: boolean;
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanMeeting = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  location: string | null;
  notes: string | null;
  attendees: any;
  project_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PlanNote = {
  id: string;
  user_id: string;
  note_date: string;
  content: string;
  structured_mode: boolean;
  structure_json: any;
  links_json: any;
  created_at: string;
  updated_at: string;
};

export function useTasks() {
  const [tasks, setTasks] = useState<PlanTask[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("plan_tasks")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });
    setTasks((data as PlanTask[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (task: Partial<PlanTask>) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    await supabase.from("plan_tasks").insert({ ...task, user_id: user.id, title: task.title || "Untitled" } as any);
    fetch();
  };

  const update = async (id: string, updates: Partial<PlanTask>) => {
    await supabase.from("plan_tasks").update(updates as any).eq("id", id);
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from("plan_tasks").delete().eq("id", id);
    fetch();
  };

  return { tasks, loading, fetch, create, update, remove };
}

export function useReminders() {
  const [reminders, setReminders] = useState<PlanReminder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("plan_reminders")
      .select("*")
      .order("reminder_time", { ascending: true });
    setReminders((data as PlanReminder[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (r: Partial<PlanReminder>) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    await supabase.from("plan_reminders").insert({ ...r, user_id: user.id, title: r.title || "Untitled", reminder_time: r.reminder_time || new Date().toISOString() } as any);
    fetch();
  };

  const update = async (id: string, updates: Partial<PlanReminder>) => {
    await supabase.from("plan_reminders").update(updates as any).eq("id", id);
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from("plan_reminders").delete().eq("id", id);
    fetch();
  };

  return { reminders, loading, fetch, create, update, remove };
}

export function useMeetings() {
  const [meetings, setMeetings] = useState<PlanMeeting[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("plan_meetings")
      .select("*")
      .order("start_time", { ascending: true });
    setMeetings((data as PlanMeeting[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (m: Partial<PlanMeeting>) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    await supabase.from("plan_meetings").insert({ ...m, user_id: user.id, title: m.title || "Untitled", start_time: m.start_time || new Date().toISOString() } as any);
    fetch();
  };

  const update = async (id: string, updates: Partial<PlanMeeting>) => {
    await supabase.from("plan_meetings").update(updates as any).eq("id", id);
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from("plan_meetings").delete().eq("id", id);
    fetch();
  };

  return { meetings, loading, fetch, create, update, remove };
}

export function useNotes() {
  const [notes, setNotes] = useState<PlanNote[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("plan_notes")
      .select("*")
      .order("note_date", { ascending: false });
    setNotes((data as PlanNote[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const upsert = async (note: Partial<PlanNote>) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    if (note.id) {
      await supabase.from("plan_notes").update({ content: note.content, structure_json: note.structure_json, structured_mode: note.structured_mode } as any).eq("id", note.id);
    } else {
      await supabase.from("plan_notes").insert({ ...note, user_id: user.id } as any);
    }
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from("plan_notes").delete().eq("id", id);
    fetch();
  };

  return { notes, loading, fetch, upsert, remove };
}
