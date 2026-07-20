import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type InboxMessage = {
  id: string;
  user_id: string;
  account_id: string;
  message_id: string;
  thread_id: string | null;
  sender: string;
  sender_name: string | null;
  recipients: string[] | null;
  cc: string[] | null;
  subject: string | null;
  snippet: string | null;
  body_preview: string | null;
  date: string;
  label_ids: string[] | null;
  is_read: boolean;
  is_starred: boolean;
  is_archived: boolean;
  snoozed_until: string | null;
  waiting_on: string | null;
  handled_at: string | null;
  category: string | null;
  urgency: string | null;
  intent: string | null;
  prospect_id: string | null;
  created_at: string;
};

export type InboxFilter = "inbox" | "starred" | "sent" | "archive" | "snoozed" | "waiting" | "handled";

export function useInbox(accountId: string | null, filter: InboxFilter = "inbox") {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!accountId) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from("inbox_messages")
      .select("*")
      .eq("account_id", accountId)
      .eq("deleted_at", null)
      .order("date", { ascending: false });

    if (filter === "inbox") query = query.eq("is_archived", false);
    else if (filter === "starred") query = query.eq("is_starred", true);
    else if (filter === "archive") query = query.eq("is_archived", true);
    else if (filter === "snoozed") query = query.not("snoozed_until", "is", null);
    else if (filter === "waiting") query = query.not("waiting_on", "is", null);
    else if (filter === "handled") query = query.not("handled_at", "is", null);

    const { data } = await query;
    setMessages((data as InboxMessage[]) || []);
    setLoading(false);
  }, [accountId, filter]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!accountId) return;
    const channel = supabase
      .channel(`inbox-messages-${accountId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_messages", filter: `account_id=eq.${accountId}` }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [accountId, fetchMessages]);

  const doAction = async (messageId: string, action: string, actionData?: any) => {
    const { data, error } = await supabase.functions.invoke("gmail-action", {
      body: { message_id: messageId, action, action_data: actionData },
    });
    if (error) throw error;
    await fetchMessages();
    return data;
  };

  const selected = messages.find(m => m.id === selectedId) || messages[0] || null;

  return {
    messages,
    loading,
    selected,
    selectedId,
    setSelectedId,
    doAction,
    refresh: fetchMessages,
  };
}
