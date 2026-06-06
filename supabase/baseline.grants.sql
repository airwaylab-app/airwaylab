-- supabase/baseline.grants.sql
-- Role GRANTs for the GATE-mode db-contract harness (G5).
--
-- supabase/baseline.sql is a STRUCTURE-ONLY dump and excludes role privileges,
-- so a fresh CI database has no anon/authenticated/service_role grants and
-- PostgREST cannot reach any table or RPC. This file restores the exact prod
-- grant picture so the PostgREST client tests exercise real permission
-- boundaries (anon vs service_role). Applied by scripts/db-replay.sh AFTER the
-- baseline + post-baseline migrations, BEFORE the contract tests.
--
-- EXTRACTED FROM PROD (project kcrdpikxbhhmhbgcayiy, 2026-06-06) via the
-- Supabase MCP. Regenerate alongside supabase/baseline.sql with:
--   table grants:    information_schema.role_table_grants  (schema=public, grantee in the 3 roles)
--   function grants:  pg_proc + aclexplode(proacl)         (EXECUTE; PUBLIC = grantee oid 0)
--
-- NOT replicated (absent from the structure-only baseline, and untouched by the
-- current tests): the share_analytics VIEW, and the serial sequences
-- ai_insights_log_id_seq / symptom_contributions_id_seq (the dump rendered those
-- id columns as bare bigint, dropping the owned sequences). Flagged as a baseline
-- gap on the G5 PR; add their grants here if/when the baseline regains them.

set search_path to public, auth, storage, extensions;

-- Schema usage (Supabase grants this to every API role).
grant usage on schema public to anon, authenticated, service_role;

-- ── Table / view privileges ────────────────────────────────────────────────
-- Supabase default: full privileges to all three API roles; RLS does the actual
-- row-level protection. Two prod exceptions are encoded below.

grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.account_deletion_requests to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.ai_insights_log to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.ai_usage to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.analysis_data to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.analysis_sessions to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.consent_audit to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.daily_usage_snapshots to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.data_contributions to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.device_diagnostics to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.discord_digest_events to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.discord_pending_roles to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.discord_role_events to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.email_log to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.email_sequences to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.error_submissions to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.feedback to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.kv_alert_dedup to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.oximetry_trace_contributions to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.premium_interest to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.provider_interest to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.remind_requests to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.signal_daily_counts to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.stripe_events to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.subscribers to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.subscription_events to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.subscriptions to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.symptom_contributions to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.unsupported_device_submissions to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.user_files to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.user_nights to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.user_storage_usage to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.waitlist to anon, authenticated, service_role;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.waveform_contributions to anon, authenticated, service_role;

-- Exception: profiles — anon/authenticated have everything EXCEPT UPDATE.
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE on table public.profiles to anon, authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.profiles to service_role;

-- Exception: shared_analyses — anon/authenticated get only REFERENCES/TRIGGER/TRUNCATE
-- (no read/write through the API; reads go via the share token path / service_role).
grant REFERENCES, TRIGGER, TRUNCATE on table public.shared_analyses to anon, authenticated;
grant DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE on table public.shared_analyses to service_role;

-- ── Function EXECUTE privileges ─────────────────────────────────────────────
-- Prod locks these RPCs down: EXECUTE revoked from PUBLIC, granted to specific
-- roles. A freshly-created function defaults to EXECUTE for PUBLIC, so without
-- the REVOKEs anon could call service-only RPCs (e.g. claim_stripe_event) and
-- the anon-vs-service_role permission test would not hold.

revoke execute on function public.claim_stripe_event(p_event_id text, p_attempts integer, p_stale_cutoff timestamp with time zone) from public;
grant execute on function public.claim_stripe_event(p_event_id text, p_attempts integer, p_stale_cutoff timestamp with time zone) to service_role;
revoke execute on function public.cleanup_ai_insights_log() from public;
grant execute on function public.cleanup_ai_insights_log() to service_role;
revoke execute on function public.cleanup_expired_shared_analyses() from public;
grant execute on function public.cleanup_expired_shared_analyses() to service_role;
revoke execute on function public.cleanup_old_analysis_sessions() from public;
grant execute on function public.cleanup_old_analysis_sessions() to service_role;
revoke execute on function public.export_ml_training_data() from public;
grant execute on function public.export_ml_training_data() to service_role;
revoke execute on function public.get_community_benchmarks() from public;
grant execute on function public.get_community_benchmarks() to service_role;
revoke execute on function public.get_community_symptom_stats(p_ifl_risk numeric, p_pressure_bucket text) from public;
grant execute on function public.get_community_symptom_stats(p_ifl_risk numeric, p_pressure_bucket text) to service_role;
revoke execute on function public.get_extended_stats() from public;
grant execute on function public.get_extended_stats() to service_role;
revoke execute on function public.get_latest_usage_snapshot() from public;
grant execute on function public.get_latest_usage_snapshot() to service_role;
revoke execute on function public.get_monthly_ai_token_usage(p_month text) from public;
grant execute on function public.get_monthly_ai_token_usage(p_month text) to service_role;
revoke execute on function public.get_storage_stats() from public;
grant execute on function public.get_storage_stats() to service_role;
revoke execute on function public.get_symptom_aggregate_stats() from public;
grant execute on function public.get_symptom_aggregate_stats() to service_role;
revoke execute on function public.increment_ai_usage(p_user_id uuid, p_month text, p_input_tokens bigint, p_output_tokens bigint) from public;
grant execute on function public.increment_ai_usage(p_user_id uuid, p_month text, p_input_tokens bigint, p_output_tokens bigint) to service_role;
revoke execute on function public.increment_signal_count(p_signal_type text, p_signal_name text) from public;
grant execute on function public.increment_signal_count(p_signal_type text, p_signal_name text) to service_role;
revoke execute on function public.ml_dataset_stats() from public;
grant execute on function public.ml_dataset_stats() to service_role;
grant execute on function public.run_db_integrity_checks() to service_role;
grant execute on function public.handle_new_user() to anon, authenticated, service_role;
grant execute on function public.rls_auto_enable() to anon, authenticated, service_role;
grant execute on function public.update_storage_usage() to anon, authenticated, service_role;
grant execute on function public.update_symptom_contributions_updated_at() to anon, authenticated, service_role;
grant execute on function public.update_updated_at() to anon, authenticated, service_role;

