-- ============================================================
-- 016: Symptom Contributions
-- Stores anonymised symptom self-report ratings alongside
-- flow limitation metrics for community comparison.
-- ============================================================

-- Table
CREATE TABLE IF NOT EXISTS symptom_contributions (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  dedup_hash    TEXT NOT NULL UNIQUE,
  symptom_rating SMALLINT NOT NULL CHECK (symptom_rating BETWEEN 1 AND 5),
  ifl_risk      NUMERIC(5,1) NOT NULL,
  glasgow_overall NUMERIC(4,2) NOT NULL,
  fl_score      NUMERIC(5,1) NOT NULL,
  ned_mean      NUMERIC(5,1) NOT NULL,
  regularity    SMALLINT NOT NULL,
  eai           NUMERIC(5,1) NOT NULL,
  rera_index    NUMERIC(5,1) NOT NULL,
  combined_fl_pct SMALLINT NOT NULL,
  pressure_bucket TEXT NOT NULL,
  pap_mode      TEXT NOT NULL,
  device_model  TEXT NOT NULL,
  duration_hours NUMERIC(4,2) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for IFL Risk range queries
CREATE INDEX IF NOT EXISTS idx_symptom_contributions_ifl_risk
  ON symptom_contributions (ifl_risk);

-- Index for pressure bucket filtering
CREATE INDEX IF NOT EXISTS idx_symptom_contributions_pressure_bucket
  ON symptom_contributions (pressure_bucket);

-- RLS: no direct user access — service role only
ALTER TABLE symptom_contributions ENABLE ROW LEVEL SECURITY;

-- No public policies — all access is via service role client
-- (the API routes use getSupabaseServiceRole which bypasses RLS)

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_symptom_contributions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_symptom_contributions_updated_at
  BEFORE UPDATE ON symptom_contributions
  FOR EACH ROW
  EXECUTE FUNCTION update_symptom_contributions_updated_at();

-- ============================================================
-- RPC: get_community_symptom_stats
-- Returns aggregate stats for community comparison card.
-- ============================================================
CREATE OR REPLACE FUNCTION get_community_symptom_stats(
  p_ifl_risk NUMERIC,
  p_pressure_bucket TEXT
)
RETURNS TABLE (
  total_ratings BIGINT,
  avg_rating NUMERIC,
  same_bucket_avg_rating NUMERIC,
  same_bucket_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total BIGINT;
  v_avg NUMERIC;
  v_bucket_avg NUMERIC;
  v_bucket_count BIGINT;
  v_ifl_low NUMERIC;
  v_ifl_high NUMERIC;
BEGIN
  -- Overall stats
  SELECT COUNT(*), AVG(symptom_rating)
  INTO v_total, v_avg
  FROM symptom_contributions;

  -- IFL Risk bucket: +/- 10 from input
  v_ifl_low := GREATEST(0, p_ifl_risk - 10);
  v_ifl_high := LEAST(100, p_ifl_risk + 10);

  SELECT AVG(symptom_rating), COUNT(*)
  INTO v_bucket_avg, v_bucket_count
  FROM symptom_contributions
  WHERE ifl_risk BETWEEN v_ifl_low AND v_ifl_high;

  RETURN QUERY SELECT v_total, v_avg, v_bucket_avg, v_bucket_count;
END;
$$;

-- ============================================================
-- RPC: get_symptom_aggregate_stats
-- Returns high-level aggregate stats for AI prompt enrichment.
-- ============================================================
CREATE OR REPLACE FUNCTION get_symptom_aggregate_stats()
RETURNS TABLE (
  total_ratings BIGINT,
  avg_rating NUMERIC,
  high_ifl_poor_pct NUMERIC,
  low_ifl_good_pct NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total BIGINT;
  v_avg NUMERIC;
  v_high_ifl_total BIGINT;
  v_high_ifl_poor BIGINT;
  v_low_ifl_total BIGINT;
  v_low_ifl_good BIGINT;
  v_high_ifl_poor_pct NUMERIC;
  v_low_ifl_good_pct NUMERIC;
BEGIN
  SELECT COUNT(*), AVG(symptom_rating)
  INTO v_total, v_avg
  FROM symptom_contributions;

  -- High IFL (>45) who rated poorly (1-2)
  SELECT COUNT(*) INTO v_high_ifl_total
  FROM symptom_contributions WHERE ifl_risk > 45;

  SELECT COUNT(*) INTO v_high_ifl_poor
  FROM symptom_contributions WHERE ifl_risk > 45 AND symptom_rating <= 2;

  v_high_ifl_poor_pct := CASE
    WHEN v_high_ifl_total > 0 THEN ROUND(v_high_ifl_poor * 100.0 / v_high_ifl_total, 1)
    ELSE 0
  END;

  -- Low IFL (<20) who rated well (4-5)
  SELECT COUNT(*) INTO v_low_ifl_total
  FROM symptom_contributions WHERE ifl_risk < 20;

  SELECT COUNT(*) INTO v_low_ifl_good
  FROM symptom_contributions WHERE ifl_risk < 20 AND symptom_rating >= 4;

  v_low_ifl_good_pct := CASE
    WHEN v_low_ifl_total > 0 THEN ROUND(v_low_ifl_good * 100.0 / v_low_ifl_total, 1)
    ELSE 0
  END;

  RETURN QUERY SELECT v_total, v_avg, v_high_ifl_poor_pct, v_low_ifl_good_pct;
END;
$$;
