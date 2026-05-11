-- Backfill: create missing profile rows for users who exist in auth.users but not in profiles.
-- Root cause: handle_new_user() trigger may have silently failed for some users during
-- the migration 006-027 window, leaving them with a valid auth session but no profile row.
INSERT INTO public.profiles (id, email, storage_consent, storage_consent_at, email_opt_in)
SELECT
  au.id,
  COALESCE(au.email, ''),
  true,
  now(),
  false
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
  AND au.email IS NOT NULL
ON CONFLICT (id) DO NOTHING;
