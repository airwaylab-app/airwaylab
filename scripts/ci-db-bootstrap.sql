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

-- storage schema (the Supabase storage service owns this in prod; modelled
-- minimally here so the 6 storage-touching migrations replay). Only
-- storage.buckets + storage.objects are referenced by migrations.
create schema if not exists storage;

create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  public boolean default false,
  avif_autodetection boolean default false,
  file_size_limit bigint,
  allowed_mime_types text[],
  owner_id text,
  type text default 'STANDARD'
);

create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text,
  name text,
  owner uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata jsonb,
  path_tokens text[],
  version text,
  owner_id text,
  user_metadata jsonb
);

-- Out-of-band objects: these EXIST IN PROD but were created outside the migration
-- history (documented in 003_enable_rls_policies + 054_bucket_file_size_limits).
-- The migration history is NOT self-contained without them; modelling them here
-- (matching the prod schema) is what lets a fresh DB replay. See PR description.
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text default 'unknown',
  created_at timestamptz default now()
);
