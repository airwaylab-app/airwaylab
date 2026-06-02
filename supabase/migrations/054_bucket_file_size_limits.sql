-- ============================================================
-- AirwayLab — Bucket-level file_size_limit enforcement
-- ============================================================
-- Signed-upload URLs and Zod size caps are enforced only in the
-- client/API layer. The Supabase storage buckets themselves did
-- not carry a real `file_size_limit`, so a client could declare a
-- small size to pass the API check and then upload an arbitrarily
-- large object through the signed URL.
--
-- This migration sets a server-side `file_size_limit` on both
-- buckets so Storage rejects oversized objects at the source,
-- independent of any client-declared size.
--
-- Caps match the existing per-file application constants:
--   user-files   : MAX_FILE_SIZE in lib/storage/types.ts        = 50 MB
--   shared-files : MAX_FILE_SIZE in app/api/share/files/route.ts = 50 MB
--
-- We UPDATE (rather than rely on INSERT) because:
--   * the `user-files` bucket was created out-of-band (dashboard/CLI,
--     see 007_raw_file_storage.sql) and never had a limit set in SQL;
--   * the `shared-files` bucket was created in 018 with an INSERT ...
--     ON CONFLICT DO NOTHING, so if the bucket already existed the
--     intended limit was silently skipped.
-- An explicit UPDATE is idempotent and enforces the cap in both cases.
-- ============================================================

-- 50 MB per file = 50 * 1024 * 1024 = 52428800 bytes

update storage.buckets
  set file_size_limit = 52428800
  where id = 'user-files';

update storage.buckets
  set file_size_limit = 52428800
  where id = 'shared-files';
