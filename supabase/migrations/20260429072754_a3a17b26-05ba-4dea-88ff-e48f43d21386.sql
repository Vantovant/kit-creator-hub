-- Unsubscribe Matla Kgeo Alina
UPDATE public.prospects
SET unsubscribed = true
WHERE LOWER(email) = LOWER('khaumatla98@gmail.com');

-- Create segment: APLGO members excluding expired (and VantoOS beta)
INSERT INTO public.segments (user_id, name, description, filters)
SELECT
  (SELECT user_id FROM public.segments WHERE name = 'All Subscribers Except VantoOS' LIMIT 1),
  'APLGO Members (Excl. Expired & VantoOS)',
  'All APLGO subscribers excluding Expired, Expired_Member, expired tags, and VantoOS beta members.',
  '{"match":"all","groups":[{"type":"exclude","match":"any","conditions":[{"field":"tag","value":"vantoos_beta_form","operator":"has"},{"field":"tag","value":"Expired_Member","operator":"has"},{"field":"tag","value":"Expired","operator":"has"},{"field":"tag","value":"expired","operator":"has"}]}]}'::jsonb;