
-- 1) Lock the broadcast at 'sent' with accurate totals so the worker cannot resume it
UPDATE public.broadcasts
SET status = 'sent',
    total_recipients = 486,
    total_sent = 486,
    sent_at = COALESCE(sent_at, now())
WHERE id = '7be3c181-35ce-4f2d-8f53-ffbeba7893e2';

-- 2) Log a suppression activity for each recipient (7-day cool-down marker)
INSERT INTO public.contact_activities (user_id, prospect_id, activity_type, notes, outcome)
SELECT DISTINCT
  s.user_id,
  s.prospect_id,
  'note',
  'SUPPRESSION: received 9-Step Guide broadcast on 2026-07-03. Do NOT re-target until 2026-07-10.',
  'suppressed_7d'
FROM public.zazi_outbound_sends s
WHERE s.broadcast_id = '7be3c181-35ce-4f2d-8f53-ffbeba7893e2'
  AND s.prospect_id IS NOT NULL;
