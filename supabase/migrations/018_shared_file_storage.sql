-- Migration: Add file storage support for shared analyses
-- Adds has_files boolean, file_paths JSONB, and created_by_user_id to shared_analyses.
-- Creates shared-files Storage bucket with service_role-only policies.
-- Updates cleanup function to return deleted IDs for Storage blob cleanup.

-- ── Schema changes ──────────────────────────────────────────

ALTER TABLE shared_analyses
  ADD COLUMN IF NOT EXISTS has_files boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS file_paths jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id);

-- ── Storage bucket ──────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shared-files',
  'shared-files',
  false,
  52428800, -- 50 MB per file
  ARRAY['application/octet-stream', 'application/x-edf']
)
ON CONFLICT (id) DO NOTHING;

-- Service-role-only policies (no user-facing access)
CREATE POLICY "service_role_insert_shared_files"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'shared-files');

CREATE POLICY "service_role_select_shared_files"
  ON storage.objects FOR SELECT
  TO service_role
  USING (bucket_id = 'shared-files');

CREATE POLICY "service_role_delete_shared_files"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'shared-files');

-- ── Updated cleanup function ────────────────────────────────
-- Returns deleted_ids so the cron can clean up Storage blobs.

CREATE OR REPLACE FUNCTION cleanup_expired_shared_analyses()
RETURNS TABLE(deleted_count integer, deleted_ids uuid[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;
