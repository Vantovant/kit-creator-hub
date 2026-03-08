import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReplyAccount = {
  id: string;
  user_id: string;
  provider: string;
  account_email: string;
  brand: string;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: string;
  config_json: any;
  created_at: string;
  updated_at: string;
};

export function useReplyAccounts() {
  const [accounts, setAccounts] = useState<ReplyAccount[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("zazi_reply_accounts" as any)
      .select("*")
      .order("created_at", { ascending: false });
    setAccounts((data as ReplyAccount[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (account: Partial<ReplyAccount>) => {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) return;
    await supabase.from("zazi_reply_accounts" as any).insert({
      ...account,
      user_id: user.id,
      account_email: account.account_email || "",
    } as any);
    fetch();
  };

  const update = async (id: string, updates: Partial<ReplyAccount>) => {
    await supabase.from("zazi_reply_accounts" as any).update(updates as any).eq("id", id);
    fetch();
  };

  const remove = async (id: string) => {
    await supabase.from("zazi_reply_accounts" as any).delete().eq("id", id);
    fetch();
  };

  return { accounts, loading, create, update, remove, refresh: fetch };
}
