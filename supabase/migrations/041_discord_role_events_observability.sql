-- Add observability columns to discord_role_events so failed role
-- assignments are distinguishable from successful ones.
--
-- http_status: Discord API HTTP status code (200/204 = success, 403 = hierarchy, 401 = token, etc.)
-- error_message: raw error body from Discord API for diagnosis
-- Expand action CHECK to allow 'assign_failed' and 'revoke_failed'

ALTER TABLE discord_role_events
  ADD COLUMN IF NOT EXISTS http_status INTEGER,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

ALTER TABLE discord_role_events
  DROP CONSTRAINT IF EXISTS discord_role_events_action_check;

ALTER TABLE discord_role_events
  ADD CONSTRAINT discord_role_events_action_check
    CHECK (action IN ('assign', 'revoke', 'assign_failed', 'revoke_failed'));
