-- ============================================================
-- 052: Contribution user_id
-- Binds research contributions to the authenticated user that
-- submitted them. The contribution endpoints now require auth
-- (no more anonymous same-origin writes), so every new row can
-- record who contributed it.
--
-- Nullable + ON DELETE SET NULL: historical/anonymised rows pre-
-- dating this change have no user, and contributions are retained
-- for the research dataset even after a user deletes their account.
-- ============================================================

ALTER TABLE public.data_contributions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.waveform_contributions
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_data_contrib_user ON public.data_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_waveform_contrib_user ON public.waveform_contributions(user_id);
