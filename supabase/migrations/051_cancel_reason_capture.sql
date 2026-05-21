-- Capture Stripe cancellation reason and feedback for churn analysis.
-- Populated by the webhook handler from subscription.cancellation_details
-- on customer.subscription.deleted and customer.subscription.updated events.

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_reason   TEXT,
  ADD COLUMN IF NOT EXISTS cancel_feedback TEXT,
  ADD COLUMN IF NOT EXISTS cancel_comment  TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_at    TIMESTAMPTZ;
