-- ============================================================
-- 059: subscription_events dedup guard (ST1, BLOCKER 2 defence-in-depth)
-- The Stripe webhook re-drive (migration 057 + ST1 route) retries failed
-- events. The atomic claim in runStripeJob already guarantees each event is
-- processed at most once, but a second layer protects the analytics ledger: a
-- bug (or a future code path that bypasses the claim) must NEVER be able to
-- write two subscription_events rows for the same Stripe event, because
-- duplicates corrupt MRR/churn.
--
-- FIX: record which Stripe event produced each analytics row, and enforce one
-- row per Stripe event via a unique index. logSubscriptionEvent now upserts with
-- onConflict=stripe_event_id, ignoreDuplicates — so a re-driven write silently
-- no-ops instead of double-counting.
--
-- Existing schema (migration 019): subscription_events(id, user_id, event_type,
--   tier, interval, stripe_subscription_id, mrr_cents, created_at).
-- ============================================================

-- Link each analytics row to the Stripe event that produced it (nullable: the
-- drift cron's own recovery writes have no originating webhook event).
alter table public.subscription_events
  add column if not exists stripe_event_id text;

-- One analytics row per Stripe event. NON-partial on purpose: Postgres treats
-- NULLs as distinct in a unique index, so the many legacy / cron rows with a
-- null stripe_event_id are still allowed (a NULL key never conflicts). A PARTIAL
-- index (WHERE stripe_event_id is not null) is NOT inferable by
-- `ON CONFLICT (stripe_event_id)` without repeating its predicate — Postgres
-- raises 42P10 and logSubscriptionEvent's upsert fails at runtime. The dedup
-- upsert therefore REQUIRES this index to be non-partial.
create unique index if not exists uq_subscription_events_stripe_event_id
  on public.subscription_events (stripe_event_id);
