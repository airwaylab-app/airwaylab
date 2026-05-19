-- Expand discord_role_events action enum to include failure states.
-- The original CHECK constraint (migration 034) only allowed 'assign' and 'revoke'.
-- syncRole now returns false on partial failures and callers log 'assign_failed'
-- or 'revoke_failed' so operators can distinguish silent passes from actual success.
--
-- Note: this file was originally committed as 041_discord_role_events_failed_actions.sql,
-- colliding with 041_discord_role_events_observability.sql. Renamed to 044 to resolve
-- the duplicate prefix (see issue #768). Re-applying is safe: drops and recreates the
-- same CHECK constraint idempotently.

ALTER TABLE discord_role_events
  DROP CONSTRAINT IF EXISTS discord_role_events_action_check;

ALTER TABLE discord_role_events
  ADD CONSTRAINT discord_role_events_action_check
  CHECK (action IN ('assign', 'revoke', 'assign_failed', 'revoke_failed'));
