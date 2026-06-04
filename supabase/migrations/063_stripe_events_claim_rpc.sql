-- ============================================================
-- 063: Atomic stripe_events claim RPC (P0 billing hotfix)
--
-- ROOT CAUSE: the ST1 webhook claim (057 + #945) ran the atomic claim as a
-- PostgREST .update() carrying an .or() filter:
--   UPDATE stripe_events SET status='processing', attempts=$n, updated_at=now()
--    WHERE event_id=$id
--      AND ( status IN ('pending','failed')
--            OR (status='processing' AND updated_at < $cutoff) )
-- PostgREST cannot build an `or` filter on a MUTATION. It rejects the claim with
--   42703  "column stripe_events.status does not exist"
-- even though the column exists: direct SQL runs the identical UPDATE fine, and
-- the SAME `or` on a SELECT works. Net effect: every real checkout's claim threw
-- 42703 and stranded the event. The claim had NEVER succeeded in prod -- all
-- pre-existing `done` rows are a single 057 backfill (attempts=0, one timestamp).
--
-- FIX: move the claim into a SQL function so the UPDATE is plain SQL, never a
-- PostgREST or-mutation. Behaviour is identical to the intended UPDATE above.
-- Called only server-side by the service-role client (webhook first attempt +
-- subscription-drift re-drive), so EXECUTE is locked to service_role following
-- the 058 lockdown convention. SECURITY INVOKER: service_role already holds the
-- table privileges, so no definer escalation is needed.
-- ============================================================

create or replace function public.claim_stripe_event(
  p_event_id     text,
  p_attempts     int,
  p_stale_cutoff timestamptz
)
returns table (event_id text)
language sql
security invoker
set search_path = public
as $$
  update public.stripe_events
     set status = 'processing',
         attempts = p_attempts,
         updated_at = now()
   where event_id = p_event_id
     and ( status in ('pending', 'failed')
           or (status = 'processing' and updated_at < p_stale_cutoff) )
  returning event_id;
$$;

revoke execute on function public.claim_stripe_event(text, int, timestamptz) from public, anon, authenticated;
grant  execute on function public.claim_stripe_event(text, int, timestamptz) to service_role;
