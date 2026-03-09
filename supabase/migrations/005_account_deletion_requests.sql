-- 005: Account deletion requests
-- Stores user-initiated account deletion requests for manual processing.

create table if not exists public.account_deletion_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  reason      text,
  status      text not null default 'pending'
                check (status in ('pending', 'approved', 'rejected', 'completed')),
  created_at  timestamptz not null default now()
);

-- RLS: users can insert their own requests, only service role can read/update
alter table public.account_deletion_requests enable row level security;

create policy "Users can request their own deletion"
  on public.account_deletion_requests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can view their own requests"
  on public.account_deletion_requests
  for select
  to authenticated
  using (auth.uid() = user_id);
