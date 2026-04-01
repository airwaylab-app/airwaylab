-- AI Insights Output Log
-- Stores every AI-generated insight response for:
-- 1. MDR compliance monitoring (detect risky language patterns)
-- 2. Quality/relevancy evaluation
-- 3. Cost analysis (tokens per request)
--
-- Retention: 90 days. Cleaned by cron or manual sweep.
-- Deletion path: CASCADE from auth.users + manual DELETE WHERE created_at < now() - interval '90 days'

CREATE TABLE IF NOT EXISTS public.ai_insights_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier        text NOT NULL,
  model       text NOT NULL,
  is_deep     boolean NOT NULL DEFAULT false,
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  insight_count integer NOT NULL DEFAULT 0,
  insights    jsonb NOT NULL,
  truncated   boolean NOT NULL DEFAULT false
);

-- RLS: service role only (no user access needed)
ALTER TABLE public.ai_insights_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access ai_insights_log"
  ON public.ai_insights_log FOR ALL
  USING (auth.role() = 'service_role');

-- Index for time-based queries and cleanup
CREATE INDEX idx_ai_insights_log_created ON public.ai_insights_log(created_at DESC);
CREATE INDEX idx_ai_insights_log_user ON public.ai_insights_log(user_id, created_at DESC);

-- Cleanup function: delete entries older than 90 days
CREATE OR REPLACE FUNCTION cleanup_ai_insights_log()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.ai_insights_log
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;
