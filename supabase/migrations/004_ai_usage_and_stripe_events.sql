-- ============================================================
-- AirwayLab — AI Usage Tracking & Stripe Event Idempotency
-- Server-side enforcement of AI usage limits + webhook dedup.
-- ============================================================

-- 1. AI Usage — server-side monthly counter per user
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month text not null, -- 'YYYY-MM' format
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month)
);

alter table public.ai_usage enable row level security;

create policy "Users read own ai_usage"
  on public.ai_usage for select
  using (auth.uid() = user_id);

create policy "Service role full access ai_usage"
  on public.ai_usage for all
  using (auth.role() = 'service_role');

-- 2. Stripe Events — webhook idempotency
create table if not exists public.stripe_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;

-- Only service role needs access (webhook handler)
create policy "Service role full access stripe_events"
  on public.stripe_events for all
  using (auth.role() = 'service_role');

-- 3. Indexes
create index if not exists idx_ai_usage_user_month on public.ai_usage(user_id, month);
create index if not exists idx_stripe_events_processed on public.stripe_events(processed_at);

-- 4. Updated_at trigger for ai_usage
create trigger ai_usage_updated_at
  before update on public.ai_usage
  for each row execute function public.update_updated_at();

-- 5. Cleanup: stripe_events older than 90 days can be purged
-- (run manually or via cron if needed)
