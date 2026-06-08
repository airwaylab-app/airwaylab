-- Server-enforced consent gate for anonymised research data contribution.
-- Contribution consent was previously browser-localStorage only (airwaylab_contribute_optin),
-- with no server enforcement, audit trail, or withdrawal control. The contribute-data /
-- contribute-waveforms / contribute-oximetry-trace routes now read data_contribution_consent
-- (service-role) and return 403 when it is false. Consent is granted/withdrawn via
-- /api/consent-audit (consentType='data_contribution'), which sets these columns alongside
-- the GDPR audit-trail row. Mirrors 052_ai_insights_consent. Withdrawal is future-only;
-- already-contributed anonymised rows are retained (GDPR Art 7(3)).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS data_contribution_consent    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_contribution_consent_at TIMESTAMPTZ;
