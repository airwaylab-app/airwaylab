-- ============================================================
-- AirwayLab — Upload Confirmation Flag
-- Distinguishes completed uploads from orphaned presign rows.
-- Presign inserts with confirmed = false. Confirm sets to true.
-- check-hashes only returns confirmed rows. Unconfirmed rows
-- older than 1 hour are cleaned up on next presign.
-- ============================================================

-- Add confirmation flag. Default true so all existing rows
-- (which completed the full upload cycle) are treated as confirmed.
-- New inserts from the updated presign route will explicitly set false.
alter table public.user_files
  add column if not exists upload_confirmed boolean not null default true;

-- Partial index for efficient check-hashes queries that filter on confirmed status
create index if not exists idx_user_files_confirmed
  on public.user_files(user_id, file_hash) where upload_confirmed = true;
