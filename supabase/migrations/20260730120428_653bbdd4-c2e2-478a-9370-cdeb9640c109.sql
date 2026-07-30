
-- 1. Internal test segment (single recipient)
INSERT INTO public.segments (id, user_id, name, filters)
VALUES ('11111111-2222-3333-4444-555555555001', 'c89702d5-178a-4c59-bd11-41e3532e1c23',
 'Internal Test — vantovant',
 '{"match":"all","groups":[{"match":"all","type":"include","conditions":[{"field":"email","operator":"equals","value":"vantovant@gmail.com"}]}]}'::jsonb)
ON CONFLICT (id) DO UPDATE SET filters = EXCLUDED.filters;

-- 2. Test copy of Blast 1 to the test segment, due immediately
INSERT INTO public.broadcasts (user_id, subject, content, from_name, brand, segment_id, status, scheduled_at)
SELECT user_id, '[TEST] ' || subject, content, from_name, brand,
       '11111111-2222-3333-4444-555555555001', 'scheduled', now() - interval '1 minute'
FROM public.broadcasts WHERE id = '549c8582-422d-4088-bda1-917292e398c2';

-- 3. Publish Blast 1 now
UPDATE public.broadcasts SET scheduled_at = now() - interval '1 minute'
WHERE id = '549c8582-422d-4088-bda1-917292e398c2' AND status = 'scheduled';

-- 4. Pause all other automated email until 31 July
UPDATE public.automations SET status = 'paused' WHERE status = 'active';
UPDATE public.email_sequences SET status = 'paused' WHERE status = 'active';
UPDATE public.automation_queue SET status = 'cancelled'
WHERE status IN ('pending','processing') AND send_at < '2026-08-01';
