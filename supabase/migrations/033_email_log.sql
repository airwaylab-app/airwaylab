-- Email log for all transactional and admin emails
-- Tracks delivery status via Resend webhook correlation

CREATE TABLE email_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resend_id TEXT UNIQUE,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  email_type TEXT NOT NULL,       -- 'welcome', 'cancellation', 'contact_confirmation', 'admin_contact', 'admin_feedback', 'admin_error_data', 'admin_provider_interest'
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ
);

-- RLS: service role only (no user-facing queries needed)
ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON email_log FOR ALL
  USING (auth.role() = 'service_role');

-- Index for Resend webhook lookups (match by resend_id)
CREATE INDEX idx_email_log_resend_id
  ON email_log (resend_id)
  WHERE resend_id IS NOT NULL;

-- Index for monitoring queries (recent emails by type)
CREATE INDEX idx_email_log_type_created
  ON email_log (email_type, created_at DESC);
