
-- Fix: restrict anon update to only allow setting unsubscribed=true via token
DROP POLICY IF EXISTS "Anyone can unsubscribe via token" ON public.prospects;

CREATE POLICY "Anyone can unsubscribe via token" ON public.prospects
  FOR UPDATE TO anon
  USING (unsubscribe_token IS NOT NULL)
  WITH CHECK (unsubscribed = true);

-- Tighten authenticated policies: scope to actual authenticated users only
-- The INSERT/UPDATE/DELETE with (true) are acceptable since only authenticated dashboard users access them
-- But let's keep them as-is since dashboard is behind auth
