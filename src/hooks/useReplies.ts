import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type InboundReply = {
  id: string;
  user_id: string;
  account_id: string | null;
  prospect_id: string | null;
  matched_outbound_id: string | null;
  matched_sequence_id: string | null;
  matched_sequence_step_index: number | null;
  matched_broadcast_id: string | null;
  provider_message_id: string | null;
  in_reply_to: string | null;
  references_header: string | null;
  thread_id: string | null;
  sender_email: string;
  sender_name: string | null;
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  body_html: string | null;
  reply_status: string;
  intent_tag: string | null;
  handled_at: string | null;
  handled_by: string | null;
  waiting_on: string | null;
  snoozed_until: string | null;
  is_read: boolean;
  is_starred: boolean;
  internal_notes: string | null;
  received_at: string;
  created_at: string;
};

export type ReplyFilter = "all" | "unread" | "new" | "waiting" | "snoozed" | "handled";

export function useReplies(filter: ReplyFilter = "all") {
  const [replies, setReplies] = useState<InboundReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchReplies = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("zazi_inbound_replies" as any)
      .select("*")
      .order("received_at", { ascending: false });

    if (filter === "unread") query = query.eq("is_read", false);
    else if (filter === "new") query = query.eq("reply_status", "new");
    else if (filter === "waiting") query = query.eq("reply_status", "waiting");
    else if (filter === "snoozed") query = query.eq("reply_status", "snoozed");
    else if (filter === "handled") query = query.eq("reply_status", "handled");

    const { data } = await query;
    setReplies((data as unknown as InboundReply[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { fetchReplies(); }, [fetchReplies]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("zazi-replies-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "zazi_inbound_replies" }, () => {
        fetchReplies();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchReplies]);

  const markRead = async (id: string) => {
    await supabase.from("zazi_inbound_replies" as any).update({ is_read: true } as any).eq("id", id);
    setReplies(prev => prev.map(r => r.id === id ? { ...r, is_read: true } : r));
  };

  const toggleStar = async (id: string) => {
    const reply = replies.find(r => r.id === id);
    if (!reply) return;
    await supabase.from("zazi_inbound_replies" as any).update({ is_starred: !reply.is_starred } as any).eq("id", id);
    setReplies(prev => prev.map(r => r.id === id ? { ...r, is_starred: !r.is_starred } : r));
  };

  const setStatus = async (id: string, status: string, extra?: Record<string, any>) => {
    const updates: any = { reply_status: status, ...extra };
    if (status === "handled") updates.handled_at = new Date().toISOString();
    await supabase.from("zazi_inbound_replies" as any).update(updates).eq("id", id);
    fetchReplies();
  };

  const setIntentTag = async (id: string, tag: string) => {
    await supabase.from("zazi_inbound_replies" as any).update({ intent_tag: tag } as any).eq("id", id);
    setReplies(prev => prev.map(r => r.id === id ? { ...r, intent_tag: tag } : r));
  };

  const addNote = async (id: string, note: string) => {
    await supabase.from("zazi_inbound_replies" as any).update({ internal_notes: note } as any).eq("id", id);
    setReplies(prev => prev.map(r => r.id === id ? { ...r, internal_notes: note } : r));
  };

  const logAction = async (replyId: string, actionType: string, actionData?: Record<string, any>) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    await supabase.from("zazi_reply_actions" as any).insert({
      reply_id: replyId,
      user_id: user.id,
      action_type: actionType,
      action_data: actionData || {},
    } as any);
  };

  const selected = replies.find(r => r.id === selectedId) || null;

  return {
    replies, loading, selected, selectedId, setSelectedId,
    markRead, toggleStar, setStatus, setIntentTag, addNote, logAction,
    refresh: fetchReplies,
  };
}
