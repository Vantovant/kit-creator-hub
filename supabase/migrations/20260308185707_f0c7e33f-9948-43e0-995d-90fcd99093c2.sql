
-- Reply accounts for monitoring
CREATE TABLE public.zazi_reply_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL DEFAULT 'resend',
  account_email text NOT NULL,
  brand text NOT NULL DEFAULT 'aplgo',
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  sync_status text NOT NULL DEFAULT 'idle',
  config_json jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zazi_reply_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reply_accounts" ON public.zazi_reply_accounts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Outbound send tracking
CREATE TABLE public.zazi_outbound_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid REFERENCES public.zazi_reply_accounts(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  sequence_id uuid REFERENCES public.email_sequences(id) ON DELETE SET NULL,
  sequence_step_index integer,
  broadcast_id uuid REFERENCES public.broadcasts(id) ON DELETE SET NULL,
  brand text NOT NULL DEFAULT 'aplgo',
  provider_message_id text,
  provider_thread_id text,
  recipient_email text NOT NULL,
  subject text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zazi_outbound_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outbound_sends" ON public.zazi_outbound_sends
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_outbound_sends_provider_msg ON public.zazi_outbound_sends(provider_message_id);
CREATE INDEX idx_outbound_sends_recipient ON public.zazi_outbound_sends(recipient_email);
CREATE INDEX idx_outbound_sends_thread ON public.zazi_outbound_sends(provider_thread_id);

-- Inbound replies
CREATE TABLE public.zazi_inbound_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  account_id uuid REFERENCES public.zazi_reply_accounts(id) ON DELETE SET NULL,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  matched_outbound_id uuid REFERENCES public.zazi_outbound_sends(id) ON DELETE SET NULL,
  matched_sequence_id uuid REFERENCES public.email_sequences(id) ON DELETE SET NULL,
  matched_sequence_step_index integer,
  matched_broadcast_id uuid REFERENCES public.broadcasts(id) ON DELETE SET NULL,
  provider_message_id text,
  in_reply_to text,
  references_header text,
  thread_id text,
  sender_email text NOT NULL,
  sender_name text,
  subject text,
  snippet text,
  body_text text,
  body_html text,
  reply_status text NOT NULL DEFAULT 'new',
  intent_tag text,
  handled_at timestamptz,
  handled_by uuid,
  waiting_on text,
  snoozed_until timestamptz,
  is_read boolean NOT NULL DEFAULT false,
  is_starred boolean NOT NULL DEFAULT false,
  internal_notes text,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zazi_inbound_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage inbound_replies" ON public.zazi_inbound_replies
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_inbound_replies_status ON public.zazi_inbound_replies(reply_status);
CREATE INDEX idx_inbound_replies_sender ON public.zazi_inbound_replies(sender_email);
CREATE INDEX idx_inbound_replies_outbound ON public.zazi_inbound_replies(matched_outbound_id);
CREATE INDEX idx_inbound_replies_provider_msg ON public.zazi_inbound_replies(provider_message_id);

-- Reply action log
CREATE TABLE public.zazi_reply_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid NOT NULL REFERENCES public.zazi_inbound_replies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL,
  action_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zazi_reply_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage reply_actions" ON public.zazi_reply_actions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_reply_actions_reply ON public.zazi_reply_actions(reply_id);

-- Enable realtime for replies
ALTER PUBLICATION supabase_realtime ADD TABLE public.zazi_inbound_replies;
