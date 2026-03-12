-- Migration 017: Analysis data table for AI insights pipeline
-- Stores aggregate analysis scores per night per user.
-- Per-breath summaries are stored as JSON files in Supabase Storage (hybrid approach).

CREATE TABLE analysis_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  night_date DATE NOT NULL,
  -- Aggregate scores
  glasgow_overall REAL,
  fl_score REAL,
  ned_mean REAL,
  rera_index REAL,
  eai REAL,
  duration_hours REAL,
  session_count INTEGER,
  -- Machine settings snapshot
  settings JSONB,
  -- Per-breath storage reference (Supabase Storage path)
  per_breath_storage_path TEXT,
  -- Metadata
  engine_version TEXT NOT NULL DEFAULT '1.0.0',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id, night_date)
);

ALTER TABLE analysis_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own analysis data"
  ON analysis_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own analysis data"
  ON analysis_data FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access on analysis data"
  ON analysis_data FOR ALL
  USING ((SELECT auth.role()) = 'service_role');

CREATE INDEX idx_analysis_data_user ON analysis_data(user_id);
CREATE INDEX idx_analysis_data_user_date ON analysis_data(user_id, night_date);
