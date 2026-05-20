-- ============================================================
-- 041: Win-back email support
-- Adds complained_at to email_sequences for circuit-breaker
-- tracking in the win-back send pipeline.
-- ============================================================

ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS complained_at TIMESTAMPTZ;

-- Enables fast complaint-rate queries scoped to a sequence name
CREATE INDEX IF NOT EXISTS idx_email_sequences_complained
  ON email_sequences (sequence_name, complained_at)
  WHERE complained_at IS NOT NULL;
