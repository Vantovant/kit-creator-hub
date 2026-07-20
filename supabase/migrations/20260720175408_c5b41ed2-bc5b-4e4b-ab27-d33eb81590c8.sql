
CREATE TABLE public.inbox_learning_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_email text,
  sender_domain text,
  signal text NOT NULL CHECK (signal IN ('spam','keep')),
  weight integer NOT NULL DEFAULT 1,
  last_action_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, sender_email, signal)
);

CREATE INDEX idx_ils_user_sender ON public.inbox_learning_signals(user_id, sender_email);
CREATE INDEX idx_ils_user_domain ON public.inbox_learning_signals(user_id, sender_domain);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_learning_signals TO authenticated;
GRANT ALL ON public.inbox_learning_signals TO service_role;

ALTER TABLE public.inbox_learning_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own learning signals"
  ON public.inbox_learning_signals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
