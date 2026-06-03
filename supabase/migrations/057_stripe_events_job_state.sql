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
--
-- `dead` is the terminal poison state: a row that failed MAX_ATTEMPTS (5) times
-- is parked here so the re-drive never touches it again (HIGH 3).
alter table public.stripe_events
  add column if not exists status text not null default 'pending'
    check (status in ('pending', 'processing', 'done', 'failed', 'dead')),
  add column if not exists attempts int not null default 0,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

-- Backfill: pre-existing rows from the OLD route were kept only for
-- successfully-processed events (failures were deleted), so they are `done`.
--
-- HIGH 4 — age-gate the backfill. An event that is genuinely in flight at the
-- exact moment this migration runs would have a fresh `processed_at` and a
-- `pending` status; stamping it `done` would wrongly suppress its re-drive if it
-- then fails. Only mark rows whose last processing attempt is older than 5
-- minutes (comfortably past the 30s webhook maxDuration) — those are safely
-- historical. A row younger than that is left `pending` for the route/cron to
-- carry to its real terminal state.
update public.stripe_events
  set status = 'done'
  where status = 'pending'
    and processed_at < now() - interval '5 minutes';

-- Re-drive lookup index: the cron scans for failed + stale-processing rows.
create index if not exists idx_stripe_events_redrive
  on public.stripe_events (status, updated_at);

-- Keep updated_at fresh on every state transition (reuses the shared trigger
-- function from migration 003).
drop trigger if exists stripe_events_updated_at on public.stripe_events;
create trigger stripe_events_updated_at
  before update on public.stripe_events
  for each row execute function public.update_updated_at();
