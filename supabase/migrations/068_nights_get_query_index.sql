-- Explicit DESC index for GET /api/nights ORDER BY night_date DESC.
-- The unique constraint on (user_id, night_date) is ascending; adding a
-- dedicated DESC index ensures the query planner avoids a post-filter sort
-- step when fetching a user's nights in reverse chronological order.
create index if not exists idx_user_nights_user_night_desc
  on public.user_nights (user_id, night_date desc);
