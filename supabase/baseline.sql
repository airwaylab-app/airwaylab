-- AirwayLab schema baseline (public + storage), extracted from prod via the
-- Supabase MCP on 2026-06-06. STRUCTURE ONLY: no data, no PHI.
--
-- Applied by the db-contract GATE mode AFTER scripts/ci-db-preshim.sql, which
-- provides the auth shim (auth.users, auth.uid/auth.role), the anon/authenticated/
-- service_role roles, and pgcrypto + uuid-ossp. Roles, grants, and extensions are
-- intentionally NOT in this file (the pre-shim owns the Supabase environment).
--
-- This is an MCP-extracted baseline, validated by the db-contract CI run. For
-- gold-standard fidelity, regenerate with:
--   supabase db dump --schema public,storage -f supabase/baseline.sql

create schema if not exists storage;

create type storage.buckettype as enum ('STANDARD', 'ANALYTICS', 'VECTOR');

create table storage.migrations (
  id integer not null,
  name character varying(100) not null,
  hash character varying(40) not null,
  executed_at timestamp without time zone default CURRENT_TIMESTAMP
);

create table storage.buckets (
  id text not null,
  name text not null,
  owner uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  public boolean default false,
  avif_autodetection boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner_id text,
  type storage.buckettype not null default 'STANDARD'::storage.buckettype
);

create table storage.objects (
  id uuid not null default gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_accessed_at timestamp with time zone default now(),
  metadata jsonb,
  path_tokens text[] generated always as (string_to_array(name, '/'::text)) stored,
  version text,
  owner_id text,
  user_metadata jsonb
);

create table storage.s3_multipart_uploads (
  id text not null,
  in_progress_size bigint not null default 0,
  upload_signature text not null,
  bucket_id text not null,
  key text not null,
  version text not null,
  owner_id text,
  created_at timestamp with time zone not null default now(),
  user_metadata jsonb,
  metadata jsonb
);

create table storage.s3_multipart_uploads_parts (
  id uuid not null default gen_random_uuid(),
  upload_id text not null,
  size bigint not null default 0,
  part_number integer not null,
  bucket_id text not null,
  key text not null,
  etag text not null,
  owner_id text,
  version text not null,
  created_at timestamp with time zone not null default now()
);

create table storage.buckets_analytics (
  name text not null,
  type storage.buckettype not null default 'ANALYTICS'::storage.buckettype,
  format text not null default 'ICEBERG'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  id uuid not null default gen_random_uuid(),
  deleted_at timestamp with time zone
);

