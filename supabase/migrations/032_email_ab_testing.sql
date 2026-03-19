-- A/B testing columns for email sequences.
-- Tracks which variant was sent and Resend delivery/engagement events.

ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS ab_variant TEXT;
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS resend_id TEXT;
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE email_sequences ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

-- Fast lookup for webhook event matching
CREATE INDEX IF NOT EXISTS idx_email_sequences_resend_id
  ON email_sequences (resend_id)
  WHERE resend_id IS NOT NULL;

-- Composite index for A/B analysis queries
-- e.g. SELECT ab_variant, COUNT(*), AVG(opened_at IS NOT NULL) FROM email_sequences WHERE sequence_name = 'dormancy' GROUP BY ab_variant
CREATE INDEX IF NOT EXISTS idx_email_sequences_ab_analysis
  ON email_sequences (sequence_name, ab_variant)
  WHERE ab_variant IS NOT NULL;
