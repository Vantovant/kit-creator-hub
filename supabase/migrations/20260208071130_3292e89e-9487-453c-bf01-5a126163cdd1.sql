
-- Create prospects table for lead capture
CREATE TABLE public.prospects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  source TEXT DEFAULT 'welcome_form',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts from the public form via edge function (service role bypasses RLS)
-- No public read access needed
CREATE POLICY "No public access to prospects"
ON public.prospects
FOR ALL
USING (false);
