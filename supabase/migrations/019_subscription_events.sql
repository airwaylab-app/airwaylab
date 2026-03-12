-- ============================================================
-- 019: Subscription Events
-- Tracks subscription lifecycle for LTV/churn analytics.
-- ============================================================

CREATE TABLE IF NOT EXISTS subscription_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'cancelled', 'renewed', 'past_due')),
  tier            TEXT,
  interval        TEXT,
  stripe_subscription_id TEXT,
  mrr_cents       INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

-- Service role only — no direct user access
CREATE POLICY "Service role only"
  ON subscription_events
  FOR ALL
  USING (auth.role() = 'service_role');

-- Index for LTV queries by user
CREATE INDEX IF NOT EXISTS idx_subscription_events_user
  ON subscription_events (user_id, created_at);

-- Index for churn analysis by event type
CREATE INDEX IF NOT EXISTS idx_subscription_events_type
  ON subscription_events (event_type, created_at);
