-- ============================================================
-- AirwayLab — Align bucket file_size_limit with app per-file caps
-- ============================================================
-- Migration 054 pinned both storage buckets to 50 MB. Since then
-- the share-files API raised its per-file cap to 200 MB (full ResMed
-- SD cards can produce BRP.edf objects over 100 MB), but the bucket
-- limit stayed at 50 MB. Valid large uploads therefore passed the
-- API Zod check and then failed at Storage with HTTP 413.
--
-- This migration sets each bucket's `file_size_limit` EQUAL to the
-- authoritative application constant so the two cannot diverge:
--   user-files   : MAX_FILE_SIZE in lib/storage/types.ts        = 50 MB
--   shared-files : MAX_FILE_SIZE in app/api/share/files/route.ts = 200 MB
--
-- If either app constant changes, update the matching value here so
-- the bucket limit keeps tracking the app cap exactly.
--
-- UPDATE is idempotent and re-asserts the cap regardless of how the
-- bucket was originally created (see 054 for the create-path history).
-- ============================================================

-- user-files: 50 MB = 50 * 1024 * 1024 = 52428800 bytes
--   tracks MAX_FILE_SIZE in lib/storage/types.ts
update storage.buckets
  set file_size_limit = 52428800
  where id = 'user-files';

-- shared-files: 200 MB = 200 * 1024 * 1024 = 209715200 bytes
--   tracks MAX_FILE_SIZE in app/api/share/files/route.ts
update storage.buckets
  set file_size_limit = 209715200
  where id = 'shared-files';
