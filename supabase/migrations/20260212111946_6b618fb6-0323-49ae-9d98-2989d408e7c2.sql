
-- Create function to trigger automations when tags are added to prospects
CREATE OR REPLACE FUNCTION public.trigger_tag_added_automation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  tag_name_val TEXT;
  prospect_email TEXT;
  prospect_first_name TEXT;
  supabase_url TEXT;
BEGIN
  -- Get tag name
  SELECT name INTO tag_name_val FROM tags WHERE id = NEW.tag_id;
  -- Get prospect info
  SELECT email, first_name INTO prospect_email, prospect_first_name
  FROM prospects WHERE id = NEW.prospect_id;

  IF prospect_email IS NOT NULL AND tag_name_val IS NOT NULL THEN
    -- Use pg_net to call the execute-automation edge function
    PERFORM net.http_post(
      url := current_setting('app.settings.supabase_url', true) || '/functions/v1/execute-automation',
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'trigger_type', 'tag_added',
        'trigger_data', jsonb_build_object(
          'email', prospect_email,
          'first_name', prospect_first_name,
          'tag_name', tag_name_val
        )
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger on prospect_tags insert
CREATE TRIGGER trg_tag_added_automation
AFTER INSERT ON public.prospect_tags
FOR EACH ROW
EXECUTE FUNCTION public.trigger_tag_added_automation();
