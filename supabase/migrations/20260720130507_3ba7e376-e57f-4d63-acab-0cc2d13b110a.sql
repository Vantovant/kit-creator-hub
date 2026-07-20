
-- ============================================================
-- PHASE 0: Zazi Mail Inbox (Superhuman + Nimble) — foundations
-- ============================================================

-- 1. inbox_accounts (connected Gmail accounts)
CREATE TABLE public.inbox_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'gmail',
  email_address TEXT NOT NULL,
  display_name TEXT,
  label TEXT DEFAULT 'Personal',
  status TEXT NOT NULL DEFAULT 'connected',
  history_id TEXT,
  last_sync_at TIMESTAMPTZ,
  sync_error TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, email_address)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_accounts TO authenticated;
GRANT ALL ON public.inbox_accounts TO service_role;
ALTER TABLE public.inbox_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inbox accounts"
  ON public.inbox_accounts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. inbox_oauth_tokens (token vault)
CREATE TABLE public.inbox_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES public.inbox_accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  access_token_encrypted TEXT NOT NULL,
  refresh_token_encrypted TEXT,
  token_type TEXT NOT NULL DEFAULT 'Bearer',
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id)
);
GRANT ALL ON public.inbox_oauth_tokens TO service_role;
ALTER TABLE public.inbox_oauth_tokens ENABLE ROW LEVEL SECURITY;
-- Tokens are only touched by edge functions (service_role). No client policy.

-- 3. inbox_messages (Gmail metadata + triage state)
CREATE TABLE public.inbox_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.inbox_accounts(id) ON DELETE CASCADE,
  message_id TEXT NOT NULL,
  thread_id TEXT,
  sender TEXT NOT NULL,
  sender_name TEXT,
  recipients TEXT[] DEFAULT ARRAY[]::TEXT[],
  cc TEXT[] DEFAULT ARRAY[]::TEXT[],
  subject TEXT,
  snippet TEXT,
  body_preview TEXT,
  date TIMESTAMPTZ NOT NULL,
  label_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  snoozed_until TIMESTAMPTZ,
  waiting_on TEXT,
  handled_at TIMESTAMPTZ,
  category TEXT,
  urgency TEXT,
  intent TEXT,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (account_id, message_id)
);
CREATE INDEX idx_inbox_messages_user_date ON public.inbox_messages(user_id, date DESC);
CREATE INDEX idx_inbox_messages_account ON public.inbox_messages(account_id, date DESC);
CREATE INDEX idx_inbox_messages_sender ON public.inbox_messages(sender);
CREATE INDEX idx_inbox_messages_thread ON public.inbox_messages(thread_id);
CREATE INDEX idx_inbox_messages_prospect ON public.inbox_messages(prospect_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_messages TO authenticated;
GRANT ALL ON public.inbox_messages TO service_role;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inbox messages"
  ON public.inbox_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. inbox_extracts (AI classification cache)
CREATE TABLE public.inbox_extracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID NOT NULL REFERENCES public.inbox_messages(id) ON DELETE CASCADE,
  detected_type TEXT NOT NULL,
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0,
  summary TEXT,
  entities_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  suggested_actions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  prompt_version TEXT NOT NULL DEFAULT 'v1',
  requires_user_confirmation BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (message_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_extracts TO authenticated;
GRANT ALL ON public.inbox_extracts TO service_role;
ALTER TABLE public.inbox_extracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inbox extracts"
  ON public.inbox_extracts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. inbox_action_log (audit trail)
CREATE TABLE public.inbox_action_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_id UUID NOT NULL REFERENCES public.inbox_messages(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  related_id UUID,
  action_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inbox_action_log_message ON public.inbox_action_log(message_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_action_log TO authenticated;
GRANT ALL ON public.inbox_action_log TO service_role;
ALTER TABLE public.inbox_action_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inbox action log"
  ON public.inbox_action_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. inbox_registration_rules (detection rules for auto-enrollment)
CREATE TABLE public.inbox_registration_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  from_pattern TEXT,
  subject_pattern TEXT,
  body_pattern TEXT,
  sequence_id UUID REFERENCES public.email_sequences(id) ON DELETE SET NULL,
  default_tag TEXT,
  brand TEXT DEFAULT 'aplgo',
  min_confidence NUMERIC(4,3) NOT NULL DEFAULT 0.85,
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_registration_rules TO authenticated;
GRANT ALL ON public.inbox_registration_rules TO service_role;
ALTER TABLE public.inbox_registration_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage inbox registration rules"
  ON public.inbox_registration_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- updated_at triggers
CREATE TRIGGER trg_inbox_accounts_updated_at
  BEFORE UPDATE ON public.inbox_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inbox_oauth_tokens_updated_at
  BEFORE UPDATE ON public.inbox_oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inbox_messages_updated_at
  BEFORE UPDATE ON public.inbox_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inbox_extracts_updated_at
  BEFORE UPDATE ON public.inbox_extracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_inbox_registration_rules_updated_at
  BEFORE UPDATE ON public.inbox_registration_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime for messages (so the Inbox UI updates live)
ALTER PUBLICATION supabase_realtime ADD TABLE public.inbox_messages;
