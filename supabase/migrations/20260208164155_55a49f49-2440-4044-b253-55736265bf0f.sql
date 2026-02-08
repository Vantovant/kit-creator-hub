
-- Add engagement columns to prospects
ALTER TABLE public.prospects 
ADD COLUMN engagement_score integer NOT NULL DEFAULT 0,
ADD COLUMN last_activity_at timestamp with time zone;

-- Create function to recalculate engagement scores
CREATE OR REPLACE FUNCTION public.recalculate_engagement_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE prospects p
  SET 
    engagement_score = COALESCE(scores.score, 0),
    last_activity_at = scores.last_event
  FROM (
    SELECT 
      e.email,
      SUM(
        CASE 
          WHEN e.event_type ILIKE '%clicked%' THEN 3
          WHEN e.event_type ILIKE '%opened%' THEN 1
          WHEN e.event_type ILIKE '%delivered%' THEN 0
          WHEN e.event_type ILIKE '%bounced%' THEN -2
          WHEN e.event_type ILIKE '%complained%' THEN -5
          ELSE 0
        END
      ) as score,
      MAX(e.created_at) as last_event
    FROM email_events e
    GROUP BY e.email
  ) scores
  WHERE p.email = scores.email;
END;
$$;

-- Auto-update scores when new email events arrive
CREATE OR REPLACE FUNCTION public.update_engagement_on_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  delta integer;
BEGIN
  delta := CASE 
    WHEN NEW.event_type ILIKE '%clicked%' THEN 3
    WHEN NEW.event_type ILIKE '%opened%' THEN 1
    WHEN NEW.event_type ILIKE '%bounced%' THEN -2
    WHEN NEW.event_type ILIKE '%complained%' THEN -5
    ELSE 0
  END;
  
  IF delta != 0 THEN
    UPDATE prospects 
    SET engagement_score = engagement_score + delta,
        last_activity_at = NEW.created_at
    WHERE email = NEW.email;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_update_engagement_on_event
AFTER INSERT ON public.email_events
FOR EACH ROW
EXECUTE FUNCTION public.update_engagement_on_event();
