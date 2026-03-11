-- ============================================================
-- AirwayLab — Share Link Storage
-- Stores analysis results for shareable links (30-day expiry).
-- ============================================================

CREATE TABLE shared_analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_data JSONB NOT NULL,
  machine_info JSONB,
  nights_count INTEGER NOT NULL DEFAULT 1,
  share_scope TEXT NOT NULL DEFAULT 'single',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  access_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- RLS: public read (anyone with the UUID can view), write via service role
ALTER TABLE shared_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read shared analyses by ID"
  ON shared_analyses FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert shared analyses"
  ON shared_analyses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update access counts"
  ON shared_analyses FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Indexes
CREATE INDEX idx_shared_analyses_expires ON shared_analyses(expires_at);

-- Analytics view for internal querying
CREATE VIEW share_analytics AS
SELECT
  DATE_TRUNC('day', created_at) AS day,
  COUNT(*) AS shares_created,
  SUM(CASE WHEN share_scope = 'single' THEN 1 ELSE 0 END) AS single_night_shares,
  SUM(CASE WHEN share_scope = 'all' THEN 1 ELSE 0 END) AS all_nights_shares,
  AVG(nights_count) AS avg_nights_per_share,
  SUM(access_count) AS total_views,
  AVG(access_count) AS avg_views_per_share,
  COUNT(CASE WHEN access_count > 0 THEN 1 END) AS shares_actually_viewed,
  ROUND(
    COUNT(CASE WHEN access_count > 0 THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 1
  ) AS view_rate_pct
FROM shared_analyses
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY day DESC;
