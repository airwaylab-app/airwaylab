-- ============================================================
-- AirwayLab — Provider Interest Form Storage
-- Captures interest from sleep consultants and clinicians.
-- ============================================================

CREATE TABLE provider_interest (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  practice_type TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE provider_interest ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert provider interest"
  ON provider_interest FOR INSERT
  WITH CHECK (true);
