-- ============================================================
-- 058: Revoke EXECUTE on remaining SECURITY DEFINER RPCs (S2)
--
-- Follow-up to #919 (migration 055), which revoked the two ML-export
-- SECURITY DEFINER functions (export_ml_training_data / ml_dataset_stats).
-- This migration locks down the REMAINING SECURITY DEFINER functions that
-- are still PUBLIC-executable.
--
-- WHY: function EXECUTE defaults to PUBLIC. A SECURITY DEFINER function runs
-- with the *owner's* privileges and bypasses RLS, so any role that can EXECUTE
-- it (incl. anon via PostgREST RPC, since the anon key ships in the client
-- bundle) can read/aggregate data the caller should not see. Each function
-- below is only ever invoked server-side through a service-role client
-- (getSupabaseAdmin / getSupabaseServiceRole), verified caller-by-caller, so
-- restricting EXECUTE to service_role does not change app behaviour.
--
-- IMPORTANT: REVOKE must include PUBLIC. Revoking only anon/authenticated
-- leaves the function executable via the implicit PUBLIC grant.
--
-- REVOKED (caller -> client, all confirmed service-role):
--   get_extended_stats()                 app/api/stats               getSupabaseAdmin
--   cleanup_expired_shared_analyses()    app/api/cron/cleanup        getSupabaseAdmin
--   cleanup_old_analysis_sessions()      app/api/cron/cleanup        getSupabaseAdmin
--   get_storage_stats()                  lib/monitoring (cron/monitor) getSupabaseAdmin
--   get_community_symptom_stats(numeric,text) app/api/community-insights getSupabaseServiceRole
--   get_symptom_aggregate_stats()        app/api/ai-insights         getSupabaseServiceRole
--   get_community_benchmarks()           app/api/community-benchmarks getSupabaseServiceRole
--   get_latest_usage_snapshot()          (no app caller; ops-only)   n/a -> service_role
--   get_monthly_ai_token_usage(text)     lib/monitoring (cron/monitor) getSupabaseAdmin
--   cleanup_ai_insights_log()            app/api/cron/ai-monitor     getSupabaseAdmin
--   increment_ai_usage(uuid,text)        (legacy 009 sig; no caller — revoked defensively)
--   increment_ai_usage(uuid,text,bigint,bigint) app/api/ai-insights  getSupabaseServiceRole
--
-- INTENTIONALLY SKIPPED:
--   export_ml_training_data(), ml_dataset_stats()
--       — already revoked by #919 (migration 055).
--   run_db_integrity_checks()
--       — already hardened in migration 048 (out of scope for this PR).
--         NOTE: 048 revoked only anon/authenticated, NOT PUBLIC, so it is still
--         PUBLIC-executable. Flagged for a follow-up; not changed here to keep
--         this PR scoped to the previously-untouched functions.
--   increment_signal_count()
--       — not on main yet (lands with PR #872); revoke it in that PR.
--
-- NOTE: this migration is NOT runnable locally. It must be applied via the
-- Supabase SQL Editor (or migration pipeline) before / at merge. After
-- applying, re-test that the stats / community / benchmarks / cron routes
-- still return data (they use the service role) and that an anon PostgREST
-- RPC call to each function is now rejected.
-- ============================================================

-- get_extended_stats()  [013] — public stats counters
REVOKE EXECUTE ON FUNCTION public.get_extended_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_extended_stats() TO service_role;

-- cleanup_expired_shared_analyses()  [014, redefined 018] — cron cleanup
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_shared_analyses() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_shared_analyses() TO service_role;

-- cleanup_old_analysis_sessions()  [014] — cron cleanup
REVOKE EXECUTE ON FUNCTION public.cleanup_old_analysis_sessions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_analysis_sessions() TO service_role;

-- get_storage_stats()  [014] — ops monitoring
REVOKE EXECUTE ON FUNCTION public.get_storage_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_storage_stats() TO service_role;

-- get_community_symptom_stats(numeric, text)  [016] — community comparison
REVOKE EXECUTE ON FUNCTION public.get_community_symptom_stats(numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_symptom_stats(numeric, text) TO service_role;

-- get_symptom_aggregate_stats()  [016] — AI prompt enrichment
REVOKE EXECUTE ON FUNCTION public.get_symptom_aggregate_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_symptom_aggregate_stats() TO service_role;

-- get_community_benchmarks()  [026] — population percentiles
REVOKE EXECUTE ON FUNCTION public.get_community_benchmarks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_benchmarks() TO service_role;

-- get_latest_usage_snapshot()  [031] — ops dashboard / orchestrator
REVOKE EXECUTE ON FUNCTION public.get_latest_usage_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_latest_usage_snapshot() TO service_role;

-- get_monthly_ai_token_usage(text)  [031] — ops monitoring
REVOKE EXECUTE ON FUNCTION public.get_monthly_ai_token_usage(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_ai_token_usage(text) TO service_role;

-- cleanup_ai_insights_log()  [037] — cron cleanup
REVOKE EXECUTE ON FUNCTION public.cleanup_ai_insights_log() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_ai_insights_log() TO service_role;

-- increment_ai_usage(...)  [009 + 031] — two signatures coexist because the
-- 031 redefinition added args (CREATE OR REPLACE only replaces an identical
-- arg list). Lock both: the 2-arg legacy form (no current caller) and the
-- 4-arg form used by app/api/ai-insights.
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text, bigint, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ai_usage(uuid, text, bigint, bigint) TO service_role;
