
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS hub_bootstrapped_at timestamptz,
  ADD COLUMN IF NOT EXISTS hub_last_seen_version integer,
  ADD COLUMN IF NOT EXISTS consent_marketing boolean,
  ADD COLUMN IF NOT EXISTS consent_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_type text,
  ADD COLUMN IF NOT EXISTS secondary_emails text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS secondary_phones text[] DEFAULT '{}';

-- Backfill: any prospect that already has a hub_contact_id is considered bootstrapped.
UPDATE public.prospects
SET hub_bootstrapped_at = COALESCE(hub_bootstrapped_at, updated_at)
WHERE hub_contact_id IS NOT NULL AND hub_bootstrapped_at IS NULL;

-- Derive default consent from unsubscribed for records that never had explicit consent.
UPDATE public.prospects
SET consent_marketing = NOT COALESCE(unsubscribed, false),
    consent_updated_at = COALESCE(consent_updated_at, updated_at)
WHERE consent_marketing IS NULL;

-- Field ownership violation log for hub-reported drops.
CREATE TABLE IF NOT EXISTS public.hub_field_violations (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  field text NOT NULL,
  attempted_value jsonb,
  hub_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hub_field_violations TO authenticated;
GRANT ALL ON public.hub_field_violations TO service_role;
ALTER TABLE public.hub_field_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view violations" ON public.hub_field_violations
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