create table storage.buckets_vectors (
  id text not null,
  type storage.buckettype not null default 'VECTOR'::storage.buckettype,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table storage.vector_indexes (
  id text not null default gen_random_uuid(),
  name text not null,
  bucket_id text not null,
  data_type text not null,
  dimension integer not null,
  distance_metric text not null,
  metadata_configuration jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table subscribers (
  id uuid not null default gen_random_uuid(),
  email text not null,
  source text,
  created_at timestamp with time zone not null default now()
);

create table feedback (
  id uuid not null default gen_random_uuid(),
  email text,
  message text not null,
  page text,
  created_at timestamp with time zone not null default now(),
  user_id uuid,
  contact_ok boolean default false,
  type text default 'feedback'::text,
  metadata jsonb,
  processed boolean not null default false,
  processed_at timestamp with time zone
);

create table analysis_sessions (
  id uuid not null default gen_random_uuid(),
  night_count integer not null,
  has_oximetry boolean not null default false,
  is_demo boolean not null default false,
  duration_ms integer,
  glasgow_avg real,
  engines_used text[],
  export_formats text[],
  user_agent text,
  created_at timestamp with time zone not null default now()
);

create table premium_interest (
  id uuid not null default gen_random_uuid(),
  email text not null,
  feature text,
  source text,
  created_at timestamp with time zone not null default now()
);

create table data_contributions (
  id uuid not null default gen_random_uuid(),
  contribution_id text not null,
  night_count integer not null,
  nights jsonb not null,
  has_oximetry boolean default false,
  device_model text,
  pap_mode text,
  created_at timestamp with time zone default now(),
  user_id uuid
);

create table waitlist (
  id uuid not null default gen_random_uuid(),
  email text not null,
  source text default 'unknown'::text,
  created_at timestamp with time zone default now()
);

create table error_submissions (
  id uuid not null default gen_random_uuid(),
  file_names text[] not null,
  error_message text not null,
  email text,
  user_agent text,
  created_at timestamp with time zone default now()
);

create table profiles (
  id uuid not null,
  email text not null,
  display_name text,
  stripe_customer_id text,
  tier text not null default 'community'::text,
  show_on_supporters boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  storage_consent boolean not null default false,
  storage_consent_at timestamp with time zone,
  walkthrough_completed boolean not null default false,
  email_opt_in boolean default false,
  last_analysis_at timestamp with time zone,
  discord_id text,
  discord_username text,
  discord_linked_at timestamp with time zone,
  discord_sync_error_count integer not null default 0,
  discord_sync_last_error timestamp with time zone,
  re_engagement_suppressed_at timestamp with time zone,
  ai_insights_consent boolean not null default false,
  ai_insights_consent_at timestamp with time zone
);

create table subscriptions (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  stripe_subscription_id text not null,
  stripe_price_id text not null,
  status text not null,
  tier text not null,
  current_period_start timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  cancel_reason text,
  cancel_feedback text,
  cancel_comment text,
  cancelled_at timestamp with time zone
);

create table user_nights (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  night_date date not null,
  analysis_data jsonb not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table ai_usage (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  month text not null,
  count integer not null default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0
);

create table stripe_events (
  event_id text not null,
  event_type text not null,
  processed_at timestamp with time zone not null default now(),
  status text not null default 'pending'::text,
  attempts integer not null default 0,
  last_error text,
  updated_at timestamp with time zone not null default now()
);

create table account_deletion_requests (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  email text not null,
  reason text,
  status text not null default 'pending'::text,
  created_at timestamp with time zone not null default now()
);

create table user_files (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  night_date date,
  file_path text not null,
  storage_path text not null,
  file_name text not null,
  file_size bigint not null,
  file_hash text not null,
  mime_type text,
  is_supported boolean not null default true,
  uploaded_at timestamp with time zone not null default now(),
  upload_confirmed boolean not null default true
);

create table user_storage_usage (
  user_id uuid not null,
  total_bytes bigint not null default 0,
  file_count integer not null default 0,
  updated_at timestamp with time zone not null default now()
);

create table shared_analyses (
  id uuid not null default gen_random_uuid(),
  analysis_data jsonb not null,
  machine_info jsonb,
  nights_count integer not null default 1,
  share_scope text not null default 'single'::text,
  created_at timestamp with time zone default now(),
  expires_at timestamp with time zone default (now() + '30 days'::interval),
  access_count integer default 0,
  last_accessed_at timestamp with time zone,
  created_by_user_id uuid,
  has_files boolean not null default false,
  file_paths jsonb default '[]'::jsonb
);

create table provider_interest (
  id uuid not null default gen_random_uuid(),
  name text not null,
  email text not null,
  practice_type text,
  message text,
  created_at timestamp with time zone default now()
);

create table waveform_contributions (
  id uuid not null default gen_random_uuid(),
  contribution_id text not null,
  night_date date not null,
  engine_version text not null,
  sampling_rate real not null,
  duration_seconds real not null,
  sample_count integer not null,
  compressed_size_bytes integer not null,
  storage_path text not null,
  device_model text,
  pap_mode text,
  analysis_results jsonb not null,
  created_at timestamp with time zone default now(),
  channel_count smallint not null default 1,
  format_version smallint not null default 1,
  has_pressure boolean not null default false,
  user_id uuid
);

create table consent_audit (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  consent_type text not null,
  action text not null,
  ip_hash text,
  user_agent text,
  created_at timestamp with time zone not null default now()
);

create table symptom_contributions (
  id bigint not null,
  dedup_hash text not null,
  symptom_rating smallint not null,
  ifl_risk numeric(5,1) not null,
  glasgow_overall numeric(4,2) not null,
  fl_score numeric(5,1) not null,
  ned_mean numeric(5,1) not null,
  regularity smallint not null,
  eai numeric(5,1) not null,
  rera_index numeric(5,1) not null,
  combined_fl_pct smallint not null,
  pressure_bucket text not null,
  pap_mode text not null,
  device_model text not null,
  duration_hours numeric(4,2) not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  hypopnea_index numeric(5,1),
  amplitude_cv numeric(5,1),
  unstable_epoch_pct smallint,
  tidal_volume_cv numeric(5,1),
  trigger_delay_median_ms smallint,
  ie_ratio numeric(4,2)
);

create table analysis_data (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  night_date date not null,
  glasgow_overall real,
  fl_score real,
  ned_mean real,
  rera_index real,
  eai real,
  duration_hours real,
  session_count integer,
  settings jsonb,
  per_breath_storage_path text,
  engine_version text not null default '1.0.0'::text,
  created_at timestamp with time zone not null default now()
);

create table subscription_events (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  event_type text not null,
  tier text,
  "interval" text,
  stripe_subscription_id text,
  mrr_cents integer,
  created_at timestamp with time zone not null default now(),
  stripe_event_id text
);

create table device_diagnostics (
  id uuid not null default gen_random_uuid(),
  device_model text not null default 'Unknown'::text,
  signal_labels jsonb not null default '[]'::jsonb,
  identification_text text,
  has_str_file boolean not null default false,
  created_at timestamp with time zone not null default now()
);

create table email_sequences (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  sequence_name text not null,
  step integer not null default 1,
  status text not null default 'pending'::text,
  scheduled_at timestamp with time zone not null,
  sent_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  ab_variant text,
  resend_id text,
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  complained_at timestamp with time zone
);

create table oximetry_trace_contributions (
  id uuid not null default gen_random_uuid(),
  contribution_id text not null,
  night_date date not null,
  engine_version text not null,
  sample_count integer not null,
  duration_seconds real not null,
  compressed_size_bytes integer not null,
  storage_path text not null,
  device_model text,
  pap_mode text,
  oximetry_source text,
  oximetry_results jsonb not null,
  created_at timestamp with time zone default now()
);

create table daily_usage_snapshots (
  id uuid not null default gen_random_uuid(),
  snapshot_date date not null,
  metrics jsonb not null,
  critical_alerts jsonb not null default '[]'::jsonb,
  alerts_sent integer not null default 0,
  created_at timestamp with time zone not null default now()
);

create table email_log (
  id uuid not null default gen_random_uuid(),
  resend_id text,
  to_email text not null,
  subject text not null,
  email_type text not null,
  user_id uuid,
  created_at timestamp with time zone not null default now(),
  delivered_at timestamp with time zone,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  bounced_at timestamp with time zone
);

create table discord_pending_roles (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  role_id text not null,
  created_at timestamp with time zone not null default now()
);

create table discord_role_events (
  id uuid not null default gen_random_uuid(),
  user_id uuid,
  discord_id text not null,
  role_id text not null,
  action text not null,
  reason text not null,
  stripe_event_id text,
  created_at timestamp with time zone not null default now(),
  http_status integer,
  error_message text
);

create table unsupported_device_submissions (
  id uuid not null default gen_random_uuid(),
  file_structure jsonb not null,
  file_header_samples jsonb,
  device_guess text,
  email text,
  user_agent text,
  status text default 'pending'::text,
  notes text,
  created_at timestamp with time zone default now()
);

create table ai_insights_log (
  id bigint not null,
  created_at timestamp with time zone not null default now(),
  user_id uuid not null,
  tier text not null,
  model text not null,
  is_deep boolean not null default false,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  insight_count integer not null default 0,
  insights jsonb not null,
  truncated boolean not null default false
);

create table remind_requests (
  id uuid not null default gen_random_uuid(),
  email text not null,
  created_at timestamp with time zone not null default now(),
  reminded_at timestamp with time zone,
  unsubscribed_at timestamp with time zone,
  unsubscribe_token text not null default (gen_random_uuid())::text
);

create table kv_alert_dedup (
  key text not null,
  last_fired_at timestamp with time zone not null default now(),
  suppressed_count integer not null default 0
);

create table discord_digest_events (
  id uuid not null default gen_random_uuid(),
  event_type text not null,
  digest_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  consumed_at timestamp with time zone
);

create table signal_daily_counts (
  id uuid not null default gen_random_uuid(),
  signal_type text not null,
  signal_name text not null,
  signal_date date not null default CURRENT_DATE,
  count integer not null default 0,
  webhook_fired_at_thresholds integer[] not null default '{}'::integer[],
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);


-- ============ functions ============

CREATE OR REPLACE FUNCTION storage.allow_any_operation(expected_operations text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT CASE
      WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
      ELSE raw_operation
    END AS current_operation
    FROM current_operation
  )
  SELECT EXISTS (
    SELECT 1
    FROM normalized n
    CROSS JOIN LATERAL unnest(expected_operations) AS expected_operation
    WHERE expected_operation IS NOT NULL
      AND expected_operation <> ''
      AND n.current_operation = CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END
  );
$function$
;

CREATE OR REPLACE FUNCTION storage.allow_only_operation(expected_operation text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
AS $function$
  WITH current_operation AS (
    SELECT storage.operation() AS raw_operation
  ),
  normalized AS (
    SELECT
      CASE
        WHEN raw_operation LIKE 'storage.%' THEN substr(raw_operation, 9)
        ELSE raw_operation
      END AS current_operation,
      CASE
        WHEN expected_operation LIKE 'storage.%' THEN substr(expected_operation, 9)
        ELSE expected_operation
      END AS requested_operation
    FROM current_operation
  )
  SELECT CASE
    WHEN requested_operation IS NULL OR requested_operation = '' THEN FALSE
    ELSE COALESCE(current_operation = requested_operation, FALSE)
  END
  FROM normalized;
$function$
;

CREATE OR REPLACE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$function$
;

CREATE OR REPLACE FUNCTION public.claim_stripe_event(p_event_id text, p_attempts integer, p_stale_cutoff timestamp with time zone)
 RETURNS TABLE(event_id text)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  update public.stripe_events
     set status = 'processing',
         attempts = p_attempts,
         updated_at = now()
   where event_id = p_event_id
     and ( status in ('pending', 'failed')
           or (status = 'processing' and updated_at < p_stale_cutoff) )
  returning event_id;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_ai_insights_log()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.ai_insights_log
  WHERE created_at < now() - interval '90 days';
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_expired_shared_analyses()
 RETURNS TABLE(deleted_count integer, deleted_ids uuid[])
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_ids uuid[];
  v_count integer;
BEGIN
  SELECT array_agg(id) INTO v_ids
  FROM shared_analyses
  WHERE expires_at < now();

  DELETE FROM shared_analyses
  WHERE expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN QUERY SELECT v_count, COALESCE(v_ids, ARRAY[]::uuid[]);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_old_analysis_sessions()
 RETURNS TABLE(deleted_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _count bigint;
BEGIN
  DELETE FROM public.analysis_sessions
  WHERE created_at < now() - interval '12 months';

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN QUERY SELECT _count;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.enforce_bucket_name_length()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
    if length(new.name) > 100 then
        raise exception 'bucket name "%" is too long (% characters). Max is 100.', new.name, length(new.name);
    end if;
    return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.export_ml_training_data()
 RETURNS TABLE(symptom_rating smallint, glasgow_overall numeric, fl_score numeric, regularity smallint, ned_mean numeric, rera_index numeric, combined_fl_pct smallint, eai numeric, hypopnea_index numeric, amplitude_cv numeric, unstable_epoch_pct smallint, tidal_volume_cv numeric, trigger_delay_median_ms smallint, ie_ratio numeric, pressure_bucket text, pap_mode text, device_model text, duration_hours numeric, ifl_risk numeric)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT
    sc.symptom_rating,
    sc.glasgow_overall,
    sc.fl_score,
    sc.regularity,
    sc.ned_mean,
    sc.rera_index,
    sc.combined_fl_pct,
    sc.eai,
    sc.hypopnea_index,
    sc.amplitude_cv,
    sc.unstable_epoch_pct,
    sc.tidal_volume_cv,
    sc.trigger_delay_median_ms,
    sc.ie_ratio,
    sc.pressure_bucket,
    sc.pap_mode,
    sc.device_model,
    sc.duration_hours,
    sc.ifl_risk
  FROM symptom_contributions sc
  WHERE sc.symptom_rating IS NOT NULL
  ORDER BY sc.created_at;
$function$
;

CREATE OR REPLACE FUNCTION storage.extension(name text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
    _filename text;
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Get the last path segment (the actual filename)
    SELECT _parts[array_length(_parts, 1)] INTO _filename;
    -- Extract extension: reverse, split on '.', then reverse again
    RETURN reverse(split_part(reverse(_filename), '.', 1));
END
$function$
;

CREATE OR REPLACE FUNCTION storage.filename(name text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$function$
;

CREATE OR REPLACE FUNCTION storage.foldername(name text)
 RETURNS text[]
 LANGUAGE plpgsql
 IMMUTABLE
AS $function$
DECLARE
    _parts text[];
BEGIN
    -- Split on "/" to get path segments
    SELECT string_to_array(name, '/') INTO _parts;
    -- Return everything except the last segment
    RETURN _parts[1 : array_length(_parts,1) - 1];
END
$function$
;

CREATE OR REPLACE FUNCTION storage.get_common_prefix(p_key text, p_prefix text, p_delimiter text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
SELECT CASE
    WHEN position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)) > 0
    THEN left(p_key, length(p_prefix) + position(p_delimiter IN substring(p_key FROM length(p_prefix) + 1)))
    ELSE NULL
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_community_benchmarks()
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT json_build_object(
    'sample_size', (SELECT COUNT(*) FROM symptom_contributions WHERE ifl_risk IS NOT NULL),
    -- IFL Risk percentiles
    'ifl_risk_p10', ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
    'ifl_risk_p25', ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
    'ifl_risk_p50', ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
    'ifl_risk_p75', ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
    'ifl_risk_p90', ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
    -- Glasgow percentiles
    'glasgow_p10', ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY glasgow_overall)::NUMERIC, 2),
    'glasgow_p25', ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY glasgow_overall)::NUMERIC, 2),
    'glasgow_p50', ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY glasgow_overall)::NUMERIC, 2),
    'glasgow_p75', ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY glasgow_overall)::NUMERIC, 2),
    'glasgow_p90', ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY glasgow_overall)::NUMERIC, 2),
    -- FL Score percentiles
    'fl_score_p10', ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY fl_score)::NUMERIC, 1),
    'fl_score_p25', ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY fl_score)::NUMERIC, 1),
    'fl_score_p50', ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY fl_score)::NUMERIC, 1),
    'fl_score_p75', ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY fl_score)::NUMERIC, 1),
    'fl_score_p90', ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY fl_score)::NUMERIC, 1),
    -- RERA Index percentiles
    'rera_index_p10', ROUND(PERCENTILE_CONT(0.10) WITHIN GROUP (ORDER BY rera_index)::NUMERIC, 1),
    'rera_index_p25', ROUND(PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY rera_index)::NUMERIC, 1),
    'rera_index_p50', ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY rera_index)::NUMERIC, 1),
    'rera_index_p75', ROUND(PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY rera_index)::NUMERIC, 1),
    'rera_index_p90', ROUND(PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY rera_index)::NUMERIC, 1)
  )
  FROM symptom_contributions
  WHERE ifl_risk IS NOT NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.get_community_symptom_stats(p_ifl_risk numeric, p_pressure_bucket text)
 RETURNS TABLE(total_ratings bigint, avg_rating numeric, same_bucket_avg_rating numeric, same_bucket_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_total BIGINT;
  v_avg NUMERIC;
  v_bucket_avg NUMERIC;
  v_bucket_count BIGINT;
  v_ifl_low NUMERIC;
  v_ifl_high NUMERIC;
BEGIN
  -- Overall stats
  SELECT COUNT(*), AVG(symptom_rating)
  INTO v_total, v_avg
  FROM symptom_contributions;

  -- IFL Risk bucket: +/- 10 from input
  v_ifl_low := GREATEST(0, p_ifl_risk - 10);
  v_ifl_high := LEAST(100, p_ifl_risk + 10);

  SELECT AVG(symptom_rating), COUNT(*)
  INTO v_bucket_avg, v_bucket_count
  FROM symptom_contributions
  WHERE ifl_risk BETWEEN v_ifl_low AND v_ifl_high;

  RETURN QUERY SELECT v_total, v_avg, v_bucket_avg, v_bucket_count;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_extended_stats()
 RETURNS json
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT json_build_object(
    'unique_raw_uploaders',          (SELECT COUNT(DISTINCT user_id) FROM public.user_files),
    'total_raw_files',               (SELECT COUNT(*) FROM public.user_files),
    'total_waveform_contributions',  (SELECT COUNT(*) FROM public.waveform_contributions),
    'unique_waveform_contributors',  (SELECT COUNT(DISTINCT contribution_id) FROM public.waveform_contributions),
    'total_registered_users',        (SELECT COUNT(*) FROM public.profiles)
  );
$function$
;

CREATE OR REPLACE FUNCTION public.get_latest_usage_snapshot()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT to_jsonb(s) INTO result
  FROM daily_usage_snapshots s
  ORDER BY snapshot_date DESC
  LIMIT 1;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_monthly_ai_token_usage(p_month text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_calls', COALESCE(SUM(count), 0),
    'total_input_tokens', COALESCE(SUM(input_tokens), 0),
    'total_output_tokens', COALESCE(SUM(output_tokens), 0)
  ) INTO result
  FROM ai_usage
  WHERE month = p_month;
  RETURN COALESCE(result, '{"total_calls":0,"total_input_tokens":0,"total_output_tokens":0}'::jsonb);
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.get_size_by_bucket()
 RETURNS TABLE(size bigint, bucket_id text)
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    return query
        select sum((metadata->>'size')::bigint)::bigint as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$function$
;

CREATE OR REPLACE FUNCTION public.get_storage_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  _db_size bigint;
  _shared_analyses_count bigint;
  _analysis_sessions_count bigint;
  _data_contributions_count bigint;
  _waveform_contributions_count bigint;
  _user_files_count bigint;
  _user_files_total_bytes bigint;
BEGIN
  SELECT pg_database_size(current_database()) INTO _db_size;

  SELECT count(*) INTO _shared_analyses_count FROM public.shared_analyses;
  SELECT count(*) INTO _analysis_sessions_count FROM public.analysis_sessions;
  SELECT count(*) INTO _data_contributions_count FROM public.data_contributions;
  SELECT count(*) INTO _waveform_contributions_count FROM public.waveform_contributions;
  SELECT count(*) INTO _user_files_count FROM public.user_files;
  SELECT COALESCE(sum(file_size), 0) INTO _user_files_total_bytes FROM public.user_files;

  RETURN json_build_object(
    'database_size_bytes', _db_size,
    'shared_analyses_rows', _shared_analyses_count,
    'analysis_sessions_rows', _analysis_sessions_count,
    'data_contributions_rows', _data_contributions_count,
    'waveform_contributions_rows', _waveform_contributions_count,
    'user_files_rows', _user_files_count,
    'user_files_total_bytes', _user_files_total_bytes
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_symptom_aggregate_stats()
 RETURNS TABLE(total_ratings bigint, avg_rating numeric, high_ifl_poor_pct numeric, low_ifl_good_pct numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_total BIGINT;
  v_avg NUMERIC;
  v_high_ifl_total BIGINT;
  v_high_ifl_poor BIGINT;
  v_low_ifl_total BIGINT;
  v_low_ifl_good BIGINT;
  v_high_ifl_poor_pct NUMERIC;
  v_low_ifl_good_pct NUMERIC;
BEGIN
  SELECT COUNT(*), AVG(symptom_rating)
  INTO v_total, v_avg
  FROM symptom_contributions;

  -- High IFL (>45) who rated poorly (1-2)
  SELECT COUNT(*) INTO v_high_ifl_total
  FROM symptom_contributions WHERE ifl_risk > 45;

  SELECT COUNT(*) INTO v_high_ifl_poor
  FROM symptom_contributions WHERE ifl_risk > 45 AND symptom_rating <= 2;

  v_high_ifl_poor_pct := CASE
    WHEN v_high_ifl_total > 0 THEN ROUND(v_high_ifl_poor * 100.0 / v_high_ifl_total, 1)
    ELSE 0
  END;

  -- Low IFL (<20) who rated well (4-5)
  SELECT COUNT(*) INTO v_low_ifl_total
  FROM symptom_contributions WHERE ifl_risk < 20;

  SELECT COUNT(*) INTO v_low_ifl_good
  FROM symptom_contributions WHERE ifl_risk < 20 AND symptom_rating >= 4;

  v_low_ifl_good_pct := CASE
    WHEN v_low_ifl_total > 0 THEN ROUND(v_low_ifl_good * 100.0 / v_low_ifl_total, 1)
    ELSE 0
  END;

  RETURN QUERY SELECT v_total, v_avg, v_high_ifl_poor_pct, v_low_ifl_good_pct;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  insert into public.profiles (id, email, storage_consent, storage_consent_at)
  values (new.id, new.email, true, now())
  on conflict (id) do nothing;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_ai_usage(p_user_id uuid, p_month text, p_input_tokens bigint DEFAULT 0, p_output_tokens bigint DEFAULT 0)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO ai_usage (user_id, month, count, input_tokens, output_tokens)
  VALUES (p_user_id, p_month, 1, p_input_tokens, p_output_tokens)
  ON CONFLICT (user_id, month)
  DO UPDATE SET
    count = ai_usage.count + 1,
    input_tokens = ai_usage.input_tokens + p_input_tokens,
    output_tokens = ai_usage.output_tokens + p_output_tokens;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.increment_signal_count(p_signal_type text, p_signal_name text)
 RETURNS TABLE(new_count integer, fired_thresholds integer[])
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.signal_daily_counts (signal_type, signal_name, count)
  VALUES (p_signal_type, p_signal_name, 1)
  ON CONFLICT (signal_type, signal_date)
  DO UPDATE SET
    count = signal_daily_counts.count + 1,
    updated_at = NOW();

  RETURN QUERY
  SELECT sdc.count AS new_count, sdc.webhook_fired_at_thresholds AS fired_thresholds
  FROM public.signal_daily_counts sdc
  WHERE sdc.signal_type = p_signal_type AND sdc.signal_date = CURRENT_DATE;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text)
 RETURNS TABLE(key text, id text, created_at timestamp with time zone)
 LANGUAGE plpgsql
AS $function$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.list_objects_with_delimiter(_bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;

    -- Configuration
    v_is_asc BOOLEAN;
    v_prefix TEXT;
    v_start TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_is_asc := lower(coalesce(sort_order, 'asc')) = 'asc';
    v_prefix := coalesce(prefix_param, '');
    v_start := CASE WHEN coalesce(next_token, '') <> '' THEN next_token ELSE coalesce(start_after, '') END;
    v_file_batch_size := LEAST(GREATEST(max_keys * 2, 100), 1000);

    -- Calculate upper bound for prefix filtering (bytewise, using COLLATE "C")
    IF v_prefix = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix, 1) = delimiter_param THEN
        v_upper_bound := left(v_prefix, -1) || chr(ascii(delimiter_param) + 1);
    ELSE
        v_upper_bound := left(v_prefix, -1) || chr(ascii(right(v_prefix, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'AND o.name COLLATE "C" < $3 ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" >= $2 ' ||
                'ORDER BY o.name COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'AND o.name COLLATE "C" >= $3 ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND o.name COLLATE "C" < $2 ' ||
                'ORDER BY o.name COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- ========================================================================
    -- SEEK INITIALIZATION: Determine starting position
    -- ========================================================================
    IF v_start = '' THEN
        IF v_is_asc THEN
            v_next_seek := v_prefix;
        ELSE
            -- DESC without cursor: find the last item in range
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_next_seek FROM storage.objects o
                WHERE o.bucket_id = _bucket_id
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;

            IF v_next_seek IS NOT NULL THEN
                v_next_seek := v_next_seek || delimiter_param;
            ELSE
                RETURN;
            END IF;
        END IF;
    ELSE
        -- Cursor provided: determine if it refers to a folder or leaf
        IF EXISTS (
            SELECT 1 FROM storage.objects o
            WHERE o.bucket_id = _bucket_id
              AND o.name COLLATE "C" LIKE v_start || delimiter_param || '%'
            LIMIT 1
        ) THEN
            -- Cursor refers to a folder
            IF v_is_asc THEN
                v_next_seek := v_start || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_start || delimiter_param;
            END IF;
        ELSE
            -- Cursor refers to a leaf object
            IF v_is_asc THEN
                v_next_seek := v_start || delimiter_param;
            ELSE
                v_next_seek := v_start;
            END IF;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= max_keys;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek AND o.name COLLATE "C" < v_upper_bound
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" >= v_next_seek
                ORDER BY o.name COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek AND o.name COLLATE "C" >= v_prefix
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = _bucket_id AND o.name COLLATE "C" < v_next_seek
                ORDER BY o.name COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(v_peek_name, v_prefix, delimiter_param);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Emit and skip to next folder (no heap access needed)
            name := rtrim(v_common_prefix, delimiter_param);
            id := NULL;
            updated_at := NULL;
            created_at := NULL;
            last_accessed_at := NULL;
            metadata := NULL;
            RETURN NEXT;
            v_count := v_count + 1;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := left(v_common_prefix, -1) || chr(ascii(delimiter_param) + 1);
            ELSE
                v_next_seek := v_common_prefix;
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query USING _bucket_id, v_next_seek,
                CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix) ELSE v_prefix END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(v_current.name, v_prefix, delimiter_param);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := v_current.name;
                    EXIT;
                END IF;

                -- Emit file
                name := v_current.name;
                id := v_current.id;
                updated_at := v_current.updated_at;
                created_at := v_current.created_at;
                last_accessed_at := v_current.last_accessed_at;
                metadata := v_current.metadata;
                RETURN NEXT;
                v_count := v_count + 1;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := v_current.name || delimiter_param;
                ELSE
                    v_next_seek := v_current.name;
                END IF;

                EXIT WHEN v_count >= max_keys;
            END LOOP;
        END IF;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ml_dataset_stats()
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
  SELECT json_build_object(
    'total_samples', (SELECT COUNT(*) FROM symptom_contributions WHERE symptom_rating IS NOT NULL),
    'rating_distribution', (
      SELECT COALESCE(json_agg(json_build_object('rating', r.symptom_rating, 'count', r.cnt)), '[]'::json)
      FROM (
        SELECT symptom_rating, COUNT(*) AS cnt
        FROM symptom_contributions
        WHERE symptom_rating IS NOT NULL
        GROUP BY symptom_rating
        ORDER BY symptom_rating
      ) r
    ),
    'pap_mode_distribution', (
      SELECT COALESCE(json_agg(json_build_object('mode', m.pap_mode, 'count', m.cnt)), '[]'::json)
      FROM (
        SELECT pap_mode, COUNT(*) AS cnt
        FROM symptom_contributions
        WHERE symptom_rating IS NOT NULL
        GROUP BY pap_mode
        ORDER BY cnt DESC
      ) m
    ),
    'device_model_distribution', (
      SELECT COALESCE(json_agg(json_build_object('model', d.device_model, 'count', d.cnt)), '[]'::json)
      FROM (
        SELECT device_model, COUNT(*) AS cnt
        FROM symptom_contributions
        WHERE symptom_rating IS NOT NULL
        GROUP BY device_model
        ORDER BY cnt DESC
      ) d
    ),
    'ifl_risk_stats', (
      SELECT json_build_object(
        'mean', ROUND(AVG(ifl_risk), 1),
        'median', ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ifl_risk)::NUMERIC, 1),
        'min', MIN(ifl_risk),
        'max', MAX(ifl_risk)
      )
      FROM symptom_contributions
      WHERE symptom_rating IS NOT NULL
    ),
    'enriched_features', json_build_object(
      'with_hypopnea_index', (SELECT COUNT(*) FROM symptom_contributions WHERE hypopnea_index IS NOT NULL),
      'with_amplitude_cv', (SELECT COUNT(*) FROM symptom_contributions WHERE amplitude_cv IS NOT NULL),
      'with_tidal_volume_cv', (SELECT COUNT(*) FROM symptom_contributions WHERE tidal_volume_cv IS NOT NULL),
      'with_ie_ratio', (SELECT COUNT(*) FROM symptom_contributions WHERE ie_ratio IS NOT NULL)
    )
  );
$function$
;

CREATE OR REPLACE FUNCTION storage.operation()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
AS $function$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.protect_delete()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Check if storage.allow_delete_query is set to 'true'
    IF COALESCE(current_setting('storage.allow_delete_query', true), 'false') != 'true' THEN
        RAISE EXCEPTION 'Direct deletion from storage tables is not allowed. Use the Storage API instead.'
            USING HINT = 'This prevents accidental data loss from orphaned objects.',
                  ERRCODE = '42501';
    END IF;
    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.run_db_integrity_checks()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE
    result jsonb;
  BEGIN
    SELECT jsonb_build_object(
      'subscriptions_orphans', (
        SELECT COUNT(*)::int
        FROM subscriptions s
        WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = s.user_id)
      ),
      'user_nights_orphans', (
        SELECT COUNT(*)::int
        FROM user_nights un
        WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = un.user_id)
      ),
      'email_sequences_orphans', (
        SELECT COUNT(*)::int
        FROM email_sequences es
        WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = es.user_id)
      ),
      'profiles_stripe_no_sub', (
        SELECT COUNT(*)::int
        FROM profiles p
        WHERE p.stripe_customer_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = p.id)
      ),
      'profiles_paid_no_active_sub', (
        SELECT COUNT(*)::int
        FROM profiles p
        WHERE p.tier IN ('supporter', 'champion')
          AND NOT EXISTS (
            SELECT 1 FROM subscriptions s
            WHERE s.user_id = p.id
              AND s.status IN ('active', 'trialing')
          )
      )
    ) INTO result;

    RETURN result;
  END;
  $function$
