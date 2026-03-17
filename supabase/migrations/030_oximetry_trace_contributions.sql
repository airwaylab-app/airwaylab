-- ============================================================
-- 030: Oximetry Trace Contributions
-- Stores raw SpO2/HR timeseries for the research dataset.
-- Binary trace data lives in the research-oximetry bucket;
-- this table holds metadata + oximetry summary snapshot.
-- ============================================================

-- Metadata table
CREATE TABLE IF NOT EXISTS oximetry_trace_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contribution_id TEXT NOT NULL,
  night_date DATE NOT NULL,
  engine_version TEXT NOT NULL,
  sample_count INTEGER NOT NULL,
  duration_seconds REAL NOT NULL,
  compressed_size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  device_model TEXT,
  pap_mode TEXT,
  oximetry_source TEXT,          -- 'csv' or 'sa2'
  oximetry_results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_oxtrace_contrib_created ON oximetry_trace_contributions(created_at);
CREATE INDEX idx_oxtrace_contrib_engine ON oximetry_trace_contributions(engine_version);
CREATE INDEX idx_oxtrace_contrib_cid ON oximetry_trace_contributions(contribution_id);

-- RLS: service-role only (no user-facing policies)
ALTER TABLE oximetry_trace_contributions ENABLE ROW LEVEL SECURITY;

-- Storage bucket (private, service-role access only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('research-oximetry', 'research-oximetry', false)
ON CONFLICT (id) DO NOTHING;
