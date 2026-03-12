
-- Contact activities table for tracking calls, emails, meetings etc.
CREATE TABLE public.contact_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL DEFAULT 'call',
  notes TEXT,
  outcome TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.contact_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage contact_activities"
  ON public.contact_activities FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_contact_activities_prospect ON public.contact_activities(prospect_id);
CREATE INDEX idx_contact_activities_user_date ON public.contact_activities(user_id, created_at DESC);

-- Activity goals table for daily targets
CREATE TABLE public.activity_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL DEFAULT 'call',
  daily_target INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, activity_type)
);

ALTER TABLE public.activity_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own goals"
  ON public.activity_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable realtime for contact_activities
ALTER PUBLICATION supabase_realtime ADD TABLE public.contact_activities;
