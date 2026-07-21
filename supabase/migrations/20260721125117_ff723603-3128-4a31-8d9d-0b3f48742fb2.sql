
CREATE OR REPLACE FUNCTION public.merge_prospects(keep_id uuid, drop_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  k prospects%ROWTYPE;
  d prospects%ROWTYPE;
BEGIN
  IF keep_id = drop_id THEN RETURN; END IF;
  SELECT * INTO k FROM prospects WHERE id = keep_id;
  SELECT * INTO d FROM prospects WHERE id = drop_id;
  IF k.id IS NULL OR d.id IS NULL THEN RETURN; END IF;

  -- Backfill missing fields from duplicate onto keeper (never overwrite)
  UPDATE prospects SET
    first_name = COALESCE(NULLIF(first_name,''), d.first_name),
    full_name = COALESCE(NULLIF(full_name,''), d.full_name),
    phone_number = COALESCE(NULLIF(phone_number,''), d.phone_number),
    phone_normalized = COALESCE(NULLIF(phone_normalized,''), d.phone_normalized),
    phone_raw = COALESCE(NULLIF(phone_raw,''), d.phone_raw),
    aplgo_id = COALESCE(NULLIF(aplgo_id,''), d.aplgo_id),
    city = COALESCE(NULLIF(city,''), d.city),
    country = COALESCE(NULLIF(country,''), d.country),
    lead_type = COALESCE(NULLIF(lead_type,''), d.lead_type),
    lead_temperature = COALESCE(NULLIF(lead_temperature,''), d.lead_temperature),
    registration_status = COALESCE(NULLIF(registration_status,''), d.registration_status),
    go_status = COALESCE(NULLIF(go_status,''), d.go_status),
    hub_contact_id = COALESCE(hub_contact_id, d.hub_contact_id),
    engagement_score = engagement_score + COALESCE(d.engagement_score, 0),
    needs_enrichment = (k.needs_enrichment AND d.needs_enrichment)
  WHERE id = keep_id;

  -- Move tags (dedupe against unique constraint)
  INSERT INTO prospect_tags (prospect_id, tag_id)
  SELECT keep_id, tag_id FROM prospect_tags WHERE prospect_id = drop_id
  ON CONFLICT (prospect_id, tag_id) DO NOTHING;

  -- Reassign activities
  UPDATE contact_activities SET prospect_id = keep_id WHERE prospect_id = drop_id;

  -- Reassign queued automations by email (avoid duplicate step_index conflicts)
  UPDATE automation_queue SET email = k.email
  WHERE email = d.email
    AND NOT EXISTS (
      SELECT 1 FROM automation_queue q2
      WHERE q2.automation_id = automation_queue.automation_id
        AND q2.email = k.email
        AND q2.step_index = automation_queue.step_index
    );
  DELETE FROM automation_queue WHERE email = d.email;

  -- Finally delete the duplicate (cascades to remaining prospect_tags)
  DELETE FROM prospects WHERE id = drop_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_prospects(uuid, uuid) TO service_role;
