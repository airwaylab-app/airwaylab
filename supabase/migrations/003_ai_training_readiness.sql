-- ============================================================
-- AirwayLab — AI Training Readiness Migration
-- Adds schema versioning, outcome labels, longitudinal linking,
-- therapy change metadata, and insight feedback tracking.
-- ============================================================

-- 1. Add new columns to data_contributions for AI training
--    All columns are nullable to maintain backward compatibility
--    with existing data.

-- Schema version: tracks which anonymisation schema produced the data
ALTER TABLE public.data_contributions
  ADD COLUMN IF NOT EXISTS schema_version int DEFAULT 1;

-- Sleep quality: user-reported outcome label (1–5 scale)
ALTER TABLE public.data_contributions
  ADD COLUMN IF NOT EXISTS sleep_quality smallint;

-- Therapy change: before/after settings metadata for causal inference
ALTER TABLE public.data_contributions
  ADD COLUMN IF NOT EXISTS therapy_change jsonb;

-- Anonymous token: stable per-browser identifier for longitudinal linking
-- Not traceable to any user identity — purely random hex generated client-side
ALTER TABLE public.data_contributions
  ADD COLUMN IF NOT EXISTS anonymous_token text;

-- Per-breath summary arrays: compact breath-level metrics for pattern discovery
ALTER TABLE public.data_contributions
  ADD COLUMN IF NOT EXISTS breath_summaries jsonb;

-- Index on anonymous_token for longitudinal queries
CREATE INDEX IF NOT EXISTS idx_contributions_anonymous_token
  ON public.data_contributions (anonymous_token)
  WHERE anonymous_token IS NOT NULL;

-- Index on schema_version for filtering by data completeness
CREATE INDEX IF NOT EXISTS idx_contributions_schema_version
  ON public.data_contributions (schema_version);


-- 2. Insight feedback table: tracks which insights users find helpful
--    Enables RLHF-style feedback loop for AI insight quality tuning.

CREATE TABLE IF NOT EXISTS public.insight_feedback (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id  text NOT NULL,               -- matches Insight.id (e.g. 'glasgow-good', 'ai-xyz')
  rating      text NOT NULL,               -- 'helpful' | 'not_helpful'
  source      text NOT NULL,               -- 'rule' | 'ai' (rule-based vs Claude-generated)
  category    text NOT NULL,               -- 'glasgow' | 'wat' | 'ned' | 'oximetry' | 'therapy' | 'trend'
  insight_title text,                      -- human-readable title for analysis
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for aggregating feedback by insight
CREATE INDEX IF NOT EXISTS idx_insight_feedback_insight_id
  ON public.insight_feedback (insight_id);

-- Index for filtering by source (rule vs ai)
CREATE INDEX IF NOT EXISTS idx_insight_feedback_source
  ON public.insight_feedback (source);

-- RLS: Only service_role can read/write
ALTER TABLE public.insight_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON public.insight_feedback
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
