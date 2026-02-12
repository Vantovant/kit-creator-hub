
-- 1. Add segment_id to broadcasts so campaigns can target a segment
ALTER TABLE public.broadcasts ADD COLUMN segment_id uuid REFERENCES public.segments(id) ON DELETE SET NULL;

-- 2. Create trigger to auto-unsubscribe on bounce or complaint
CREATE OR REPLACE FUNCTION public.auto_unsubscribe_on_bounce_complaint()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.event_type ILIKE '%bounced%' OR NEW.event_type ILIKE '%complained%' THEN
    UPDATE prospects
    SET unsubscribed = true
    WHERE email = NEW.email AND unsubscribed = false;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_unsubscribe_on_event
AFTER INSERT ON public.email_events
FOR EACH ROW
EXECUTE FUNCTION public.auto_unsubscribe_on_bounce_complaint();
