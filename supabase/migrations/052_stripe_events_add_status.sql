-- ============================================================
-- Migration 052: Add status column to stripe_events
-- Adds the missing status column that production code references.
-- Default 'processed' preserves backward compat with existing
-- inserts that only pass event_id and event_type.
-- ============================================================

ALTER TABLE public.stripe_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'processed';

CREATE INDEX IF NOT EXISTS idx_stripe_events_status
  ON public.stripe_events (status);
