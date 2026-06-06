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
-- `authenticator` is the role PostgREST logs in as; it is NOINHERIT and member
-- of the three API roles so PostgREST can SET ROLE into them per the JWT `role`
-- claim (anon when unauthenticated). This mirrors the Supabase platform setup
-- and is what lets the G5 client tests hit real per-role permission boundaries.
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
  if not exists (select from pg_roles where rolname = 'authenticator') then
    -- password matches the PGRST_DB_URI in .github/workflows/integration-db.yml
    create role authenticator login noinherit password 'postgres';
  end if;
end $$;

grant anon, authenticated, service_role to authenticator;
