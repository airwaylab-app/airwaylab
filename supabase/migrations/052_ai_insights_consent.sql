-- R-B consent gate for AI insights.
-- AI insights send PHI (night/therapy data) to Anthropic. The user must explicitly
-- consent before any analysis data leaves their device. The ai-insights route reads
-- ai_insights_consent (service-role) and returns 403 when it is false. Consent is
-- granted via /api/consent-audit (consentType='ai_insights', action='granted'), which
-- sets these columns alongside the GDPR audit-trail row.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_insights_consent    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_insights_consent_at TIMESTAMPTZ;
