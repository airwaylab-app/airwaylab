-- Discord sync persistent-failure backoff
-- Adds error tracking columns to profiles so the cron job can stop
-- retrying usernames that consistently fail Discord API lookups.
-- After DISCORD_SYNC_ERROR_THRESHOLD consecutive failures the row is
-- excluded from the cron query until an operator resets the counter.

ALTER TABLE profiles
  ADD COLUMN discord_sync_error_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN discord_sync_last_error  TIMESTAMPTZ;

-- Partial index: fast lookup of candidates that haven't hit the threshold.
-- The cron query filters discord_sync_error_count < 5 so this covers it.
CREATE INDEX idx_profiles_discord_sync_candidates
  ON profiles (discord_sync_error_count)
  WHERE discord_id IS NULL
    AND discord_username IS NOT NULL;
