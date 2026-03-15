-- ============================================================
-- AirwayLab — Walkthrough Completed Flag
-- Tracks whether a user has completed the dashboard walkthrough
-- so it doesn't re-show across devices/sessions.
-- ============================================================

alter table public.profiles
  add column walkthrough_completed boolean not null default false;
