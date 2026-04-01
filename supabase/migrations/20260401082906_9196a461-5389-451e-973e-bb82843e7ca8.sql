
-- Days 1-3 (step_index 0,2,4): send immediately so Amos can catch up
UPDATE automation_queue 
SET send_at = NOW(), status = 'pending'
WHERE email = 'amosbaloyi@gmail.com' 
  AND automation_id = 'e38ad029-8b2a-4744-9a80-5c665ae41c45'
  AND step_index IN (0, 2, 4);

-- Day 4 (step_index 6): send now (today is Day 4)
UPDATE automation_queue 
SET send_at = NOW(), status = 'pending'
WHERE email = 'amosbaloyi@gmail.com' 
  AND automation_id = 'e38ad029-8b2a-4744-9a80-5c665ae41c45'
  AND step_index = 6;

-- Days 5+ (step_index 8 onwards): schedule relative to today
-- Each send_email step is 2 apart (with wait steps in between), so day N maps to step_index (N-1)*2
-- Day 5 = tomorrow, Day 6 = +2 days, etc.
-- We need to set proper delays from today for all remaining send_email steps
UPDATE automation_queue 
SET send_at = NOW() + ((step_index - 6) / 2) * INTERVAL '1 day', status = 'pending'
WHERE email = 'amosbaloyi@gmail.com' 
  AND automation_id = 'e38ad029-8b2a-4744-9a80-5c665ae41c45'
  AND step_index > 6
  AND step_data->>'type' = 'send_email';

-- Wait steps don't need sending, mark them processed
UPDATE automation_queue 
SET status = 'processed', processed_at = NOW()
WHERE email = 'amosbaloyi@gmail.com' 
  AND automation_id = 'e38ad029-8b2a-4744-9a80-5c665ae41c45'
  AND step_data->>'type' = 'wait';
