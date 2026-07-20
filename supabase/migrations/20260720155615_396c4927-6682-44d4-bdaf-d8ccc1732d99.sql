
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS aplgo_id TEXT,
  ADD COLUMN IF NOT EXISTS needs_enrichment BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS prospects_aplgo_id_idx ON public.prospects(aplgo_id) WHERE aplgo_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS prospects_needs_enrichment_idx ON public.prospects(needs_enrichment) WHERE needs_enrichment = true;
