-- ============================================================
-- AirwayLab — Supabase Schema
-- Initial migration: email subscribers + future-proofing
-- ============================================================

-- 1. Email waitlist / newsletter subscribers
-- Used by /api/subscribe endpoint for "Notify me" flows
create table if not exists public.subscribers (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  source      text,            -- e.g. 'hero', 'post-analysis', 'pro-tease-trends-tab'
  created_at  timestamptz not null default now(),

  -- Prevent duplicate emails per source
  constraint subscribers_email_source_key unique (email, source)
);

-- Index for lookups by email
create index if not exists idx_subscribers_email on public.subscribers (email);

-- RLS: Only service_role can read/write (no anonymous access)
alter table public.subscribers enable row level security;

create policy "Service role full access" on public.subscribers
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


-- 2. Feedback submissions (future: in-app feedback form)
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  email       text,             -- optional, if user provides it
  message     text not null,
  page        text,             -- which page the feedback came from
  created_at  timestamptz not null default now()
);

alter table public.feedback enable row level security;

create policy "Service role full access" on public.feedback
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


-- 3. Analysis sessions (anonymous, aggregated telemetry — no PII)
-- Stores aggregate stats for product analytics, never raw sleep data
create table if not exists public.analysis_sessions (
  id              uuid primary key default gen_random_uuid(),
  night_count     int not null,
  has_oximetry    boolean not null default false,
  is_demo         boolean not null default false,
  duration_ms     int,             -- total processing time
  glasgow_avg     real,            -- session average Glasgow Index
  engines_used    text[],          -- ['glasgow', 'wat', 'ned', 'oximetry']
  export_formats  text[],          -- ['csv', 'json', 'forum']
  user_agent      text,            -- for browser stats (no fingerprinting)
  created_at      timestamptz not null default now()
);

alter table public.analysis_sessions enable row level security;

create policy "Service role full access" on public.analysis_sessions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


-- 4. Anonymous data contributions (opt-in research dataset)
-- Stores anonymised analysis metrics contributed by users
create table if not exists public.data_contributions (
  id                uuid primary key default gen_random_uuid(),
  contribution_id   text not null,            -- random per-submission ID (not linked to user)
  night_count       int not null,
  nights            jsonb not null,            -- anonymised NightResult[]
  has_oximetry      boolean default false,
  device_model      text,
  pap_mode          text,
  created_at        timestamptz not null default now()
);

create index if not exists idx_contributions_created on public.data_contributions (created_at);

alter table public.data_contributions enable row level security;

create policy "Service role full access" on public.data_contributions
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');


-- 5. Premium waitlist (future: paid tier interest)
create table if not exists public.premium_interest (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  feature     text,             -- which feature prompted interest
  source      text,             -- which pro-tease or CTA
  created_at  timestamptz not null default now(),

  constraint premium_interest_email_feature_key unique (email, feature)
);

alter table public.premium_interest enable row level security;

create policy "Service role full access" on public.premium_interest
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
