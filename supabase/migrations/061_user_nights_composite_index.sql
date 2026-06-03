-- Migration 061: Add composite index on user_nights(user_id, night_date DESC)
-- Fixes AIR-2241: GET /api/nights query was doing an index scan on user_id + separate
-- sort on night_date, causing statement timeouts for users with large night histories.
-- The composite index covers the ORDER BY night_date DESC case without a sort step,
-- and also speeds up `since` range queries.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_nights_user_date
  ON public.user_nights (user_id, night_date DESC);
