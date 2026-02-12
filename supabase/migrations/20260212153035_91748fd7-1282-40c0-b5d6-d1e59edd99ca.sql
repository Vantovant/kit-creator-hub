
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
BEGIN
  SELECT name INTO tag_name_val FROM tags WHERE id = NEW.tag_id;
  SELECT email, first_name INTO prospect_email, prospect_first_name
  FROM prospects WHERE id = NEW.prospect_id;

  IF prospect_email IS NOT NULL AND tag_name_val IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://wwuenmmocxtwwgylngui.supabase.co/functions/v1/execute-automation',
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
