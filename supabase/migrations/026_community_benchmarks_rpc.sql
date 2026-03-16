-- ============================================================
-- AirwayLab — Community Benchmarks RPC
-- Returns aggregate percentile data for key metrics.
-- Used by /api/community-benchmarks (1-hour cached).
-- No user data exposed — only population-level statistics.
-- ============================================================

CREATE OR REPLACE FUNCTION get_community_benchmarks()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'sample_size', (SELECT COUNT(*) FROM symptom_contributions WHERE ifl_risk IS NOT NULL),
    -- IFL Risk percentiles
    'ifl_risk_p10', ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
    'ifl_risk_p25', ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
    'ifl_risk_p50', ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
    'ifl_risk_p75', ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
    'ifl_risk_p90', ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
    -- Glasgow percentiles
    'glasgow_p10', ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY glasgow_overall)::NUMERIC, 2),
    'glasgow_p25', ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY glasgow_overall)::NUMERIC, 2),
    'glasgow_p50', ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY glasgow_overall)::NUMERIC, 2),
    'glasgow_p75', ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY glasgow_overall)::NUMERIC, 2),
    'glasgow_p90', ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY glasgow_overall)::NUMERIC, 2),
    -- FL Score percentiles
    'fl_score_p10', ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY fl_score)::NUMERIC, 1),
    'fl_score_p25', ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY fl_score)::NUMERIC, 1),
    'fl_score_p50', ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY fl_score)::NUMERIC, 1),
    'fl_score_p75', ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fl_score)::NUMERIC, 1),
    'fl_score_p90', ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY fl_score)::NUMERIC, 1),
    -- RERA Index percentiles
    'rera_index_p10', ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY rera_index)::NUMERIC, 1),
    'rera_index_p25', ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY rera_index)::NUMERIC, 1),
    'rera_index_p50', ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rera_index)::NUMERIC, 1),
    'rera_index_p75', ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY rera_index)::NUMERIC, 1),
    'rera_index_p90', ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY rera_index)::NUMERIC, 1)
  )
  FROM symptom_contributions
  WHERE ifl_risk IS NOT NULL;
$$;
