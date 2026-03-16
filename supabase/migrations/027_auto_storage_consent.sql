-- ============================================================
-- AirwayLab — Auto-enable storage consent for registered users
--
-- Context: CloudSyncNudge set localStorage but never synced
-- consent to the server. The presign endpoint checks the DB
-- column and returns 403, causing all file uploads to fail.
--
-- Fix:
--   1. Backfill all existing users to storage_consent = true
--   2. Update handle_new_user to auto-grant on signup
--   3. Set localStorage consent via the auth callback flow
-- ============================================================

-- 1. Backfill: all existing registered users get storage consent
update public.profiles
set storage_consent = true,
    storage_consent_at = now()
where storage_consent = false;

-- 2. Update the signup trigger to auto-grant storage consent
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, storage_consent, storage_consent_at)
  values (new.id, new.email, true, now());
  return new;
end;
$$ language plpgsql security definer set search_path = '';
