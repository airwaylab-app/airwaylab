-- Contract test for public.claim_stripe_event (migration 063).
--
-- Verifies the atomic-claim predicate: it claims pending / failed / stale-processing
-- rows, preserves done / dead / fresh-processing rows, and sets status='processing'
-- with attempts = the supplied value.
--
-- Runs entirely inside a transaction and ROLLBACKs, so it never persists test rows.
-- Run against a test/branch DB (NOT prod) with:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/claim_stripe_event_test.sql
-- A failed assertion RAISEs and aborts the run; success emits
-- 'claim_stripe_event: all assertions passed'.
--
-- Not yet wired into CI (no ephemeral test-DB step). Add one to gate the claim
-- contract automatically.

begin;

insert into public.stripe_events (event_id, event_type, status, attempts, updated_at) values
  ('__test_pending__', 'test.contract', 'pending',    0, now()),
  ('__test_failed__',  'test.contract', 'failed',     1, now()),
  ('__test_done__',    'test.contract', 'done',       1, now()),
  ('__test_dead__',    'test.contract', 'dead',       5, now()),
  ('__test_fresh__',   'test.contract', 'processing', 1, now()),
  ('__test_stale__',   'test.contract', 'processing', 1, now() - interval '1 hour');

do $$
declare
  cutoff timestamptz := now() - interval '15 minutes';
  n int;
begin
  -- Claimable states return exactly one row.
  select count(*) into n from public.claim_stripe_event('__test_pending__', 1, cutoff);
  if n <> 1 then raise exception 'pending should be claimed (got %)', n; end if;

  select count(*) into n from public.claim_stripe_event('__test_failed__', 2, cutoff);
  if n <> 1 then raise exception 'failed should be claimed (got %)', n; end if;

  select count(*) into n from public.claim_stripe_event('__test_stale__', 2, cutoff);
  if n <> 1 then raise exception 'stale processing should be claimed (got %)', n; end if;

  -- Non-claimable states return zero rows (and stay untouched).
  select count(*) into n from public.claim_stripe_event('__test_fresh__', 2, cutoff);
  if n <> 0 then raise exception 'fresh processing must NOT be claimed (got %)', n; end if;

  select count(*) into n from public.claim_stripe_event('__test_done__', 2, cutoff);
  if n <> 0 then raise exception 'done must NOT be claimed (got %)', n; end if;

  select count(*) into n from public.claim_stripe_event('__test_dead__', 6, cutoff);
  if n <> 0 then raise exception 'dead must NOT be claimed (got %)', n; end if;

  -- A claimed row is now `processing` with attempts set to the supplied value.
  perform 1 from public.stripe_events
    where event_id = '__test_pending__' and status = 'processing' and attempts = 1;
  if not found then raise exception 'claimed pending row must be processing with attempts=1'; end if;

  -- Preserved rows are unchanged.
  perform 1 from public.stripe_events where event_id = '__test_done__' and status = 'done';
  if not found then raise exception 'done row must remain done'; end if;
  perform 1 from public.stripe_events where event_id = '__test_dead__' and status = 'dead';
  if not found then raise exception 'dead row must remain dead'; end if;
  perform 1 from public.stripe_events where event_id = '__test_fresh__' and status = 'processing' and attempts = 1;
  if not found then raise exception 'fresh processing row must be untouched'; end if;

  raise notice 'claim_stripe_event: all assertions passed';
end $$;

rollback;