;

CREATE OR REPLACE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text)
 RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_peek_name TEXT;
    v_current RECORD;
    v_common_prefix TEXT;
    v_delimiter CONSTANT TEXT := '/';

    -- Configuration
    v_limit INT;
    v_prefix TEXT;
    v_prefix_lower TEXT;
    v_is_asc BOOLEAN;
    v_order_by TEXT;
    v_sort_order TEXT;
    v_upper_bound TEXT;
    v_file_batch_size INT;

    -- Dynamic SQL for batch query only
    v_batch_query TEXT;

    -- Seek state
    v_next_seek TEXT;
    v_count INT := 0;
    v_skipped INT := 0;
BEGIN
    -- ========================================================================
    -- INITIALIZATION
    -- ========================================================================
    v_limit := LEAST(coalesce(limits, 100), 1500);
    v_prefix := coalesce(prefix, '') || coalesce(search, '');
    v_prefix_lower := lower(v_prefix);
    v_is_asc := lower(coalesce(sortorder, 'asc')) = 'asc';
    v_file_batch_size := LEAST(GREATEST(v_limit * 2, 100), 1000);

    -- Validate sort column
    CASE lower(coalesce(sortcolumn, 'name'))
        WHEN 'name' THEN v_order_by := 'name';
        WHEN 'updated_at' THEN v_order_by := 'updated_at';
        WHEN 'created_at' THEN v_order_by := 'created_at';
        WHEN 'last_accessed_at' THEN v_order_by := 'last_accessed_at';
        ELSE v_order_by := 'name';
    END CASE;

    v_sort_order := CASE WHEN v_is_asc THEN 'asc' ELSE 'desc' END;

    -- ========================================================================
    -- NON-NAME SORTING: Use path_tokens approach (unchanged)
    -- ========================================================================
    IF v_order_by != 'name' THEN
        RETURN QUERY EXECUTE format(
            $sql$
            WITH folders AS (
                SELECT path_tokens[$1] AS folder
                FROM storage.objects
                WHERE objects.name ILIKE $2 || '%%'
                  AND bucket_id = $3
                  AND array_length(objects.path_tokens, 1) <> $1
                GROUP BY folder
                ORDER BY folder %s
            )
            (SELECT folder AS "name",
                   NULL::uuid AS id,
                   NULL::timestamptz AS updated_at,
                   NULL::timestamptz AS created_at,
                   NULL::timestamptz AS last_accessed_at,
                   NULL::jsonb AS metadata FROM folders)
            UNION ALL
            (SELECT path_tokens[$1] AS "name",
                   id, updated_at, created_at, last_accessed_at, metadata
             FROM storage.objects
             WHERE objects.name ILIKE $2 || '%%'
               AND bucket_id = $3
               AND array_length(objects.path_tokens, 1) = $1
             ORDER BY %I %s)
            LIMIT $4 OFFSET $5
            $sql$, v_sort_order, v_order_by, v_sort_order
        ) USING levels, v_prefix, bucketname, v_limit, offsets;
        RETURN;
    END IF;

    -- ========================================================================
    -- NAME SORTING: Hybrid skip-scan with batch optimization
    -- ========================================================================

    -- Calculate upper bound for prefix filtering
    IF v_prefix_lower = '' THEN
        v_upper_bound := NULL;
    ELSIF right(v_prefix_lower, 1) = v_delimiter THEN
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(v_delimiter) + 1);
    ELSE
        v_upper_bound := left(v_prefix_lower, -1) || chr(ascii(right(v_prefix_lower, 1)) + 1);
    END IF;

    -- Build batch query (dynamic SQL - called infrequently, amortized over many rows)
    IF v_is_asc THEN
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'AND lower(o.name) COLLATE "C" < $3 ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" >= $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" ASC LIMIT $4';
        END IF;
    ELSE
        IF v_upper_bound IS NOT NULL THEN
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'AND lower(o.name) COLLATE "C" >= $3 ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        ELSE
            v_batch_query := 'SELECT o.name, o.id, o.updated_at, o.created_at, o.last_accessed_at, o.metadata ' ||
                'FROM storage.objects o WHERE o.bucket_id = $1 AND lower(o.name) COLLATE "C" < $2 ' ||
                'ORDER BY lower(o.name) COLLATE "C" DESC LIMIT $4';
        END IF;
    END IF;

    -- Initialize seek position
    IF v_is_asc THEN
        v_next_seek := v_prefix_lower;
    ELSE
        -- DESC: find the last item in range first (static SQL)
        IF v_upper_bound IS NOT NULL THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower AND lower(o.name) COLLATE "C" < v_upper_bound
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSIF v_prefix_lower <> '' THEN
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_prefix_lower
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        ELSE
            SELECT o.name INTO v_peek_name FROM storage.objects o
            WHERE o.bucket_id = bucketname
            ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
        END IF;

        IF v_peek_name IS NOT NULL THEN
            v_next_seek := lower(v_peek_name) || v_delimiter;
        ELSE
            RETURN;
        END IF;
    END IF;

    -- ========================================================================
    -- MAIN LOOP: Hybrid peek-then-batch algorithm
    -- Uses STATIC SQL for peek (hot path) and DYNAMIC SQL for batch
    -- ========================================================================
    LOOP
        EXIT WHEN v_count >= v_limit;

        -- STEP 1: PEEK using STATIC SQL (plan cached, very fast)
        IF v_is_asc THEN
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek AND lower(o.name) COLLATE "C" < v_upper_bound
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" >= v_next_seek
                ORDER BY lower(o.name) COLLATE "C" ASC LIMIT 1;
            END IF;
        ELSE
            IF v_upper_bound IS NOT NULL THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSIF v_prefix_lower <> '' THEN
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek AND lower(o.name) COLLATE "C" >= v_prefix_lower
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            ELSE
                SELECT o.name INTO v_peek_name FROM storage.objects o
                WHERE o.bucket_id = bucketname AND lower(o.name) COLLATE "C" < v_next_seek
                ORDER BY lower(o.name) COLLATE "C" DESC LIMIT 1;
            END IF;
        END IF;

        EXIT WHEN v_peek_name IS NULL;

        -- STEP 2: Check if this is a FOLDER or FILE
        v_common_prefix := storage.get_common_prefix(lower(v_peek_name), v_prefix_lower, v_delimiter);

        IF v_common_prefix IS NOT NULL THEN
            -- FOLDER: Handle offset, emit if needed, skip to next folder
            IF v_skipped < offsets THEN
                v_skipped := v_skipped + 1;
            ELSE
                name := split_part(rtrim(storage.get_common_prefix(v_peek_name, v_prefix, v_delimiter), v_delimiter), v_delimiter, levels);
                id := NULL;
                updated_at := NULL;
                created_at := NULL;
                last_accessed_at := NULL;
                metadata := NULL;
                RETURN NEXT;
                v_count := v_count + 1;
            END IF;

            -- Advance seek past the folder range
            IF v_is_asc THEN
                v_next_seek := lower(left(v_common_prefix, -1)) || chr(ascii(v_delimiter) + 1);
            ELSE
                v_next_seek := lower(v_common_prefix);
            END IF;
        ELSE
            -- FILE: Batch fetch using DYNAMIC SQL (overhead amortized over many rows)
            -- For ASC: upper_bound is the exclusive upper limit (< condition)
            -- For DESC: prefix_lower is the inclusive lower limit (>= condition)
            FOR v_current IN EXECUTE v_batch_query
                USING bucketname, v_next_seek,
                    CASE WHEN v_is_asc THEN COALESCE(v_upper_bound, v_prefix_lower) ELSE v_prefix_lower END, v_file_batch_size
            LOOP
                v_common_prefix := storage.get_common_prefix(lower(v_current.name), v_prefix_lower, v_delimiter);

                IF v_common_prefix IS NOT NULL THEN
                    -- Hit a folder: exit batch, let peek handle it
                    v_next_seek := lower(v_current.name);
                    EXIT;
                END IF;

                -- Handle offset skipping
                IF v_skipped < offsets THEN
                    v_skipped := v_skipped + 1;
                ELSE
                    -- Emit file
                    name := split_part(v_current.name, v_delimiter, levels);
                    id := v_current.id;
                    updated_at := v_current.updated_at;
                    created_at := v_current.created_at;
                    last_accessed_at := v_current.last_accessed_at;
                    metadata := v_current.metadata;
                    RETURN NEXT;
                    v_count := v_count + 1;
                END IF;

                -- Advance seek past this file
                IF v_is_asc THEN
                    v_next_seek := lower(v_current.name) || v_delimiter;
                ELSE
                    v_next_seek := lower(v_current.name);
                END IF;

                EXIT WHEN v_count >= v_limit;
            END LOOP;
        END IF;
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.search_by_timestamp(p_prefix text, p_bucket_id text, p_limit integer, p_level integer, p_start_after text, p_sort_order text, p_sort_column text, p_sort_column_after text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_cursor_op text;
    v_query text;
    v_prefix text;
BEGIN
    v_prefix := coalesce(p_prefix, '');

    IF p_sort_order = 'asc' THEN
        v_cursor_op := '>';
    ELSE
        v_cursor_op := '<';
    END IF;

    v_query := format($sql$
        WITH raw_objects AS (
            SELECT
                o.name AS obj_name,
                o.id AS obj_id,
                o.updated_at AS obj_updated_at,
                o.created_at AS obj_created_at,
                o.last_accessed_at AS obj_last_accessed_at,
                o.metadata AS obj_metadata,
                storage.get_common_prefix(o.name, $1, '/') AS common_prefix
            FROM storage.objects o
            WHERE o.bucket_id = $2
              AND o.name COLLATE "C" LIKE $1 || '%%'
        ),
        -- Aggregate common prefixes (folders)
        -- Both created_at and updated_at use MIN(obj_created_at) to match the old prefixes table behavior
        aggregated_prefixes AS (
            SELECT
                rtrim(common_prefix, '/') AS name,
                NULL::uuid AS id,
                MIN(obj_created_at) AS updated_at,
                MIN(obj_created_at) AS created_at,
                NULL::timestamptz AS last_accessed_at,
                NULL::jsonb AS metadata,
                TRUE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NOT NULL
            GROUP BY common_prefix
        ),
        leaf_objects AS (
            SELECT
                obj_name AS name,
                obj_id AS id,
                obj_updated_at AS updated_at,
                obj_created_at AS created_at,
                obj_last_accessed_at AS last_accessed_at,
                obj_metadata AS metadata,
                FALSE AS is_prefix
            FROM raw_objects
            WHERE common_prefix IS NULL
        ),
        combined AS (
            SELECT * FROM aggregated_prefixes
            UNION ALL
            SELECT * FROM leaf_objects
        ),
        filtered AS (
            SELECT *
            FROM combined
            WHERE (
                $5 = ''
                OR ROW(
                    date_trunc('milliseconds', %I),
                    name COLLATE "C"
                ) %s ROW(
                    COALESCE(NULLIF($6, '')::timestamptz, 'epoch'::timestamptz),
                    $5
                )
            )
        )
        SELECT
            split_part(name, '/', $3) AS key,
            name,
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
        FROM filtered
        ORDER BY
            COALESCE(date_trunc('milliseconds', %I), 'epoch'::timestamptz) %s,
            name COLLATE "C" %s
        LIMIT $4
    $sql$,
        p_sort_column,
        v_cursor_op,
        p_sort_column,
        p_sort_order,
        p_sort_order
    );

    RETURN QUERY EXECUTE v_query
    USING v_prefix, p_bucket_id, p_level, p_limit, p_start_after, p_sort_column_after;
END;
$function$
;

CREATE OR REPLACE FUNCTION storage.search_v2(prefix text, bucket_name text, limits integer DEFAULT 100, levels integer DEFAULT 1, start_after text DEFAULT ''::text, sort_order text DEFAULT 'asc'::text, sort_column text DEFAULT 'name'::text, sort_column_after text DEFAULT ''::text)
 RETURNS TABLE(key text, name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
 LANGUAGE plpgsql
 STABLE
AS $function$
DECLARE
    v_sort_col text;
    v_sort_ord text;
    v_limit int;
BEGIN
    -- Cap limit to maximum of 1500 records
    v_limit := LEAST(coalesce(limits, 100), 1500);

    -- Validate and normalize sort_order
    v_sort_ord := lower(coalesce(sort_order, 'asc'));
    IF v_sort_ord NOT IN ('asc', 'desc') THEN
        v_sort_ord := 'asc';
    END IF;

    -- Validate and normalize sort_column
    v_sort_col := lower(coalesce(sort_column, 'name'));
    IF v_sort_col NOT IN ('name', 'updated_at', 'created_at') THEN
        v_sort_col := 'name';
    END IF;

    -- Route to appropriate implementation
    IF v_sort_col = 'name' THEN
        -- Use list_objects_with_delimiter for name sorting (most efficient: O(k * log n))
        RETURN QUERY
        SELECT
            split_part(l.name, '/', levels) AS key,
            l.name AS name,
            l.id,
            l.updated_at,
            l.created_at,
            l.last_accessed_at,
            l.metadata
        FROM storage.list_objects_with_delimiter(
            bucket_name,
            coalesce(prefix, ''),
            '/',
            v_limit,
            start_after,
            '',
            v_sort_ord
        ) l;
    ELSE
        -- Use aggregation approach for timestamp sorting
        -- Not efficient for large datasets but supports correct pagination
        RETURN QUERY SELECT * FROM storage.search_by_timestamp(
            prefix, bucket_name, v_limit, levels, start_after,
            v_sort_ord, v_sort_col, sort_column_after
        );
    END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_storage_usage()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$                                                                                                 
  begin                                                     
    if tg_op = 'INSERT' then
      insert into public.user_storage_usage (user_id, total_bytes, file_count, updated_at)
      values (new.user_id, new.file_size, 1, now())                                                                     
      on conflict (user_id) do update set
        total_bytes = user_storage_usage.total_bytes + new.file_size,                                                   
        file_count = user_storage_usage.file_count + 1,                                                                 
        updated_at = now();                                                                                             
      return new;                                                                                                       
    elsif tg_op = 'DELETE' then                                                                                         
      update public.user_storage_usage set                  
        total_bytes = greatest(0, total_bytes - old.file_size),
        file_count = greatest(0, file_count - 1),                                                                       
        updated_at = now()
      where user_id = old.user_id;                                                                                      
      return old;                                           
    end if;
    return null;                                                                                                        
  end;                                                                                                                  
  $function$
;

CREATE OR REPLACE FUNCTION public.update_symptom_contributions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION storage.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$function$
;


-- ============ constraints, indexes, triggers, rls, policies ============

alter table account_deletion_requests add constraint account_deletion_requests_pkey PRIMARY KEY (id);
alter table account_deletion_requests add constraint account_deletion_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'completed'::text])));
alter table ai_insights_log add constraint ai_insights_log_pkey PRIMARY KEY (id);
alter table ai_usage add constraint ai_usage_pkey PRIMARY KEY (id);
alter table ai_usage add constraint ai_usage_user_id_month_key UNIQUE (user_id, month);
alter table analysis_data add constraint analysis_data_pkey PRIMARY KEY (id);
alter table analysis_data add constraint analysis_data_user_id_night_date_key UNIQUE (user_id, night_date);
alter table analysis_sessions add constraint analysis_sessions_pkey PRIMARY KEY (id);
alter table consent_audit add constraint consent_audit_action_check CHECK ((action = ANY (ARRAY['granted'::text, 'withdrawn'::text])));
alter table consent_audit add constraint consent_audit_consent_type_check CHECK ((consent_type = ANY (ARRAY['ai_insights'::text, 'data_contribution'::text, 'cloud_storage'::text, 'email_notifications'::text])));
alter table consent_audit add constraint consent_audit_pkey PRIMARY KEY (id);
alter table daily_usage_snapshots add constraint daily_usage_snapshots_pkey PRIMARY KEY (id);
alter table daily_usage_snapshots add constraint daily_usage_snapshots_snapshot_date_key UNIQUE (snapshot_date);
alter table data_contributions add constraint data_contributions_pkey PRIMARY KEY (id);
alter table device_diagnostics add constraint device_diagnostics_pkey PRIMARY KEY (id);
alter table discord_digest_events add constraint discord_digest_events_digest_type_check CHECK ((digest_type = ANY (ARRAY['strategy'::text, 'weekly'::text])));
alter table discord_digest_events add constraint discord_digest_events_pkey PRIMARY KEY (id);
alter table discord_pending_roles add constraint discord_pending_roles_pkey PRIMARY KEY (id);
alter table discord_pending_roles add constraint discord_pending_roles_user_id_role_id_key UNIQUE (user_id, role_id);
alter table discord_role_events add constraint discord_role_events_action_check CHECK ((action = ANY (ARRAY['assign'::text, 'revoke'::text, 'assign_failed'::text, 'revoke_failed'::text])));
alter table discord_role_events add constraint discord_role_events_pkey PRIMARY KEY (id);
alter table email_log add constraint email_log_pkey PRIMARY KEY (id);
alter table email_log add constraint email_log_resend_id_key UNIQUE (resend_id);
alter table email_sequences add constraint email_sequences_pkey PRIMARY KEY (id);
alter table email_sequences add constraint email_sequences_user_id_sequence_name_step_key UNIQUE (user_id, sequence_name, step);
alter table error_submissions add constraint error_submissions_pkey PRIMARY KEY (id);
alter table feedback add constraint feedback_pkey PRIMARY KEY (id);
alter table kv_alert_dedup add constraint kv_alert_dedup_pkey PRIMARY KEY (key);
alter table oximetry_trace_contributions add constraint oximetry_trace_contributions_pkey PRIMARY KEY (id);
alter table premium_interest add constraint premium_interest_email_feature_key UNIQUE (email, feature);
alter table premium_interest add constraint premium_interest_pkey PRIMARY KEY (id);
alter table profiles add constraint profiles_discord_id_key UNIQUE (discord_id);
alter table profiles add constraint profiles_pkey PRIMARY KEY (id);
alter table profiles add constraint profiles_stripe_customer_id_key UNIQUE (stripe_customer_id);
alter table profiles add constraint profiles_tier_check CHECK ((tier = ANY (ARRAY['community'::text, 'supporter'::text, 'champion'::text])));
alter table provider_interest add constraint provider_interest_pkey PRIMARY KEY (id);
alter table remind_requests add constraint remind_requests_pkey PRIMARY KEY (id);
alter table remind_requests add constraint remind_requests_unsubscribe_token_key UNIQUE (unsubscribe_token);
alter table shared_analyses add constraint shared_analyses_pkey PRIMARY KEY (id);
alter table signal_daily_counts add constraint signal_daily_counts_pkey PRIMARY KEY (id);
alter table signal_daily_counts add constraint signal_daily_counts_signal_type_signal_date_key UNIQUE (signal_type, signal_date);
alter table storage.buckets add constraint buckets_pkey PRIMARY KEY (id);
alter table storage.buckets_analytics add constraint buckets_analytics_pkey PRIMARY KEY (id);
alter table storage.buckets_vectors add constraint buckets_vectors_pkey PRIMARY KEY (id);
alter table storage.migrations add constraint migrations_name_key UNIQUE (name);
alter table storage.migrations add constraint migrations_pkey PRIMARY KEY (id);
alter table storage.objects add constraint objects_pkey PRIMARY KEY (id);
alter table storage.s3_multipart_uploads add constraint s3_multipart_uploads_pkey PRIMARY KEY (id);
alter table storage.s3_multipart_uploads_parts add constraint s3_multipart_uploads_parts_pkey PRIMARY KEY (id);
alter table storage.vector_indexes add constraint vector_indexes_pkey PRIMARY KEY (id);
alter table stripe_events add constraint stripe_events_pkey PRIMARY KEY (event_id);
alter table stripe_events add constraint stripe_events_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'failed'::text, 'dead'::text])));
alter table subscribers add constraint subscribers_email_source_key UNIQUE (email, source);
alter table subscribers add constraint subscribers_pkey PRIMARY KEY (id);
alter table subscription_events add constraint subscription_events_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'updated'::text, 'cancelled'::text, 'renewed'::text, 'past_due'::text])));
alter table subscription_events add constraint subscription_events_pkey PRIMARY KEY (id);
alter table subscriptions add constraint subscriptions_pkey PRIMARY KEY (id);
alter table subscriptions add constraint subscriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'past_due'::text, 'canceled'::text, 'trialing'::text, 'incomplete'::text, 'incomplete_expired'::text, 'paused'::text, 'unpaid'::text])));
alter table subscriptions add constraint subscriptions_stripe_subscription_id_key UNIQUE (stripe_subscription_id);
alter table subscriptions add constraint subscriptions_tier_check CHECK ((tier = ANY (ARRAY['supporter'::text, 'champion'::text])));
alter table symptom_contributions add constraint symptom_contributions_dedup_hash_key UNIQUE (dedup_hash);
alter table symptom_contributions add constraint symptom_contributions_pkey PRIMARY KEY (id);
alter table symptom_contributions add constraint symptom_contributions_symptom_rating_check CHECK (((symptom_rating >= 1) AND (symptom_rating <= 5)));
alter table unsupported_device_submissions add constraint unsupported_device_submissions_pkey PRIMARY KEY (id);
alter table unsupported_device_submissions add constraint valid_status CHECK ((status = ANY (ARRAY['pending'::text, 'analyzing'::text, 'supported'::text, 'wont-support'::text])));
alter table user_files add constraint user_files_pkey PRIMARY KEY (id);
alter table user_files add constraint user_files_user_id_storage_path_key UNIQUE (user_id, storage_path);
alter table user_nights add constraint user_nights_pkey PRIMARY KEY (id);
alter table user_nights add constraint user_nights_user_id_night_date_key UNIQUE (user_id, night_date);
alter table user_storage_usage add constraint user_storage_usage_pkey PRIMARY KEY (user_id);
alter table waitlist add constraint waitlist_email_key UNIQUE (email);
alter table waitlist add constraint waitlist_pkey PRIMARY KEY (id);
alter table waveform_contributions add constraint waveform_contributions_pkey PRIMARY KEY (id);
alter table account_deletion_requests add constraint account_deletion_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table ai_insights_log add constraint ai_insights_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table ai_usage add constraint ai_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table analysis_data add constraint analysis_data_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table consent_audit add constraint consent_audit_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table data_contributions add constraint data_contributions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
alter table discord_pending_roles add constraint discord_pending_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table discord_role_events add constraint discord_role_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table email_log add constraint email_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table email_sequences add constraint email_sequences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table email_sequences add constraint email_sequences_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table feedback add constraint feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
alter table shared_analyses add constraint shared_analyses_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table storage.objects add constraint "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
alter table storage.s3_multipart_uploads add constraint s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
alter table storage.s3_multipart_uploads_parts add constraint s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);
alter table storage.s3_multipart_uploads_parts add constraint s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;
alter table storage.vector_indexes add constraint vector_indexes_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets_vectors(id);
alter table subscription_events add constraint subscription_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
alter table subscriptions add constraint subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table user_files add constraint user_files_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table user_nights add constraint user_nights_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table user_storage_usage add constraint user_storage_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
alter table waveform_contributions add constraint waveform_contributions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL;
CREATE INDEX idx_ai_insights_log_created ON public.ai_insights_log USING btree (created_at DESC);
CREATE INDEX idx_ai_insights_log_user ON public.ai_insights_log USING btree (user_id, created_at DESC);
CREATE INDEX idx_ai_usage_user_month ON public.ai_usage USING btree (user_id, month);
CREATE INDEX idx_analysis_data_user ON public.analysis_data USING btree (user_id);
CREATE INDEX idx_analysis_data_user_date ON public.analysis_data USING btree (user_id, night_date);
CREATE INDEX idx_consent_audit_type ON public.consent_audit USING btree (consent_type, created_at DESC);
CREATE INDEX idx_consent_audit_user_id ON public.consent_audit USING btree (user_id);
CREATE INDEX idx_contributions_created ON public.data_contributions USING btree (created_at);
CREATE INDEX idx_data_contrib_user ON public.data_contributions USING btree (user_id);
CREATE INDEX idx_discord_digest_events_pending ON public.discord_digest_events USING btree (digest_type, created_at) WHERE (consumed_at IS NULL);
CREATE INDEX idx_email_log_resend_id ON public.email_log USING btree (resend_id) WHERE (resend_id IS NOT NULL);
CREATE INDEX idx_email_log_type_created ON public.email_log USING btree (email_type, created_at DESC);
CREATE INDEX idx_email_sequences_ab_analysis ON public.email_sequences USING btree (sequence_name, ab_variant) WHERE (ab_variant IS NOT NULL);
CREATE INDEX idx_email_sequences_complained ON public.email_sequences USING btree (sequence_name, complained_at) WHERE (complained_at IS NOT NULL);
CREATE INDEX idx_email_sequences_pending ON public.email_sequences USING btree (scheduled_at) WHERE (status = 'pending'::text);
CREATE INDEX idx_email_sequences_resend_id ON public.email_sequences USING btree (resend_id) WHERE (resend_id IS NOT NULL);
CREATE INDEX idx_error_submissions_created ON public.error_submissions USING btree (created_at);
CREATE INDEX idx_feedback_created_at ON public.feedback USING btree (created_at DESC);
CREATE INDEX idx_feedback_processed ON public.feedback USING btree (processed) WHERE (processed = false);
CREATE INDEX idx_feedback_type ON public.feedback USING btree (type);
CREATE INDEX idx_feedback_user_id ON public.feedback USING btree (user_id);
CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);
CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");
CREATE INDEX idx_objects_bucket_id_name_lower ON storage.objects USING btree (bucket_id, lower(name) COLLATE "C");
CREATE INDEX idx_oxtrace_contrib_cid ON public.oximetry_trace_contributions USING btree (contribution_id);
CREATE INDEX idx_oxtrace_contrib_created ON public.oximetry_trace_contributions USING btree (created_at);
CREATE INDEX idx_oxtrace_contrib_engine ON public.oximetry_trace_contributions USING btree (engine_version);
CREATE INDEX idx_profiles_discord_id ON public.profiles USING btree (discord_id) WHERE (discord_id IS NOT NULL);
CREATE INDEX idx_profiles_discord_sync_candidates ON public.profiles USING btree (discord_sync_error_count) WHERE ((discord_id IS NULL) AND (discord_username IS NOT NULL));
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles USING btree (stripe_customer_id);
CREATE INDEX idx_remind_requests_pending ON public.remind_requests USING btree (created_at) WHERE ((reminded_at IS NULL) AND (unsubscribed_at IS NULL));
CREATE INDEX idx_remind_requests_unsubscribe_token ON public.remind_requests USING btree (unsubscribe_token);
CREATE INDEX idx_shared_analyses_expires ON public.shared_analyses USING btree (expires_at);
CREATE INDEX idx_stripe_events_processed ON public.stripe_events USING btree (processed_at);
CREATE INDEX idx_stripe_events_redrive ON public.stripe_events USING btree (status, updated_at);
CREATE INDEX idx_subscribers_email ON public.subscribers USING btree (email);
CREATE INDEX idx_subscription_events_type ON public.subscription_events USING btree (event_type, created_at);
CREATE INDEX idx_subscription_events_user ON public.subscription_events USING btree (user_id, created_at);
CREATE INDEX idx_subscriptions_stripe_sub_id ON public.subscriptions USING btree (stripe_subscription_id);
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions USING btree (user_id);
CREATE INDEX idx_symptom_contributions_ifl_risk ON public.symptom_contributions USING btree (ifl_risk);
CREATE INDEX idx_symptom_contributions_pressure_bucket ON public.symptom_contributions USING btree (pressure_bucket);
CREATE INDEX idx_usage_snapshots_date ON public.daily_usage_snapshots USING btree (snapshot_date DESC);
CREATE INDEX idx_user_files_confirmed ON public.user_files USING btree (user_id, file_hash) WHERE (upload_confirmed = true);
CREATE INDEX idx_user_files_hash ON public.user_files USING btree (user_id, file_hash);
CREATE INDEX idx_user_files_user_id ON public.user_files USING btree (user_id);
CREATE INDEX idx_user_files_user_night ON public.user_files USING btree (user_id, night_date);
CREATE INDEX idx_user_nights_user_date ON public.user_nights USING btree (user_id, night_date DESC);
CREATE INDEX idx_user_nights_user_id ON public.user_nights USING btree (user_id);
CREATE INDEX idx_waveform_contrib_cid ON public.waveform_contributions USING btree (contribution_id);
CREATE INDEX idx_waveform_contrib_created ON public.waveform_contributions USING btree (created_at);
CREATE INDEX idx_waveform_contrib_engine ON public.waveform_contributions USING btree (engine_version);
CREATE INDEX idx_waveform_contrib_user ON public.waveform_contributions USING btree (user_id);
CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);
CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);
CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);
CREATE UNIQUE INDEX buckets_analytics_unique_name_idx ON storage.buckets_analytics USING btree (name) WHERE (deleted_at IS NULL);
CREATE UNIQUE INDEX uq_subscription_events_stripe_event_id ON public.subscription_events USING btree (stripe_event_id);
CREATE UNIQUE INDEX vector_indexes_name_bucket_id_idx ON storage.vector_indexes USING btree (name, bucket_id);
CREATE TRIGGER ai_usage_updated_at BEFORE UPDATE ON public.ai_usage FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER enforce_bucket_name_length_trigger BEFORE INSERT OR UPDATE OF name ON storage.buckets FOR EACH ROW EXECUTE FUNCTION storage.enforce_bucket_name_length();
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER protect_buckets_delete BEFORE DELETE ON storage.buckets FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER protect_objects_delete BEFORE DELETE ON storage.objects FOR EACH STATEMENT EXECUTE FUNCTION storage.protect_delete();
CREATE TRIGGER stripe_events_updated_at BEFORE UPDATE ON public.stripe_events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_symptom_contributions_updated_at BEFORE UPDATE ON public.symptom_contributions FOR EACH ROW EXECUTE FUNCTION update_symptom_contributions_updated_at();
CREATE TRIGGER trg_user_files_usage AFTER INSERT OR DELETE ON public.user_files FOR EACH ROW EXECUTE FUNCTION update_storage_usage();
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();
CREATE TRIGGER user_nights_updated_at BEFORE UPDATE ON public.user_nights FOR EACH ROW EXECUTE FUNCTION update_updated_at();
alter table account_deletion_requests enable row level security;
alter table ai_insights_log enable row level security;
alter table ai_usage enable row level security;
alter table analysis_data enable row level security;
alter table analysis_sessions enable row level security;
alter table consent_audit enable row level security;
alter table daily_usage_snapshots enable row level security;
alter table data_contributions enable row level security;
alter table device_diagnostics enable row level security;
alter table discord_digest_events enable row level security;
alter table discord_pending_roles enable row level security;
alter table discord_role_events enable row level security;
alter table email_log enable row level security;
alter table email_sequences enable row level security;
alter table error_submissions enable row level security;
alter table feedback enable row level security;
alter table kv_alert_dedup enable row level security;
alter table oximetry_trace_contributions enable row level security;
alter table premium_interest enable row level security;
alter table profiles enable row level security;
alter table provider_interest enable row level security;
alter table remind_requests enable row level security;
alter table shared_analyses enable row level security;
alter table signal_daily_counts enable row level security;
alter table storage.buckets enable row level security;
alter table storage.buckets_analytics enable row level security;
alter table storage.buckets_vectors enable row level security;
alter table storage.migrations enable row level security;
alter table storage.objects enable row level security;
alter table storage.s3_multipart_uploads enable row level security;
alter table storage.s3_multipart_uploads_parts enable row level security;
alter table storage.vector_indexes enable row level security;
alter table stripe_events enable row level security;
alter table subscribers enable row level security;
alter table subscription_events enable row level security;
alter table subscriptions enable row level security;
alter table symptom_contributions enable row level security;
alter table unsupported_device_submissions enable row level security;
alter table user_files enable row level security;
alter table user_nights enable row level security;
alter table user_storage_usage enable row level security;
alter table waitlist enable row level security;
alter table waveform_contributions enable row level security;
create policy "Anyone can insert feedback" on public.feedback as PERMISSIVE for INSERT to public with check (true);
create policy "Deny public updates to shared analyses" on public.shared_analyses as PERMISSIVE for UPDATE to public using (false) with check (false);
create policy "Service role can insert provider interest" on public.provider_interest as PERMISSIVE for INSERT to service_role with check (true);
create policy "Service role can insert shared analyses" on public.shared_analyses as PERMISSIVE for INSERT to public with check (true);
create policy "Service role full access ai_insights_log" on public.ai_insights_log as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access ai_usage" on public.ai_usage as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access daily_usage_snapshots" on public.daily_usage_snapshots as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access nights" on public.user_nights as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access on analysis data" on public.analysis_data as PERMISSIVE for ALL to public using ((( SELECT auth.role() AS role) = 'service_role'::text));
create policy "Service role full access on user_files" on public.user_files as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access on user_storage_usage" on public.user_storage_usage as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access stripe_events" on public.stripe_events as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access subscriptions" on public.subscriptions as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access" on public.account_deletion_requests as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access" on public.analysis_sessions as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "Service role full access" on public.data_contributions as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "Service role full access" on public.email_log as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access" on public.email_sequences as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access" on public.feedback as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "Service role full access" on public.premium_interest as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "Service role full access" on public.profiles as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Service role full access" on public.subscribers as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "Service role full access" on public.waitlist as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy "Service role only" on public.subscription_events as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy "Users can delete own analysis data" on public.analysis_data as PERMISSIVE for DELETE to public using ((auth.uid() = user_id));
create policy "Users can delete their own files 84ce0l_0" on storage.objects as PERMISSIVE for DELETE to public using (((bucket_id = 'user-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
create policy "Users can delete their own files 84ce0l_1" on storage.objects as PERMISSIVE for SELECT to public using (((bucket_id = 'user-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
create policy "Users can delete their own files" on public.user_files as PERMISSIVE for DELETE to public using ((auth.uid() = user_id));
create policy "Users can insert own consent records" on public.consent_audit as PERMISSIVE for INSERT to authenticated with check ((auth.uid() = user_id));
create policy "Users can insert their own files" on public.user_files as PERMISSIVE for INSERT to public with check ((auth.uid() = user_id));
create policy "Users can read own analysis data" on public.analysis_data as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users can read their own files 84ce0l_0" on storage.objects as PERMISSIVE for SELECT to public using (((bucket_id = 'user-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
create policy "Users can read their own files" on public.user_files as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users can read their own storage usage" on public.user_storage_usage as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users can request their own deletion" on public.account_deletion_requests as PERMISSIVE for INSERT to authenticated with check ((auth.uid() = user_id));
create policy "Users can upload their own files 84ce0l_0" on storage.objects as PERMISSIVE for INSERT to public with check (((bucket_id = 'user-files'::text) AND ((auth.uid())::text = (storage.foldername(name))[1])));
create policy "Users can view own consent history" on public.consent_audit as PERMISSIVE for SELECT to authenticated using ((auth.uid() = user_id));
create policy "Users can view own pending roles" on public.discord_pending_roles as PERMISSIVE for SELECT to public using ((user_id = auth.uid()));
create policy "Users can view own role events" on public.discord_role_events as PERMISSIVE for SELECT to public using ((user_id = auth.uid()));
create policy "Users can view own sequences" on public.email_sequences as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users can view their own requests" on public.account_deletion_requests as PERMISSIVE for SELECT to authenticated using ((auth.uid() = user_id));
create policy "Users delete own nights" on public.user_nights as PERMISSIVE for DELETE to public using ((auth.uid() = user_id));
create policy "Users insert own nights" on public.user_nights as PERMISSIVE for INSERT to public with check ((auth.uid() = user_id));
create policy "Users read own ai_usage" on public.ai_usage as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users read own nights" on public.user_nights as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users read own profile" on public.profiles as PERMISSIVE for SELECT to public using ((auth.uid() = id));
create policy "Users read own subscriptions" on public.subscriptions as PERMISSIVE for SELECT to public using ((auth.uid() = user_id));
create policy "Users update own nights" on public.user_nights as PERMISSIVE for UPDATE to public using ((auth.uid() = user_id)) with check ((auth.uid() = user_id));
create policy "Users update own profile" on public.profiles as PERMISSIVE for UPDATE to public using ((auth.uid() = id)) with check ((auth.uid() = id));
create policy "service role only" on public.discord_digest_events as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text)) with check ((auth.role() = 'service_role'::text));
create policy service_role_all on public.error_submissions as PERMISSIVE for ALL to public using ((auth.role() = 'service_role'::text));
create policy service_role_delete_shared_files on storage.objects as PERMISSIVE for DELETE to service_role using ((bucket_id = 'shared-files'::text));
create policy service_role_insert_shared_files on storage.objects as PERMISSIVE for INSERT to service_role with check ((bucket_id = 'shared-files'::text));
create policy service_role_only on public.unsupported_device_submissions as PERMISSIVE for ALL to service_role using (true);
create policy service_role_select_shared_files on storage.objects as PERMISSIVE for SELECT to service_role using ((bucket_id = 'shared-files'::text));

-- ── MCP patch (2026-06-08): objects the structure-only dump dropped ──────────
-- A canonical `supabase db dump` was unavailable (no local DB creds), so these
-- were extracted from prod via the Supabase MCP to close the baseline↔prod gap
-- (the share_analytics reporting view + two serial sequences). None are exercised
-- by the current GATE tests; a future canonical dump supersedes this block.
create sequence if not exists public.ai_insights_log_id_seq as bigint start with 1 increment by 1 minvalue 1 maxvalue 9223372036854775807 no cycle;
create sequence if not exists public.symptom_contributions_id_seq as bigint start with 1 increment by 1 minvalue 1 maxvalue 9223372036854775807 no cycle;
create view public.share_analytics as  SELECT date_trunc('day'::text, created_at) AS day,
    count(*) AS shares_created,
    sum(
        CASE
            WHEN share_scope = 'single'::text THEN 1
            ELSE 0
        END) AS single_night_shares,
    sum(
        CASE
            WHEN share_scope = 'all'::text THEN 1
            ELSE 0
        END) AS all_nights_shares,
    avg(nights_count) AS avg_nights_per_share,
    sum(access_count) AS total_views,
    avg(access_count) AS avg_views_per_share,
    count(
        CASE
            WHEN access_count > 0 THEN 1
            ELSE NULL::integer
        END) AS shares_actually_viewed,
    round(count(
        CASE
            WHEN access_count > 0 THEN 1
            ELSE NULL::integer
        END)::numeric / NULLIF(count(*), 0)::numeric * 100::numeric, 1) AS view_rate_pct
   FROM shared_analyses
  GROUP BY (date_trunc('day'::text, created_at))
  ORDER BY (date_trunc('day'::text, created_at)) DESC;
