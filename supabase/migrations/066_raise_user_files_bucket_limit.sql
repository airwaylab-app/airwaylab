-- ============================================================
-- AirwayLab — Raise user-files bucket file_size_limit 50MB -> 200MB
-- ============================================================
-- Migration 062 pinned each bucket's file_size_limit to its app constant
-- (user-files = 50 MB, shared-files = 200 MB). High-resolution ResMed
-- BRP.edf files for a full SD-card session can exceed 50 MB, so a valid
-- upload could pass and then fail at Storage with HTTP 413. Raise the
-- user-files cap to 200 MB to match the app constant (MAX_FILE_SIZE in
-- lib/storage/types.ts) and the shared-files bucket.
--
-- Permissive widening: only larger files become allowed; no existing
-- object or upload is affected. UPDATE is idempotent.
--
-- If MAX_FILE_SIZE in lib/storage/types.ts changes again, update this value
-- so the bucket limit keeps tracking the app cap exactly.
-- ============================================================

-- user-files: 200 MB = 200 * 1024 * 1024 = 209715200 bytes
--   tracks MAX_FILE_SIZE in lib/storage/types.ts
update storage.buckets
  set file_size_limit = 209715200
  where id = 'user-files';
