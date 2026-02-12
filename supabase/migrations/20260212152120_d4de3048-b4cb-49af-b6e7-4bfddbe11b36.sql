
-- Table to queue automation workflow steps with delayed execution
CREATE TABLE public.automation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  step_index INTEGER NOT NULL,
  step_data JSONB NOT NULL,
  send_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for the cron worker to efficiently find due items
CREATE INDEX idx_automation_queue_pending ON public.automation_queue (send_at) WHERE status = 'pending';

-- Index to prevent duplicate queuing
CREATE INDEX idx_automation_queue_dedup ON public.automation_queue (automation_id, email, step_index);

-- Enable RLS
ALTER TABLE public.automation_queue ENABLE ROW LEVEL SECURITY;

-- Admin-only policies
CREATE POLICY "Admins can read automation_queue"
ON public.automation_queue FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert automation_queue"
ON public.automation_queue FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update automation_queue"
ON public.automation_queue FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete automation_queue"
ON public.automation_queue FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));
