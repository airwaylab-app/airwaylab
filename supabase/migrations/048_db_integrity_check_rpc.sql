-- RPC function that runs all Phase 1 DB integrity checks (AIR-1877).
-- Returns a JSONB object with counts for each cohort:
--   expected-zero  (orphans):   subscriptions, user_nights, email_sequences
--   informational:              profiles_stripe_no_sub, profiles_paid_no_active_sub
--
-- Called daily by the db-integrity-check cron (AIR-1880).

CREATE OR REPLACE FUNCTION public.run_db_integrity_checks()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    -- 1.1 subscriptions whose user_id has no matching profile
    'subscriptions_orphans', (
      SELECT COUNT(*)::int
      FROM subscriptions s
      WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = s.user_id)
    ),
    -- 1.2 user_nights whose user_id has no matching profile
    'user_nights_orphans', (
      SELECT COUNT(*)::int
      FROM user_nights un
      WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = un.user_id)
    ),
    -- 1.4 email_sequences whose user_id has no matching profile
    'email_sequences_orphans', (
      SELECT COUNT(*)::int
      FROM email_sequences es
      WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = es.user_id)
    ),
    -- 1.12a profiles with a Stripe customer ID but no subscription row at all
    'profiles_stripe_no_sub', (
      SELECT COUNT(*)::int
      FROM profiles p
      WHERE p.stripe_customer_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM subscriptions s WHERE s.user_id = p.id)
    ),
    -- 1.12b profiles with a paid tier but no active/trialing subscription
    'profiles_paid_no_active_sub', (
      SELECT COUNT(*)::int
      FROM profiles p
      WHERE p.tier IN ('supporter', 'champion')
        AND NOT EXISTS (
          SELECT 1 FROM subscriptions s
          WHERE s.user_id = p.id
            AND s.status IN ('active', 'trialing')
        )
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.run_db_integrity_checks() TO service_role;
REVOKE EXECUTE ON FUNCTION public.run_db_integrity_checks() FROM anon, authenticated;
