-- ============================================================
-- AirwayLab — Auth & Subscriptions
-- Adds user profiles, Stripe subscriptions, and cloud sync.
-- ============================================================

-- 1. Profiles — extends auth.users
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  stripe_customer_id text unique,
  tier text not null default 'community' check (tier in ('community', 'supporter', 'champion')),
  show_on_supporters boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read and update their own profile
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Service role can do everything (webhook updates)
create policy "Service role full access"
  on public.profiles for all
  using (auth.role() = 'service_role');

-- 2. Subscriptions — Stripe subscription state
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_subscription_id text unique not null,
  stripe_price_id text not null,
  status text not null check (status in ('active', 'past_due', 'canceled', 'trialing', 'incomplete', 'incomplete_expired', 'paused', 'unpaid')),
  tier text not null check (tier in ('supporter', 'champion')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

create policy "Users read own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Service role full access subscriptions"
  on public.subscriptions for all
  using (auth.role() = 'service_role');

-- 3. User nights — cloud-synced analysis data
create table public.user_nights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  night_date date not null,
  analysis_data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, night_date)
);

alter table public.user_nights enable row level security;

create policy "Users read own nights"
  on public.user_nights for select
  using (auth.uid() = user_id);

create policy "Users insert own nights"
  on public.user_nights for insert
  with check (auth.uid() = user_id);

create policy "Users update own nights"
  on public.user_nights for update
  using (auth.uid() = user_id);

create policy "Users delete own nights"
  on public.user_nights for delete
  using (auth.uid() = user_id);

create policy "Service role full access nights"
  on public.user_nights for all
  using (auth.role() = 'service_role');

-- 4. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.update_updated_at();

create trigger user_nights_updated_at
  before update on public.user_nights
  for each row execute function public.update_updated_at();

-- 6. Indexes
create index idx_subscriptions_user_id on public.subscriptions(user_id);
create index idx_subscriptions_stripe_sub_id on public.subscriptions(stripe_subscription_id);
create index idx_user_nights_user_id on public.user_nights(user_id);
create index idx_profiles_stripe_customer_id on public.profiles(stripe_customer_id);
