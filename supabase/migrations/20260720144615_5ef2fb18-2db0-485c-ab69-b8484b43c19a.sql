ALTER TABLE public.inbox_messages
ADD COLUMN IF NOT EXISTS body_text text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.inbox_messages TO authenticated;
GRANT ALL ON public.inbox_messages TO service_role;