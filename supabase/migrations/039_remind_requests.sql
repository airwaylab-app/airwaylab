-- 039: remind_requests table for mobile-to-desktop reminder emails (AIR-136)
--
-- Stores opt-in email capture from mobile users who cannot upload on mobile.
-- Sends a one-time reminder email pointing them back to airwaylab.app/analyze.
--
-- Privacy / DSAR deletion path:
--   DELETE FROM public.remind_requests WHERE email = '<user-email>';
--   This removes all personal data for that address within the 30-day DSAR window.
--
-- Retention: rows are kept indefinitely for delivery tracking.
--   To purge reminded + unsubscribed rows, run:
--   DELETE FROM public.remind_requests
--     WHERE reminded_at IS NOT NULL AND unsubscribed_at IS NOT NULL
--     AND reminded_at < now() - interval '90 days';

CREATE TABLE IF NOT EXISTS public.remind_requests (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email             text        NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  reminded_at       timestamptz,
  unsubscribed_at   timestamptz,
  unsubscribe_token text        UNIQUE NOT NULL DEFAULT gen_random_uuid()::text
);

-- Index for delivery pipeline: find unreminded, non-unsubscribed rows efficiently
CREATE INDEX IF NOT EXISTS idx_remind_requests_pending
  ON public.remind_requests(created_at)
  WHERE reminded_at IS NULL AND unsubscribed_at IS NULL;

-- Index for unsubscribe lookups
CREATE INDEX IF NOT EXISTS idx_remind_requests_unsubscribe_token
  ON public.remind_requests(unsubscribe_token);

-- RLS: enabled with no policies.
-- Table is accessed exclusively via the service role client, which bypasses RLS.
-- This blocks all anon and auth client access as required by project conventions.
ALTER TABLE public.remind_requests ENABLE ROW LEVEL SECURITY;
