-- 036: Extend feedback table for in-app widget
-- Adds user identity, contact consent, typed category, and rich context metadata.
-- All columns nullable to preserve existing rows.

ALTER TABLE public.feedback
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contact_ok boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS type text DEFAULT 'feedback',
  ADD COLUMN IF NOT EXISTS metadata jsonb;

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(type);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);

-- Allow anyone to insert feedback (no auth required for low-friction input).
-- Reading remains restricted to service_role via existing policy.
CREATE POLICY "Anyone can insert feedback"
  ON public.feedback
  FOR INSERT
  WITH CHECK (true);
