import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type InboxAccount = {
  id: string;
  user_id: string;
  provider: string;
  email_address: string;
  display_name: string | null;
  label: string | null;
  status: string;
  last_sync_at: string | null;
  sync_error: string | null;
  is_active: boolean;
  created_at: string;
};

export function useInboxAccounts() {
  const [accounts, setAccounts] = useState<InboxAccount[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("inbox_accounts")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    const list = (data as InboxAccount[]) || [];
    setAccounts(list);
    if (list.length > 0 && !selectedId) {
      setSelectedId(list[0].id);
    }
    setLoading(false);
  }, [selectedId]);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const addAccount = async (email: string, label = "Personal") => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return null;
    const { data, error } = await supabase.from("inbox_accounts").insert({
      user_id: user.id,
      provider: "gmail",
      email_address: email,
      label,
      status: "needs_authorization",
      is_active: true,
    }).select().single();
    if (error) throw error;
    await fetchAccounts();
    return data as InboxAccount;
  };

  const removeAccount = async (accountId: string) => {
    const { error } = await supabase
      .from("inbox_accounts")
      .update({ is_active: false, status: "removed" })
      .eq("id", accountId);
    if (error) throw error;
    if (selectedId === accountId) setSelectedId(null);
    await fetchAccounts();
  };

  const syncAccount = async (accountId: string) => {
    const { data, error } = await supabase.functions.invoke("gmail-sync", {
      body: { account_id: accountId, max_results: 50 },
    });
    if (error) throw error;
    return data;
  };

  const selected = accounts.find(a => a.id === selectedId) || accounts[0] || null;

  return {
    accounts,
    loading,
    selected,
    selectedId,
    setSelectedId,
    addAccount,
    removeAccount,
    syncAccount,
    refresh: fetchAccounts,
  };
}
