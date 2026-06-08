-- ============================================================
-- 064: subscription_events churn-attribution columns (Round 1 churn quick wins)
-- The legible cancellation alert + cancel-reason capture need every churn row to
-- record WHERE the cancellation came from (portal / dunning / account_deletion)
-- and the reason Stripe captured, so the founder can act on each churn and the
-- churn dataset is analysable.
--
-- Additive + nullable: safe while the old code (which does not write these) still
-- runs. logSubscriptionEvent upserts these alongside the existing columns; the
-- write is non-blocking, so a stale schema cache degrades analytics only, never
-- breaks the webhook.
--
-- Existing schema (019 + 059): subscription_events(id, user_id, event_type, tier,
--   interval, stripe_subscription_id, mrr_cents, created_at, stripe_event_id).
-- Free text (no CHECK) to match cancel_reason/cancel_feedback on subscriptions
-- (051) and to stay forward-compatible with new sources.
-- ============================================================

alter table public.subscription_events
  add column if not exists source          text,
  add column if not exists cancel_reason   text,
  add column if not exists cancel_feedback text;
