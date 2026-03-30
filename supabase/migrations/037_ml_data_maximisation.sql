-- Phase 1: Auth-required contribution foundation
-- Adds user_id to contribution tables, contribution_consent to profiles,
-- and indexes for user-based queries.

-- Add user_id to existing contribution tables (nullable for legacy anonymous data)
ALTER TABLE data_contributions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE symptom_contributions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE waveform_contributions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE oximetry_trace_contributions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Add contribution_consent to profiles (default TRUE, backfill all existing users)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contribution_consent BOOLEAN DEFAULT TRUE;
UPDATE profiles SET contribution_consent = TRUE WHERE contribution_consent IS NULL;

-- Add engine_version to symptom_contributions (needed for ML dataset versioning)
ALTER TABLE symptom_contributions ADD COLUMN IF NOT EXISTS engine_version TEXT;

-- Add night_date to symptom_contributions (needed for user-based dedup)
ALTER TABLE symptom_contributions ADD COLUMN IF NOT EXISTS night_date DATE;

-- Indexes for user-based queries
CREATE INDEX IF NOT EXISTS idx_data_contributions_user ON data_contributions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_symptom_contributions_user ON symptom_contributions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_waveform_contributions_user ON waveform_contributions(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_oxtrace_contributions_user ON oximetry_trace_contributions(user_id) WHERE user_id IS NOT NULL;

-- Unique constraint for user-based dedup on symptom_contributions
-- (user_id + night_date replaces IP-based dedup_hash for authenticated users)
CREATE UNIQUE INDEX IF NOT EXISTS idx_symptom_contributions_user_night
  ON symptom_contributions(user_id, night_date)
  WHERE user_id IS NOT NULL AND night_date IS NOT NULL;
