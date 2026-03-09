-- ============================================================
-- Fix Supabase security linter warnings
-- 1. Add missing RLS policies on data_contributions & waitlist
-- 2. Set search_path on handle_new_user & update_updated_at
-- ============================================================

-- 1a. RLS policy for data_contributions (service role only)
drop policy if exists "Service role full access" on public.data_contributions;

create policy "Service role full access" on public.data_contributions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 1b. RLS policy for waitlist (service role only)
drop policy if exists "Service role full access" on public.waitlist;

create policy "Service role full access" on public.waitlist
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 2a. Fix handle_new_user: set immutable search_path
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer set search_path = '';

-- 2b. Fix update_updated_at: set immutable search_path
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = '';
