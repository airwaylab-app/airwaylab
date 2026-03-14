-- ============================================================
-- 023: Enhanced Contribution Schema
-- Adds new ML-relevant columns to symptom_contributions and
-- updates export RPCs to include additional engine metrics.
-- ============================================================

-- Add new columns to symptom_contributions
ALTER TABLE symptom_contributions
  ADD COLUMN IF NOT EXISTS hypopnea_index NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS amplitude_cv NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS unstable_epoch_pct SMALLINT,
  ADD COLUMN IF NOT EXISTS tidal_volume_cv NUMERIC(5,1),
  ADD COLUMN IF NOT EXISTS trigger_delay_median_ms SMALLINT,
  ADD COLUMN IF NOT EXISTS ie_ratio NUMERIC(4,2);

-- Update ML export to include new columns
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
  -- New NED features
  hypopnea_index NUMERIC,
  amplitude_cv NUMERIC,
  unstable_epoch_pct SMALLINT,
  -- New settings features
  tidal_volume_cv NUMERIC,
  trigger_delay_median_ms SMALLINT,
  ie_ratio NUMERIC,
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
    sc.hypopnea_index,
    sc.amplitude_cv,
    sc.unstable_epoch_pct,
    sc.tidal_volume_cv,
    sc.trigger_delay_median_ms,
    sc.ie_ratio,
    sc.pressure_bucket,
    sc.pap_mode,
    sc.device_model,
    sc.duration_hours,
    sc.ifl_risk
  FROM symptom_contributions sc
  WHERE sc.symptom_rating IS NOT NULL
  ORDER BY sc.created_at;
$$;

-- Update dataset stats to include new feature distributions
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
    ),
    'enriched_features', json_build_object(
      'with_hypopnea_index', (SELECT COUNT(*) FROM symptom_contributions WHERE hypopnea_index IS NOT NULL),
      'with_amplitude_cv', (SELECT COUNT(*) FROM symptom_contributions WHERE amplitude_cv IS NOT NULL),
      'with_tidal_volume_cv', (SELECT COUNT(*) FROM symptom_contributions WHERE tidal_volume_cv IS NOT NULL),
      'with_ie_ratio', (SELECT COUNT(*) FROM symptom_contributions WHERE ie_ratio IS NOT NULL)
    )
  );
$$;
