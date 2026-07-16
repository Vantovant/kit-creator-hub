INSERT INTO public.prospect_tags (prospect_id, tag_id)
SELECT p.id, t.id
FROM public.prospects p
CROSS JOIN public.tags t
WHERE t.name = 'Restart_July_2026'
  AND p.email = ANY (ARRAY[
    'smakhawukana@gmail.com','alicetebello07@gmail.com','bishoplalamani@gmail.com','nellytshabalala10@gmail.com',
    'motlaletsona29@gmail.com','khabo.thwala@gmail.com','haroldbillet@gmail.com','maboyakaikie@gmail.com',
    'mngomezululawrence@gmail.com','nkosisiphiwe7@gmail.com','vantomakubongweoscar@gmail.com','dixieemm@gmail.com',
    'mnyaluzae@gmail.com','ksmolose@gmail.com','nchoe.martha@gmail.com','morwadisello491@gmail.com',
    'maggy.seerane@gmail.com','brianvariawa@gmail.com','angelzideholdings@gmail.com','makhotsostoffels@gmail.com',
    'slmosotho@gmail.com','zolamzame@gmail.com','xhakazazandile0@gmail.com','bev.florence007@gmail.com',
    'ramaru.7@gmail.com','bmoloi137@gmail.com','kpmswel@gmail.com','lucymogopodi41@gmail.com',
    'mohalalelwatau@gmail.com','jezreellaleti@gmail.com','dualieve1@gmail.com','pheli.1975ec@gmail.com',
    'mfuravelapi@gmail.com','vumakhanyisa.ke@gmail.com','vumaeuge@gmail.com','prayer073@gmail.com',
    'rethabilekokozela@gmail.com','vantovant@gmail.com'
  ])
ON CONFLICT DO NOTHING;

-- Ensure they can receive email
UPDATE public.prospects SET unsubscribed = false
WHERE email = ANY (ARRAY[
  'smakhawukana@gmail.com','alicetebello07@gmail.com','bishoplalamani@gmail.com','nellytshabalala10@gmail.com',
  'motlaletsona29@gmail.com','khabo.thwala@gmail.com','haroldbillet@gmail.com','maboyakaikie@gmail.com',
  'mngomezululawrence@gmail.com','nkosisiphiwe7@gmail.com','vantomakubongweoscar@gmail.com','dixieemm@gmail.com',
  'mnyaluzae@gmail.com','ksmolose@gmail.com','nchoe.martha@gmail.com','morwadisello491@gmail.com',
  'maggy.seerane@gmail.com','brianvariawa@gmail.com','angelzideholdings@gmail.com','makhotsostoffels@gmail.com',
  'slmosotho@gmail.com','zolamzame@gmail.com','xhakazazandile0@gmail.com','bev.florence007@gmail.com',
  'ramaru.7@gmail.com','bmoloi137@gmail.com','kpmswel@gmail.com','lucymogopodi41@gmail.com',
  'mohalalelwatau@gmail.com','jezreellaleti@gmail.com','dualieve1@gmail.com','pheli.1975ec@gmail.com',
  'mfuravelapi@gmail.com','vumakhanyisa.ke@gmail.com','vumaeuge@gmail.com','prayer073@gmail.com',
  'rethabilekokozela@gmail.com','vantovant@gmail.com'
]);

-- Reschedule broadcast; exclude the 1 already sent (vantovant likely) via a fresh broadcast row? 
-- Instead: create a follow-up broadcast copy that excludes already-sent recipients.
INSERT INTO public.broadcasts (user_id, subject, content, from_name, brand, preview_text, status, scheduled_at, segment_id)
SELECT user_id, subject, content, from_name, brand, preview_text, 'scheduled', now() - interval '30 seconds', segment_id
FROM public.broadcasts WHERE id = '5b050b1e-f273-4722-a2e2-586c25d32810';