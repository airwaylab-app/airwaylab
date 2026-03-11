-- ============================================================
-- Migration 014: Cleanup functions + monitoring helpers
--
-- 1. cleanup_expired_shared_analyses() — deletes rows past TTL
-- 2. cleanup_old_analysis_sessions()   — deletes rows > 12 months
-- 3. get_storage_stats()               — returns DB + storage sizes
-- ============================================================

-- 1. Delete shared analyses past their 30-day expiry
CREATE OR REPLACE FUNCTION public.cleanup_expired_shared_analyses()
RETURNS TABLE(deleted_count bigint) AS $$
DECLARE
  _count bigint;
BEGIN
  DELETE FROM public.shared_analyses
  WHERE expires_at < now();

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN QUERY SELECT _count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Delete analysis sessions older than 12 months
CREATE OR REPLACE FUNCTION public.cleanup_old_analysis_sessions()
RETURNS TABLE(deleted_count bigint) AS $$
DECLARE
  _count bigint;
BEGIN
  DELETE FROM public.analysis_sessions
  WHERE created_at < now() - interval '12 months';

  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN QUERY SELECT _count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Storage stats for monitoring
-- Returns database size in bytes, plus row counts and estimated sizes
-- for the largest tables.
CREATE OR REPLACE FUNCTION public.get_storage_stats()
RETURNS json AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
