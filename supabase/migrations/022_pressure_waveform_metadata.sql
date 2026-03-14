-- ============================================================
-- 022: Pressure Waveform Metadata
-- Adds channel count, format version, and pressure flag to
-- waveform_contributions for AWL2 binary format support.
-- ============================================================

ALTER TABLE waveform_contributions
  ADD COLUMN IF NOT EXISTS channel_count SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS format_version SMALLINT NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS has_pressure BOOLEAN NOT NULL DEFAULT FALSE;
