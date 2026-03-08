
CREATE OR REPLACE FUNCTION public.get_segment_prospects(segment_filters jsonb)
 RETURNS SETOF prospects
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  is_new_format BOOLEAN;
  top_match TEXT;
  grp JSONB;
  cond JSONB;
  grp_match TEXT;
  grp_type TEXT;
  field_val TEXT;
  op_val TEXT;
  val TEXT;
  cond_sql TEXT;
  grp_conditions TEXT[];
  grp_sql TEXT;
  all_groups TEXT[];
  final_where TEXT;
  base_query TEXT;
BEGIN
  is_new_format := (segment_filters ? 'groups');
  all_groups := ARRAY[]::TEXT[];

  IF NOT is_new_format THEN
    segment_filters := jsonb_build_object(
      'match', 'all',
      'groups', jsonb_build_array(
        jsonb_build_object('match', 'all', 'type', 'include', 'conditions', segment_filters)
      )
    );
  END IF;

  top_match := COALESCE(segment_filters->>'match', 'all');

  FOR grp IN SELECT * FROM jsonb_array_elements(segment_filters->'groups')
  LOOP
    grp_match := COALESCE(grp->>'match', 'all');
    grp_type := COALESCE(grp->>'type', 'include');
    grp_conditions := ARRAY[]::TEXT[];

    FOR cond IN SELECT * FROM jsonb_array_elements(grp->'conditions')
    LOOP
      field_val := cond->>'field';
      op_val := cond->>'operator';
      val := cond->>'value';
      cond_sql := NULL;

      IF field_val IN ('email', 'first_name', 'source') THEN
        CASE op_val
          WHEN 'equals' THEN cond_sql := format('p.%I = %L', field_val, val);
          WHEN 'not_equals' THEN cond_sql := format('p.%I != %L', field_val, val);
          WHEN 'contains' THEN cond_sql := format('p.%I ILIKE %L', field_val, '%' || val || '%');
          WHEN 'not_contains' THEN cond_sql := format('p.%I NOT ILIKE %L', field_val, '%' || val || '%');
          WHEN 'starts_with' THEN cond_sql := format('p.%I ILIKE %L', field_val, val || '%');
          WHEN 'ends_with' THEN cond_sql := format('p.%I ILIKE %L', field_val, '%' || val);
          WHEN 'is_empty' THEN cond_sql := format('(p.%I IS NULL OR p.%I = '''')', field_val, field_val);
          WHEN 'is_not_empty' THEN cond_sql := format('(p.%I IS NOT NULL AND p.%I != '''')', field_val, field_val);
          ELSE NULL;
        END CASE;

      ELSIF field_val = 'unsubscribed' THEN
        CASE op_val
          WHEN 'equals' THEN cond_sql := format('p.unsubscribed = %L::boolean', val);
          WHEN 'not_equals' THEN cond_sql := format('p.unsubscribed != %L::boolean', val);
          ELSE NULL;
        END CASE;

      ELSIF field_val = 'engagement_score' THEN
        CASE op_val
          WHEN 'equals' THEN cond_sql := format('p.engagement_score = %s', val::int);
          WHEN 'not_equals' THEN cond_sql := format('p.engagement_score != %s', val::int);
          WHEN 'greater_than' THEN cond_sql := format('p.engagement_score > %s', val::int);
          WHEN 'less_than' THEN cond_sql := format('p.engagement_score < %s', val::int);
          ELSE NULL;
        END CASE;

      ELSIF field_val IN ('created_at', 'last_activity_at') THEN
        CASE op_val
          WHEN 'after' THEN cond_sql := format('p.%I > %L::timestamptz', field_val, val);
          WHEN 'before' THEN cond_sql := format('p.%I < %L::timestamptz', field_val, val);
          WHEN 'within_last_days' THEN cond_sql := format('p.%I >= now() - interval ''%s days''', field_val, val::int);
          WHEN 'is_empty' THEN cond_sql := format('p.%I IS NULL', field_val);
          WHEN 'is_not_empty' THEN cond_sql := format('p.%I IS NOT NULL', field_val);
          ELSE NULL;
        END CASE;

      ELSIF field_val = 'tag' THEN
        CASE op_val
          WHEN 'has' THEN cond_sql := format('EXISTS (SELECT 1 FROM prospect_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.prospect_id = p.id AND t.name = %L)', val);
          WHEN 'not_has' THEN cond_sql := format('NOT EXISTS (SELECT 1 FROM prospect_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.prospect_id = p.id AND t.name = %L)', val);
          ELSE NULL;
        END CASE;

      ELSIF field_val = 'last_opened_at' THEN
        CASE op_val
          WHEN 'after' THEN cond_sql := format('(SELECT MAX(ee.created_at) FROM email_events ee WHERE ee.email = p.email AND ee.event_type ILIKE ''%%opened%%'') > %L::timestamptz', val);
          WHEN 'before' THEN cond_sql := format('(SELECT MAX(ee.created_at) FROM email_events ee WHERE ee.email = p.email AND ee.event_type ILIKE ''%%opened%%'') < %L::timestamptz', val);
          WHEN 'within_last_days' THEN cond_sql := format('(SELECT MAX(ee.created_at) FROM email_events ee WHERE ee.email = p.email AND ee.event_type ILIKE ''%%opened%%'') >= now() - interval ''%s days''', val::int);
          WHEN 'is_empty' THEN cond_sql := 'NOT EXISTS (SELECT 1 FROM email_events ee WHERE ee.email = p.email AND ee.event_type ILIKE ''%opened%'')';
          WHEN 'is_not_empty' THEN cond_sql := 'EXISTS (SELECT 1 FROM email_events ee WHERE ee.email = p.email AND ee.event_type ILIKE ''%opened%'')';
          ELSE NULL;
        END CASE;

      ELSIF field_val = 'last_clicked_at' THEN
        CASE op_val
          WHEN 'after' THEN cond_sql := format('(SELECT MAX(ee.created_at) FROM email_events ee WHERE ee.email = p.email AND ee.event_type ILIKE ''%%clicked%%'') > %L::timestamptz', val);
          WHEN 'before' THEN cond_sql := format('(SELECT MAX(ee.created_at) FROM email_events ee WHERE ee.email = p.email AND ee.event_type ILIKE ''%%clicked%%'') < %L::timestamptz', val);
          WHEN 'within_last_days' THEN cond_sql := format('(SELECT MAX(ee.created_at) FROM email_events ee WHERE ee.email = p.email AND ee.event_type ILIKE ''%%clicked%%'') >= now() - interval ''%s days''', val::int);
          WHEN 'is_empty' THEN cond_sql := 'NOT EXISTS (SELECT 1 FROM email_events ee WHERE ee.email = p.email AND ee.event_type ILIKE ''%clicked%'')';
          WHEN 'is_not_empty' THEN cond_sql := 'EXISTS (SELECT 1 FROM email_events ee WHERE ee.email = p.email AND ee.event_type ILIKE ''%clicked%'')';
          ELSE NULL;
        END CASE;

      ELSIF field_val = 'last_replied_at' THEN
        CASE op_val
          WHEN 'after' THEN cond_sql := format('(SELECT MAX(r.received_at) FROM zazi_inbound_replies r WHERE r.prospect_id = p.id) > %L::timestamptz', val);
          WHEN 'before' THEN cond_sql := format('(SELECT MAX(r.received_at) FROM zazi_inbound_replies r WHERE r.prospect_id = p.id) < %L::timestamptz', val);
          WHEN 'within_last_days' THEN cond_sql := format('(SELECT MAX(r.received_at) FROM zazi_inbound_replies r WHERE r.prospect_id = p.id) >= now() - interval ''%s days''', val::int);
          WHEN 'is_empty' THEN cond_sql := 'NOT EXISTS (SELECT 1 FROM zazi_inbound_replies r WHERE r.prospect_id = p.id)';
          WHEN 'is_not_empty' THEN cond_sql := 'EXISTS (SELECT 1 FROM zazi_inbound_replies r WHERE r.prospect_id = p.id)';
          ELSE NULL;
        END CASE;

      END IF;

      IF cond_sql IS NOT NULL THEN
        grp_conditions := array_append(grp_conditions, cond_sql);
      END IF;
    END LOOP;

    IF array_length(grp_conditions, 1) > 0 THEN
      IF grp_match = 'any' THEN
        grp_sql := '(' || array_to_string(grp_conditions, ' OR ') || ')';
      ELSE
        grp_sql := '(' || array_to_string(grp_conditions, ' AND ') || ')';
      END IF;

      IF grp_type = 'exclude' THEN
        grp_sql := 'NOT ' || grp_sql;
      END IF;

      all_groups := array_append(all_groups, grp_sql);
    END IF;
  END LOOP;

  base_query := 'SELECT p.* FROM prospects p WHERE p.unsubscribed = false';

  IF array_length(all_groups, 1) > 0 THEN
    IF top_match = 'any' THEN
      final_where := array_to_string(all_groups, ' OR ');
    ELSE
      final_where := array_to_string(all_groups, ' AND ');
    END IF;
    base_query := base_query || ' AND (' || final_where || ')';
  END IF;

  RETURN QUERY EXECUTE base_query;
END;
$$;
