UPDATE public.broadcasts
SET status = 'scheduled', scheduled_at = now()
WHERE id = 'ec994c8d-6d0c-43df-bbdd-4ce808e438a4';