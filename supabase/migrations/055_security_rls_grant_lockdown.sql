-- ============================================================
-- 050: Security RLS + grant lockdown (P0 fixes)
-- Closes pre-existing exposures found in the 2026-06-02 dual-model audit.
-- All four objects below are accessed by the app ONLY via the service role
-- (server routes / crons / the /shared/[id] page use getSupabaseServiceRole /
-- getSupabaseAdmin, which bypasses RLS and column grants), EXCEPT the single
-- legitimate browser write of profiles.walkthrough_completed (auth-context.tsx).
--
--   M1-1 profiles      : an authenticated user could UPDATE their own row,
--                        including `tier` -> free paid-tier bypass.
--   M1-5 user_nights   : UPDATE policy had no WITH CHECK -> a user could
--                        re-home a night row to another user_id / tamper data.
--   M1-2 shared_analyses: SELECT policy USING(true) -> anon (public anon key
--                        ships in the client bundle) could read ALL shared PHI.
--   M1-3 ml-export RPCs : export_ml_training_data()/ml_dataset_stats() are
--                        SECURITY DEFINER with no REVOKE -> anon could dump the
--                        proprietary research dataset via PostgREST RPC.
--
-- NOTE: this migration must be applied to a preview/staging DB and the four
-- exploits re-tested (anon UPDATE tier, anon SELECT shared_analyses, anon RPC
-- export, cross-user user_nights UPDATE) before promotion to production.
-- ============================================================

-- ----- M1-1: profiles -----------------------------------------------------
-- Lock every column for end users except walkthrough_completed (the only
-- column the browser client legitimately writes, via auth-context.tsx). tier,
-- stripe_customer_id, discord_id, email_opt_in, consent flags etc. become
-- service-role-only (all app writes to them already use the service role).
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (walkthrough_completed) ON public.profiles TO authenticated;

-- Add WITH CHECK so the post-update row must still belong to the caller.
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ----- M1-5: user_nights --------------------------------------------------
-- Original UPDATE policy had USING but no WITH CHECK, so a user could set
-- user_id to another account (Postgres validates only the OLD row without
-- WITH CHECK). Add WITH CHECK to pin ownership of the new row too.
DROP POLICY IF EXISTS "Users update own nights" ON public.user_nights;
CREATE POLICY "Users update own nights"
  ON public.user_nights FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----- M1-2: shared_analyses ----------------------------------------------
-- All reads/writes go through the service role (the public /shared/[id] page
-- renders server-side via getSupabaseAdmin). Remove the USING(true) SELECT
-- policy and revoke direct anon/authenticated table access entirely.
DROP POLICY IF EXISTS "Anyone can read shared analyses by ID" ON public.shared_analyses;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.shared_analyses FROM anon, authenticated;

-- ----- M1-3: ml-export RPCs -----------------------------------------------
-- The proprietary research dataset must be service-role only. The admin
-- export route (app/api/admin/ml-export) already calls these via the service
-- role behind an ADMIN_API_KEY check, so revoking is safe.
-- NOTE: function EXECUTE defaults to PUBLIC, so REVOKE must include PUBLIC —
-- revoking only anon/authenticated leaves them executable via the PUBLIC grant.
REVOKE EXECUTE ON FUNCTION public.export_ml_training_data() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ml_dataset_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.export_ml_training_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.ml_dataset_stats() TO service_role;
