-- ============================================================
-- Enable RLS on public.data_contributions and public.waitlist
-- Resolves Supabase lint: "RLS Disabled in Public" for both tables
-- ============================================================

-- 1. data_contributions
-- RLS was defined in 001_initial_schema.sql but may not be active;
-- re-enable (idempotent) and ensure a restrictive policy exists.
alter table public.data_contributions enable row level security;

-- Re-create service-role-only policy (drop first to avoid duplicate errors)
drop policy if exists "Service role full access" on public.data_contributions;

create policy "Service role full access" on public.data_contributions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


-- 2. waitlist
-- Table exists in production but was not created via migrations.
-- Enable RLS and restrict access to service_role only (the /api/subscribe
-- route uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS).
alter table public.waitlist enable row level security;

drop policy if exists "Service role full access" on public.waitlist;

create policy "Service role full access" on public.waitlist
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
