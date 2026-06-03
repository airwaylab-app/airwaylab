-- ============================================================
-- 057: Stripe webhook job-state (ST1)
-- Turns stripe_events from a pure idempotency ledger into a durable
-- job-state record so failed/stalled events can be re-driven.
--
-- ROOT CAUSE (pre-ST1): the webhook route returned 200 to Stripe BEFORE
-- processing, then on ANY processing failure DELETED the idempotency row.
-- Stripe had already received 200 so it never retried, and the deleted row
-- left no trace to re-drive from. Result: silently dropped billing events.
--
-- FIX: keep the row. Track its lifecycle (pending -> processing -> done,
-- or -> failed). A cron re-drives failed / stale-processing rows by
-- refetching the event from Stripe and reprocessing it idempotently.
--
-- Existing schema (migration 004):
--   stripe_events (event_id text primary key, event_type text not null,
--                  processed_at timestamptz not null default now())
-- processed_at is retained (it now means "last processed attempt time").
--
-- NOTE: apply via the Supabase SQL Editor on preview/staging first, then
-- production, BEFORE the ST1 code is promoted. The new route writes `status`
-- on insert; without this migration those inserts fail.
-- ============================================================

-- New job-state columns. Defaults make this safe to apply while the OLD
-- route is still live: pre-existing rows become 'pending' but are never
-- re-driven unless the new cron step runs (which only ships with the route).
alter table public.stripe_events
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed')),
  add column if not exists attempts int not null default 0,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill: any row that existed before this migration was, by definition,
-- already fully processed by the OLD route (the old route only kept rows for
-- successfully-processed events; failures were deleted). Mark them 'done' so
-- the re-drive never touches historical events.
update public.stripe_events
  set status = 'done'
  where status = 'pending';

-- Re-drive lookup index: the cron scans for failed + stale-processing rows.
create index if not exists idx_stripe_events_redrive
  on public.stripe_events (status, updated_at);

-- Keep updated_at fresh on every state transition (reuses the shared trigger
-- function from migration 003).
drop trigger if exists stripe_events_updated_at on public.stripe_events;
create trigger stripe_events_updated_at
  before update on public.stripe_events
  for each row execute function public.update_updated_at();
