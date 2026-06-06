-- GATE-mode pre-shim: the minimal Supabase environment that supabase/baseline.sql
-- assumes but does not contain (roles, auth.users/auth.uid/auth.role, the two
-- extensions the schema uses). Prod gets these from the Supabase platform; CI
-- provides a stand-in so the baseline + migrations apply against plain Postgres.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

-- auth shim (GoTrue owns auth.users in real Supabase)
create schema if not exists auth;

create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text
);

create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon');
$$;

-- standard Supabase roles (the baseline's policies/grants reference these).
-- PostgREST connects as the `postgres` superuser in CI (it exists from container
-- init, so there is no cold-start race while this shim runs) and SET ROLEs into
-- anon / service_role per the request JWT (PGRST_DB_ANON_ROLE=anon). Role
-- switching, not the login identity, is what the G5 client tests exercise, so the
-- per-role permission boundaries are faithful regardless of the login role.
do $$
begin
  if not exists (select from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
end $$;
