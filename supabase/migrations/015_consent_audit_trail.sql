-- Consent audit trail: records every consent grant/withdrawal for GDPR compliance.
-- Each row captures a point-in-time consent action from an authenticated user.

CREATE TABLE IF NOT EXISTS public.consent_audit (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL CHECK (consent_type IN (
    'ai_insights',
    'data_contribution',
    'cloud_storage',
    'email_notifications'
  )),
  action      text NOT NULL CHECK (action IN ('granted', 'withdrawn')),
  ip_hash     text,          -- SHA-256 of IP for audit without storing raw IP
  user_agent  text,          -- Browser user-agent string
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Index for efficient user-specific queries (DSAR requests)
CREATE INDEX IF NOT EXISTS idx_consent_audit_user_id ON public.consent_audit(user_id);

-- Index for type-based queries
CREATE INDEX IF NOT EXISTS idx_consent_audit_type ON public.consent_audit(consent_type, created_at DESC);

-- RLS: users can read their own consent history, inserts via authenticated
ALTER TABLE public.consent_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own consent history"
  ON public.consent_audit FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consent records"
  ON public.consent_audit FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies — consent audit is append-only
