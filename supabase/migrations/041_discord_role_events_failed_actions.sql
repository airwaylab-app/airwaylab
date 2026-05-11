-- Expand discord_role_events action enum to include failure states.
-- The original CHECK constraint (migration 034) only allowed 'assign' and 'revoke'.
-- syncRole now returns false on partial failures and callers log 'assign_failed'
-- or 'revoke_failed' so operators can distinguish silent passes from actual success.

ALTER TABLE discord_role_events
  DROP CONSTRAINT discord_role_events_action_check;

ALTER TABLE discord_role_events
  ADD CONSTRAINT discord_role_events_action_check
  CHECK (action IN ('assign', 'revoke', 'assign_failed', 'revoke_failed'));
