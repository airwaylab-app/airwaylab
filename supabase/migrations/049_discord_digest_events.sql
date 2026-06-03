-- 049: Discord digest accumulation table
-- Stores events held for batch digest posting (not live Discord pushes).
-- Writers INSERT after their primary DB write; digest crons SELECT and mark consumed.
-- Rows are never deleted — consumed_at marks them as processed (retention audit trail).

CREATE TABLE IF NOT EXISTS discord_digest_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    TEXT NOT NULL,               -- matches AlertType in lib/discord-webhook.ts
  digest_type   TEXT NOT NULL CHECK (digest_type IN ('strategy', 'weekly')),
  payload       JSONB NOT NULL DEFAULT '{}', -- event metadata shown in the digest embed
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  consumed_at   TIMESTAMPTZ                  -- NULL until the digest cron marks it consumed
);

-- Efficient read for pending (unconsumed) events per digest type
CREATE INDEX IF NOT EXISTS idx_discord_digest_events_pending
  ON discord_digest_events (digest_type, created_at)
  WHERE consumed_at IS NULL;

ALTER TABLE discord_digest_events ENABLE ROW LEVEL SECURITY;

-- Service role only — digest crons use the admin client, no direct user access
CREATE POLICY "service role only"
  ON discord_digest_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
