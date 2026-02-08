
-- 1. Templates table for persistence
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'newsletter',
  description TEXT,
  content TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  is_premium BOOLEAN NOT NULL DEFAULT false,
  preview_gradient TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read templates" ON public.email_templates FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert templates" ON public.email_templates FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update templates" ON public.email_templates FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete templates" ON public.email_templates FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. A/B test table
CREATE TABLE public.ab_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  broadcast_id UUID REFERENCES public.broadcasts(id) ON DELETE SET NULL,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  test_size_percent INTEGER NOT NULL DEFAULT 20,
  winning_metric TEXT NOT NULL DEFAULT 'opens',
  duration_hours INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'draft',
  winner_variant TEXT,
  results JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ab_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read ab_tests" ON public.ab_tests FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert ab_tests" ON public.ab_tests FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update ab_tests" ON public.ab_tests FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete ab_tests" ON public.ab_tests FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON public.ab_tests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Segment query function - evaluates JSONB filters against prospects
CREATE OR REPLACE FUNCTION public.get_segment_prospects(segment_filters JSONB)
RETURNS SETOF prospects
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  filter_record JSONB;
  base_query TEXT := 'SELECT p.* FROM prospects p WHERE p.unsubscribed = false';
  conditions TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Each filter is: {field, operator, value}
  FOR filter_record IN SELECT * FROM jsonb_array_elements(segment_filters)
  LOOP
    CASE filter_record->>'field'
      WHEN 'source' THEN
        CASE filter_record->>'operator'
          WHEN 'equals' THEN conditions := array_append(conditions, format('p.source = %L', filter_record->>'value'));
          WHEN 'not_equals' THEN conditions := array_append(conditions, format('p.source != %L', filter_record->>'value'));
          ELSE NULL;
        END CASE;
      WHEN 'engagement_score' THEN
        CASE filter_record->>'operator'
          WHEN 'greater_than' THEN conditions := array_append(conditions, format('p.engagement_score > %s', (filter_record->>'value')::int));
          WHEN 'less_than' THEN conditions := array_append(conditions, format('p.engagement_score < %s', (filter_record->>'value')::int));
          WHEN 'equals' THEN conditions := array_append(conditions, format('p.engagement_score = %s', (filter_record->>'value')::int));
          ELSE NULL;
        END CASE;
      WHEN 'created_at' THEN
        CASE filter_record->>'operator'
          WHEN 'after' THEN conditions := array_append(conditions, format('p.created_at > %L::timestamptz', filter_record->>'value'));
          WHEN 'before' THEN conditions := array_append(conditions, format('p.created_at < %L::timestamptz', filter_record->>'value'));
          ELSE NULL;
        END CASE;
      WHEN 'tag' THEN
        CASE filter_record->>'operator'
          WHEN 'has' THEN conditions := array_append(conditions, format('EXISTS (SELECT 1 FROM prospect_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.prospect_id = p.id AND t.name = %L)', filter_record->>'value'));
          WHEN 'not_has' THEN conditions := array_append(conditions, format('NOT EXISTS (SELECT 1 FROM prospect_tags pt JOIN tags t ON pt.tag_id = t.id WHERE pt.prospect_id = p.id AND t.name = %L)', filter_record->>'value'));
          ELSE NULL;
        END CASE;
      ELSE NULL;
    END CASE;
  END LOOP;

  IF array_length(conditions, 1) > 0 THEN
    base_query := base_query || ' AND ' || array_to_string(conditions, ' AND ');
  END IF;

  RETURN QUERY EXECUTE base_query;
END;
$$;
