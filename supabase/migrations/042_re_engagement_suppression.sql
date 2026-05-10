-- Add re-engagement suppression to profiles.
-- Set after the Day 30 re-engagement email sends to prevent further sends.
-- Cleared when the user uploads new data, resetting the sequence eligibility.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS re_engagement_suppressed_at TIMESTAMPTZ;
