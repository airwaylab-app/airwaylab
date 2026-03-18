-- ============================================================
-- AirwayLab — Multi-Service Usage Monitoring
-- Extends monitoring with daily snapshots and AI token tracking.
-- ============================================================

-- 1. Add token tracking columns to ai_usage
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS input_tokens bigint NOT NULL DEFAULT 0;
ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS output_tokens bigint NOT NULL DEFAULT 0;

-- 2. Update increment_ai_usage RPC to accept and accumulate tokens
CREATE OR REPLACE FUNCTION increment_ai_usage(
  p_user_id uuid,
  p_month text,
  p_input_tokens bigint DEFAULT 0,
  p_output_tokens bigint DEFAULT 0
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO ai_usage (user_id, month, count, input_tokens, output_tokens)
  VALUES (p_user_id, p_month, 1, p_input_tokens, p_output_tokens)
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    count = ai_usage.count + 1,
    input_tokens = ai_usage.input_tokens + p_input_tokens,
    output_tokens = ai_usage.output_tokens + p_output_tokens;
END;
$$;

-- 3. Daily usage snapshots table
CREATE TABLE IF NOT EXISTS daily_usage_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL UNIQUE,
  metrics jsonb NOT NULL,
  critical_alerts jsonb NOT NULL DEFAULT '[]'::jsonb,
  alerts_sent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE daily_usage_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access daily_usage_snapshots"
  ON daily_usage_snapshots FOR ALL
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_usage_snapshots_date
  ON daily_usage_snapshots(snapshot_date DESC);

-- 4. RPC to get latest snapshot (for morning orchestrator / ops dashboard)
CREATE OR REPLACE FUNCTION get_latest_usage_snapshot()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(s) INTO result
  FROM daily_usage_snapshots s
  ORDER BY snapshot_date DESC
  LIMIT 1;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- 5. Aggregate Anthropic token usage for a given month
CREATE OR REPLACE FUNCTION get_monthly_ai_token_usage(p_month text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_calls', COALESCE(SUM(count), 0),
    'total_input_tokens', COALESCE(SUM(input_tokens), 0),
    'total_output_tokens', COALESCE(SUM(output_tokens), 0)
  ) INTO result
  FROM ai_usage
  WHERE month = p_month;
  RETURN COALESCE(result, '{"total_calls":0,"total_input_tokens":0,"total_output_tokens":0}'::jsonb);
END;
$$;
