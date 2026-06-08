-- Contract test for migration 064: subscription_events accepts the churn
-- attribution columns (source / cancel_reason / cancel_feedback) exactly as
-- logSubscriptionEvent writes them. Run manually against a test/branch DB:
--   psql "$TEST_DB_URL" -f supabase/tests/subscription_events_reason_source_test.sql
-- begin/rollback => zero side effects on real data.
begin;

do $$
declare
  v_source   text;
  v_reason   text;
  v_feedback text;
begin
  insert into public.subscription_events
    (event_type, tier, mrr_cents, stripe_subscription_id,
     stripe_event_id, source, cancel_reason, cancel_feedback)
  values
    ('cancelled', 'supporter', 900, 'sub_test_064',
     'test_evt_064_contract', 'portal', 'cancellation_requested', 'too_complex');

  select source, cancel_reason, cancel_feedback
    into v_source, v_reason, v_feedback
    from public.subscription_events
   where stripe_event_id = 'test_evt_064_contract';

  if v_source is distinct from 'portal' then
    raise exception '064 contract: source not persisted (got %)', v_source;
  end if;
  if v_reason is distinct from 'cancellation_requested' then
    raise exception '064 contract: cancel_reason not persisted (got %)', v_reason;
  end if;
  if v_feedback is distinct from 'too_complex' then
    raise exception '064 contract: cancel_feedback not persisted (got %)', v_feedback;
  end if;

  raise notice '064 contract OK: churn attribution columns persist';
end $$;

rollback;
