-- Extended stats RPC: returns all new aggregate counts in a single DB round-trip.
-- Used by /api/stats to surface raw upload and registration metrics.
-- SECURITY DEFINER bypasses RLS so the public API can read counts without auth.

CREATE OR REPLACE FUNCTION public.get_extended_stats()
RETURNS JSON LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT json_build_object(
    'unique_raw_uploaders',          (SELECT COUNT(DISTINCT user_id) FROM public.user_files),
    'total_raw_files',               (SELECT COUNT(*) FROM public.user_files),
    'total_waveform_contributions',  (SELECT COUNT(*) FROM public.waveform_contributions),
    'unique_waveform_contributors',  (SELECT COUNT(DISTINCT contribution_id) FROM public.waveform_contributions),
    'total_registered_users',        (SELECT COUNT(*) FROM public.profiles)
  );
$$;
