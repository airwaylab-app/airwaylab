-- Minimal Supabase-environment shim for replaying AirwayLab migrations into a
-- plain Postgres (no GoTrue / Supabase stack). Provides just enough for the
-- migrations to apply: FKs to auth.users, auth.uid()/auth.role() in RLS policies,
-- and the anon/authenticated/service_role roles the GRANTs reference.
--
-- This is a CI/test convenience only. Prod uses the real Supabase auth stack.

create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- auth schema + a stand-in users table (GoTrue owns this in real Supabase)
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

-- Standard Supabase roles (idempotent)
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
