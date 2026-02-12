-- Add indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_prospects_email ON prospects(email);
CREATE INDEX IF NOT EXISTS idx_prospects_created_at ON prospects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_broadcasts_status ON broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_user_id ON broadcasts(user_id);
CREATE INDEX IF NOT EXISTS idx_broadcasts_scheduled_at ON broadcasts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_events_email ON email_events(email);
CREATE INDEX IF NOT EXISTS idx_email_events_broadcast_id ON email_events(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON email_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prospect_tags_prospect_id ON prospect_tags(prospect_id);
CREATE INDEX IF NOT EXISTS idx_prospect_tags_tag_id ON prospect_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_automations_user_id ON automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_status ON automations(status);
CREATE INDEX IF NOT EXISTS idx_segments_user_id ON segments(user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id ON tags(user_id);