-- Preserve consent_audit rows after auth user deletion.
-- GDPR Art. 17(3)(b): legal compliance records must be retained even when
-- the data subject invokes Art. 17(1) erasure. The original FK used cascade
-- deletion which would wipe audit rows when auth.admin.deleteUser() is called.
-- Rows become anonymized records (user_id set to NULL) after deletion.

-- Step 1: Make user_id nullable so SET NULL can apply after user deletion
ALTER TABLE public.consent_audit
  ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: Replace CASCADE FK with SET NULL to preserve audit rows
ALTER TABLE public.consent_audit
  DROP CONSTRAINT IF EXISTS consent_audit_user_id_fkey;

ALTER TABLE public.consent_audit
  ADD CONSTRAINT consent_audit_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES auth.users(id)
  ON DELETE SET NULL;
