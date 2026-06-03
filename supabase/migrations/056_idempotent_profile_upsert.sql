-- ============================================================
-- AirwayLab — Harden handle_new_user trigger (idempotent)
--
-- Root cause of AIR-1762: the trigger used plain INSERT which
-- throws if the row already exists (e.g. due to a retry or
-- the new auth-callback server-side fallback). Change to
-- ON CONFLICT (id) DO NOTHING so the trigger is idempotent
-- and safe to call from multiple paths without conflicts.
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, storage_consent, storage_consent_at)
  values (new.id, new.email, true, now())
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = '';
