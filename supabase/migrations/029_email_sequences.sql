-- Email drip sequence tracking
-- Stores scheduled email steps for post-upload, dormancy, and feature-education sequences

CREATE TABLE email_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sequence_name TEXT NOT NULL,       -- 'post_upload' | 'dormancy' | 'feature_education'
  step INTEGER NOT NULL DEFAULT 1,   -- step number within sequence
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'sent' | 'completed' | 'cancelled'
  scheduled_at TIMESTAMPTZ NOT NULL, -- when this email should be sent
  sent_at TIMESTAMPTZ,               -- when it was actually sent
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, sequence_name, step)
);

-- RLS: users can view their own sequences only
ALTER TABLE email_sequences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sequences"
  ON email_sequences FOR SELECT
  USING (auth.uid() = user_id);

-- Service role needs full access for cron job
CREATE POLICY "Service role full access"
  ON email_sequences FOR ALL
  USING (auth.role() = 'service_role');

-- Index for cron job query: find pending emails due for sending
CREATE INDEX idx_email_sequences_pending
  ON email_sequences (scheduled_at)
  WHERE status = 'pending';

-- Profile columns for email opt-in and activity tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_opt_in BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_analysis_at TIMESTAMPTZ;
