-- 041: Add optimised index for consent-filtered feedback processor query
-- The feedback processor queries: contact_ok=true, email IS NOT NULL, processed_at IS NULL
-- Partial index covers only rows eligible for processing, keeping it small.

CREATE INDEX IF NOT EXISTS idx_feedback_contactable_unprocessed
  ON public.feedback(created_at)
  WHERE contact_ok = true AND email IS NOT NULL AND processed_at IS NULL;
