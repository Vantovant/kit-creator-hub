
-- Pipeline stages
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.pipeline_stages TO authenticated;
GRANT ALL ON public.pipeline_stages TO service_role;
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone signed in can read stages" ON public.pipeline_stages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage stages" ON public.pipeline_stages
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.pipeline_stages (name, sort_order, is_default) VALUES
  ('New', 10, true),
  ('Working', 20, false),
  ('Won', 30, false)
ON CONFLICT DO NOTHING;

-- Extend prospects
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS whatsapp_display_name text,
  ADD COLUMN IF NOT EXISTS contact_source text,
  ADD COLUMN IF NOT EXISTS contact_confidence text,
  ADD COLUMN IF NOT EXISTS name_needs_confirmation boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS phone_raw text,
  ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hub_contact_id uuid,
  ADD COLUMN IF NOT EXISTS hub_version int,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill phone_raw from existing phone_number
UPDATE public.prospects SET phone_raw = phone_number WHERE phone_raw IS NULL AND phone_number IS NOT NULL;

-- Normalize helper + trigger
CREATE OR REPLACE FUNCTION public.normalize_phone_e164(v text)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE digits text;
BEGIN
  IF v IS NULL OR btrim(v) = '' THEN RETURN NULL; END IF;
  digits := regexp_replace(v, '[^0-9+]', '', 'g');
  IF digits LIKE '+%' THEN RETURN digits; END IF;
  IF left(digits,1) = '0' THEN RETURN '+27' || substring(digits from 2); END IF;
  IF left(digits,2) = '27' THEN RETURN '+' || digits; END IF;
  RETURN '+' || digits;
END;
$$;

CREATE OR REPLACE FUNCTION public.prospects_touch_normalized()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.phone_raw IS NOT NULL AND NEW.phone_raw <> '' THEN
    NEW.phone_normalized := public.normalize_phone_e164(NEW.phone_raw);
    IF NEW.phone_number IS NULL OR NEW.phone_number = '' THEN
      NEW.phone_number := NEW.phone_raw;
    END IF;
  ELSIF NEW.phone_number IS NOT NULL AND NEW.phone_number <> '' AND (NEW.phone_normalized IS NULL OR NEW.phone_normalized = '') THEN
    NEW.phone_normalized := public.normalize_phone_e164(NEW.phone_number);
  END IF;
  IF NEW.email IS NOT NULL THEN NEW.email := lower(NEW.email); END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prospects_touch_normalized ON public.prospects;
CREATE TRIGGER trg_prospects_touch_normalized
  BEFORE INSERT OR UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.prospects_touch_normalized();
