-- 041: Partial index for consent-filtered feedback processing query
-- Supports the consent-aware processor query:
--   WHERE processed = false AND contact_ok = true AND email IS NOT NULL
-- Replaces idx_feedback_processed (which ignored consent) for this path.

CREATE INDEX IF NOT EXISTS idx_feedback_unprocessed_consented
  ON public.feedback(created_at ASC)
  WHERE processed = false
    AND contact_ok = true
    AND email IS NOT NULL;
