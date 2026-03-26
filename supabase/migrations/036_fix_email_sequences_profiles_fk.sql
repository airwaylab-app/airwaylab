-- Fix: email_sequences.user_id has FK to auth.users but NOT to profiles.
-- PostgREST cannot resolve the join `profiles!inner(email, email_opt_in)`
-- without a direct FK path, causing getPendingEmails() to silently return [].
-- This broke ALL cron-processed email sequences (activation, dormancy,
-- premium_onboarding, post_upload steps 2-3).
--
-- Since profiles.id is the same as auth.users.id (shared PK), this FK is safe.

ALTER TABLE public.email_sequences
  ADD CONSTRAINT email_sequences_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
