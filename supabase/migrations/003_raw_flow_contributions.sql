-- Raw flow contributions: opt-in storage of raw breathing waveforms.
-- Enables reprocessing with new AI models and metric recalculation
-- without requiring users to re-upload their data.
--
-- Flow data is stored as base64-encoded gzipped Float32Array buffers.
-- Each row = one night's worth of sessions from a single contribution.

CREATE TABLE IF NOT EXISTS raw_flow_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contribution_id TEXT NOT NULL,            -- Random per-submission ID (not linked to user)
  night_date TEXT NOT NULL,                 -- Night date key (YYYY-MM-DD)
  device_model TEXT,
  pap_mode TEXT,
  sampling_rate REAL NOT NULL,
  total_duration_seconds REAL NOT NULL,
  session_count INTEGER NOT NULL,
  flow_data_b64 TEXT NOT NULL,              -- Base64-encoded gzipped Float32Array
  pressure_data_b64 TEXT,                   -- Base64-encoded gzipped Float32Array (nullable)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: only service_role can insert/read
ALTER TABLE raw_flow_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON raw_flow_contributions
  FOR ALL USING (auth.role() = 'service_role');

-- Index for lookups by contribution and date
CREATE INDEX idx_raw_flow_contribution_id ON raw_flow_contributions(contribution_id);
CREATE INDEX idx_raw_flow_created ON raw_flow_contributions(created_at);
CREATE INDEX idx_raw_flow_night_date ON raw_flow_contributions(night_date);
