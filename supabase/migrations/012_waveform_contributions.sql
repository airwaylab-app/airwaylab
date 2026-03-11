-- ============================================================
-- AirwayLab — Waveform Contributions
-- Stores raw flow waveform data for the research dataset.
-- Waveform binary data lives in the research-waveforms bucket;
-- this table holds metadata + analysis results snapshot.
-- ============================================================

-- Metadata table
CREATE TABLE waveform_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contribution_id TEXT NOT NULL,
  night_date DATE NOT NULL,
  engine_version TEXT NOT NULL,
  sampling_rate REAL NOT NULL,
  duration_seconds REAL NOT NULL,
  sample_count INTEGER NOT NULL,
  compressed_size_bytes INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  device_model TEXT,
  pap_mode TEXT,
  analysis_results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_waveform_contrib_created ON waveform_contributions(created_at);
CREATE INDEX idx_waveform_contrib_engine ON waveform_contributions(engine_version);
CREATE INDEX idx_waveform_contrib_cid ON waveform_contributions(contribution_id);

-- RLS: service-role only (no user-facing policies)
ALTER TABLE waveform_contributions ENABLE ROW LEVEL SECURITY;

-- Storage bucket (private, service-role access only)
INSERT INTO storage.buckets (id, name, public)
VALUES ('research-waveforms', 'research-waveforms', false)
ON CONFLICT (id) DO NOTHING;
