
-- Plan Tasks
CREATE TABLE public.plan_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',
  priority text NOT NULL DEFAULT 'medium',
  due_date timestamptz,
  start_date timestamptz,
  completed_at timestamptz,
  order_index integer NOT NULL DEFAULT 0,
  source text DEFAULT 'manual',
  estimated_minutes integer,
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Plan Reminders
CREATE TABLE public.plan_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  reminder_time timestamptz NOT NULL,
  is_done boolean NOT NULL DEFAULT false,
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Plan Meetings
CREATE TABLE public.plan_meetings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_time timestamptz NOT NULL,
  end_time timestamptz,
  location text,
  notes text,
  attendees jsonb DEFAULT '[]'::jsonb,
  project_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Plan Notes
CREATE TABLE public.plan_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_date date NOT NULL DEFAULT CURRENT_DATE,
  content text DEFAULT '',
  structured_mode boolean NOT NULL DEFAULT false,
  structure_json jsonb DEFAULT '{}'::jsonb,
  links_json jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_plan_tasks_user_due ON public.plan_tasks(user_id, due_date);
CREATE INDEX idx_plan_tasks_status ON public.plan_tasks(user_id, status, priority);
CREATE INDEX idx_plan_reminders_user_time ON public.plan_reminders(user_id, reminder_time);
CREATE INDEX idx_plan_meetings_user_start ON public.plan_meetings(user_id, start_time);
CREATE INDEX idx_plan_notes_user_date ON public.plan_notes(user_id, note_date);

-- Updated_at triggers
CREATE TRIGGER plan_tasks_updated_at BEFORE UPDATE ON public.plan_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER plan_reminders_updated_at BEFORE UPDATE ON public.plan_reminders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER plan_meetings_updated_at BEFORE UPDATE ON public.plan_meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER plan_notes_updated_at BEFORE UPDATE ON public.plan_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE public.plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_notes ENABLE ROW LEVEL SECURITY;

-- Tasks RLS
CREATE POLICY "Users can read own tasks" ON public.plan_tasks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON public.plan_tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON public.plan_tasks FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON public.plan_tasks FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Reminders RLS
CREATE POLICY "Users can read own reminders" ON public.plan_reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reminders" ON public.plan_reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reminders" ON public.plan_reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reminders" ON public.plan_reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Meetings RLS
CREATE POLICY "Users can read own meetings" ON public.plan_meetings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meetings" ON public.plan_meetings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meetings" ON public.plan_meetings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meetings" ON public.plan_meetings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Notes RLS
CREATE POLICY "Users can read own notes" ON public.plan_notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.plan_notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.plan_notes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.plan_notes FOR DELETE TO authenticated USING (auth.uid() = user_id);
