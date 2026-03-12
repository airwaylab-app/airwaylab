-- ============================================================
-- 020: ML Export Functions
-- RPC functions for exporting ML-ready training data from
-- anonymised symptom contributions.
-- ============================================================

-- Export ML-ready dataset: symptom ratings + engine metrics
-- Returns one row per contribution with all features flattened
CREATE OR REPLACE FUNCTION export_ml_training_data()
RETURNS TABLE (
  -- Label
  symptom_rating SMALLINT,
  -- Glasgow features
  glasgow_overall NUMERIC,
  -- WAT features
  fl_score NUMERIC,
  regularity SMALLINT,
  -- NED features
  ned_mean NUMERIC,
  rera_index NUMERIC,
  combined_fl_pct SMALLINT,
  eai NUMERIC,
  -- Metadata
  pressure_bucket TEXT,
  pap_mode TEXT,
  device_model TEXT,
  duration_hours NUMERIC,
  -- IFL risk (pre-computed composite)
  ifl_risk NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    sc.symptom_rating,
    sc.glasgow_overall,
    sc.fl_score,
    sc.regularity,
    sc.ned_mean,
    sc.rera_index,
    sc.combined_fl_pct,
    sc.eai,
    sc.pressure_bucket,
    sc.pap_mode,
    sc.device_model,
    sc.duration_hours,
    sc.ifl_risk
  FROM symptom_contributions sc
  WHERE sc.symptom_rating IS NOT NULL
  ORDER BY sc.created_at;
$$;

-- Aggregate stats for model validation and dataset overview
CREATE OR REPLACE FUNCTION ml_dataset_stats()
RETURNS JSON
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT json_build_object(
    'total_samples', (SELECT COUNT(*) FROM symptom_contributions WHERE symptom_rating IS NOT NULL),
    'rating_distribution', (
      SELECT COALESCE(json_agg(json_build_object('rating', r.symptom_rating, 'count', r.cnt)), '[]'::json)
      FROM (
        SELECT symptom_rating, COUNT(*) AS cnt
        FROM symptom_contributions
        WHERE symptom_rating IS NOT NULL
        GROUP BY symptom_rating
        ORDER BY symptom_rating
      ) r
    ),
    'pap_mode_distribution', (
      SELECT COALESCE(json_agg(json_build_object('mode', m.pap_mode, 'count', m.cnt)), '[]'::json)
      FROM (
        SELECT pap_mode, COUNT(*) AS cnt
        FROM symptom_contributions
        WHERE symptom_rating IS NOT NULL
        GROUP BY pap_mode
        ORDER BY cnt DESC
      ) m
    ),
    'device_model_distribution', (
      SELECT COALESCE(json_agg(json_build_object('model', d.device_model, 'count', d.cnt)), '[]'::json)
      FROM (
        SELECT device_model, COUNT(*) AS cnt
        FROM symptom_contributions
        WHERE symptom_rating IS NOT NULL
        GROUP BY device_model
        ORDER BY cnt DESC
      ) d
    ),
    'ifl_risk_stats', (
      SELECT json_build_object(
        'mean', ROUND(AVG(ifl_risk), 1),
        'median', ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
        'min', MIN(ifl_risk),
        'max', MAX(ifl_risk)
      )
      FROM symptom_contributions
      WHERE symptom_rating IS NOT NULL
    )
  );
$$;
