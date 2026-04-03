-- 038: Add processing tracking columns to feedback table
-- Enables automated feedback processing pipeline (AIR-52).
-- processed: whether this feedback entry has been picked up by the processor
-- processed_at: when it was processed (null until then)

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS processed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

-- Index for the processing pipeline to efficiently find unprocessed rows
CREATE INDEX IF NOT EXISTS idx_feedback_processed
  ON public.feedback(processed)
  WHERE processed = false;
