CREATE TABLE public.email_dispatch_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key text UNIQUE NOT NULL,
  hub_event_id text,
  origin_app text NOT NULL,
  origin_event_id text,
  campaign_type text NOT NULL,
  template_name text NOT NULL,
  recipient_email text,
  recipient_hash text,
  body_preview text,
  status text NOT NULL,
  skip_reason text,
  email_send_id uuid,
  received_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.email_dispatch_log TO authenticated;
GRANT ALL ON public.email_dispatch_log TO service_role;

ALTER TABLE public.email_dispatch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read dispatch log"
  ON public.email_dispatch_log
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX email_dispatch_log_received_at_idx ON public.email_dispatch_log (received_at DESC);
CREATE INDEX email_dispatch_log_status_idx ON public.email_dispatch_log (status);
CREATE INDEX email_dispatch_log_campaign_idx ON public.email_dispatch_log (campaign_type);

CREATE TRIGGER email_dispatch_log_updated_at
  BEFORE UPDATE ON public.email_dispatch_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();