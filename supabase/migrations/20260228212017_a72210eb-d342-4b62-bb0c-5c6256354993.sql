
-- Storage bucket for KB files
INSERT INTO storage.buckets (id, name, public) VALUES ('zazi_kb', 'zazi_kb', false);

-- Storage RLS: only admins can manage KB files
CREATE POLICY "Admins can upload KB files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'zazi_kb' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can read KB files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'zazi_kb' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete KB files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'zazi_kb' AND public.has_role(auth.uid(), 'admin'));

-- KB Sources table
CREATE TABLE public.kb_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  collection TEXT NOT NULL DEFAULT 'general',
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'queued',
  file_size BIGINT,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage kb_sources" ON public.kb_sources FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- KB Chunks table with full-text search
CREATE TABLE public.kb_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.kb_sources(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  metadata_json JSONB DEFAULT '{}',
  search_vector TSVECTOR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_chunks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage kb_chunks" ON public.kb_chunks FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-generate tsvector on insert/update
CREATE OR REPLACE FUNCTION public.kb_chunks_search_vector_trigger()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', NEW.chunk_text);
  RETURN NEW;
END;
$$;

CREATE TRIGGER kb_chunks_search_update
  BEFORE INSERT OR UPDATE ON public.kb_chunks
  FOR EACH ROW EXECUTE FUNCTION public.kb_chunks_search_vector_trigger();

CREATE INDEX kb_chunks_search_idx ON public.kb_chunks USING GIN (search_vector);
CREATE INDEX kb_chunks_source_idx ON public.kb_chunks (source_id);

-- KB Ingestion Jobs
CREATE TABLE public.kb_ingestion_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES public.kb_sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued',
  error TEXT,
  chunks_created INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_ingestion_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage kb_ingestion_jobs" ON public.kb_ingestion_jobs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- KB Query Log
CREATE TABLE public.kb_query_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  query TEXT NOT NULL,
  retrieved_sources JSONB DEFAULT '[]',
  response TEXT,
  outcome TEXT DEFAULT 'pending',
  feedback TEXT,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.kb_query_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage kb_query_log" ON public.kb_query_log FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Full-text search function for chunks
CREATE OR REPLACE FUNCTION public.search_kb_chunks(
  search_query TEXT,
  collection_filter TEXT DEFAULT NULL,
  max_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  chunk_id UUID,
  source_id UUID,
  chunk_text TEXT,
  filename TEXT,
  collection TEXT,
  rank REAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.source_id,
    c.chunk_text,
    s.filename,
    s.collection,
    ts_rank(c.search_vector, plainto_tsquery('english', search_query)) AS rank
  FROM kb_chunks c
  JOIN kb_sources s ON c.source_id = s.id
  WHERE s.status = 'ready'
    AND c.search_vector @@ plainto_tsquery('english', search_query)
    AND (collection_filter IS NULL OR s.collection = collection_filter)
  ORDER BY rank DESC
  LIMIT max_results;
END;
$$;
