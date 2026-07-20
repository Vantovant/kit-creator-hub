
CREATE TABLE IF NOT EXISTS public.hub_sync_state (
  app_key text PRIMARY KEY,
  last_pushed_at timestamptz,
  last_pulled_at timestamptz,
  pushed_count integer NOT NULL DEFAULT 0,
  pulled_count integer NOT NULL DEFAULT 0,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.hub_sync_state TO authenticated;
GRANT ALL ON public.hub_sync_state TO service_role;

ALTER TABLE public.hub_sync_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view hub sync state"
  ON public.hub_sync_state FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.hub_sync_state (app_key) VALUES ('zazi_email')
ON CONFLICT (app_key) DO NOTHING;
