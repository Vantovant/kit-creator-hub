ALTER TABLE public.hub_sync_state
  ADD COLUMN IF NOT EXISTS last_seen_version integer;