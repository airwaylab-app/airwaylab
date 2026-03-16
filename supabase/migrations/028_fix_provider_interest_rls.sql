-- Fix provider_interest INSERT policy: restrict to service_role only.
-- Previously used WITH CHECK (true) which allowed any role (including anon)
-- to insert directly, bypassing the API route's rate limiting and CSRF.
-- The public API route (/api/provider-interest) uses service_role to insert,
-- so the form remains publicly accessible via the API.

DROP POLICY IF EXISTS "Service role can insert provider interest" ON provider_interest;

CREATE POLICY "Service role can insert provider interest"
  ON provider_interest FOR INSERT
  TO service_role
  WITH CHECK (true);
