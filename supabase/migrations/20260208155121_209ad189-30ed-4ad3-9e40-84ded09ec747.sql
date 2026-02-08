
-- Automations table
CREATE TABLE public.automations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'New Automation',
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  trigger_type TEXT NOT NULL DEFAULT 'subscribe',
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  workflow JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read automations" ON public.automations FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert automations" ON public.automations FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update automations" ON public.automations FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete automations" ON public.automations FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Email events table for delivery tracking
CREATE TABLE public.email_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read email_events" ON public.email_events FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can insert email_events" ON public.email_events FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_email_events_broadcast ON public.email_events(broadcast_id);
CREATE INDEX idx_email_events_type ON public.email_events(event_type);
