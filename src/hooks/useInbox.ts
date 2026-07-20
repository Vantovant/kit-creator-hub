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
  body_html?: string | null;
  body_text?: string | null;
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

/**
 * accountScope: a single account id, an array of account ids, or "all".
 */
export function useInbox(accountScope: string | string[] | "all" | null, filter: InboxFilter = "inbox") {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scopeKey = Array.isArray(accountScope) ? accountScope.join(",") : accountScope ?? "";

  const fetchMessages = useCallback(async () => {
    if (!accountScope) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let query = supabase
      .from("inbox_messages")
      .select("*")
      .is("deleted_at", null)
      .order("date", { ascending: false })
      .limit(200);

    if (accountScope !== "all") {
      const ids = Array.isArray(accountScope) ? accountScope : [accountScope];
      if (ids.length === 1) query = query.eq("account_id", ids[0]);
      else query = query.in("account_id", ids);
    }

    const nowIso = new Date().toISOString();
    if (filter === "inbox") {
      query = query
        .eq("is_archived", false)
        .or(`snoozed_until.is.null,snoozed_until.lte.${nowIso}`);
    } else if (filter === "starred") query = query.eq("is_starred", true);
    else if (filter === "archive") query = query.eq("is_archived", true);
    else if (filter === "snoozed") query = query.gt("snoozed_until", nowIso);
    else if (filter === "waiting") query = query.not("waiting_on", "is", null);
    else if (filter === "handled") query = query.not("handled_at", "is", null);

    const { data } = await query;
    setMessages((data as InboxMessage[]) || []);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, filter]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  useEffect(() => {
    if (!accountScope || accountScope === "all") return;
    const ids = Array.isArray(accountScope) ? accountScope : [accountScope];
    if (ids.length !== 1) return;
    const channel = supabase
      .channel(`inbox-messages-${ids[0]}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "inbox_messages", filter: `account_id=eq.${ids[0]}` }, () => {
        fetchMessages();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, fetchMessages]);

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
