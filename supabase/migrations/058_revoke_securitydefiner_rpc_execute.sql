-- ============================================================
-- 058: Revoke EXECUTE on remaining SECURITY DEFINER RPCs (S2)
--
-- Follow-up to #919 (055). Restricts EXECUTE on the remaining
-- PUBLIC-executable SECURITY DEFINER functions to service_role.
-- Every listed function is only ever called server-side via a
-- service-role client (verified caller-by-caller in the PR), so
-- this does not change app behaviour.
--
-- REVOKE must include PUBLIC: EXECUTE defaults to PUBLIC, so
-- revoking only anon/authenticated leaves the implicit PUBLIC grant.
--
-- Implemented as a DO loop over the overloads that ACTUALLY EXIST.
-- Some signatures named in migration history are not deployed in
-- prod (e.g. the 2-arg legacy increment_ai_usage(uuid,text) from
-- 009), so a hardcoded REVOKE on them fails with 42883. The loop
-- revokes whichever overloads exist -> replay-safe on prod and on
-- a fresh DB.
--
-- Skipped: export_ml_training_data / ml_dataset_stats (done in 055);
-- run_db_integrity_checks (048; still PUBLIC -> separate follow-up);
-- increment_signal_count (lands with #872).
-- ============================================================

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any(array[
        'get_extended_stats','cleanup_expired_shared_analyses','cleanup_old_analysis_sessions',
        'get_storage_stats','get_community_symptom_stats','get_symptom_aggregate_stats',
        'get_community_benchmarks','get_latest_usage_snapshot','get_monthly_ai_token_usage',
        'cleanup_ai_insights_log','increment_ai_usage'])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;
