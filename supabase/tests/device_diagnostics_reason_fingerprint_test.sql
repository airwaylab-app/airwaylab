-- Contract test for migration 067: device_diagnostics accepts reason + fingerprint
-- exactly as /api/device-diagnostic writes them for the coverage harvest. Run
-- manually against a test/branch DB:
--   psql "$TEST_DB_URL" -f supabase/tests/device_diagnostics_reason_fingerprint_test.sql
-- begin/rollback => zero side effects on real data.
begin;

do $$
declare
  v_reason text;
  v_fp     text;
begin
  insert into public.device_diagnostics
    (device_model, signal_labels, has_str_file, reason, fingerprint)
  values
    ('AirSense 11 AutoSet', '["S.C.Press","S.EPR.Level","S.EPR.EPREnable"]'::jsonb, true,
     'untrusted_autoset_range', 'test_fp_067_contract');

  select reason, fingerprint
    into v_reason, v_fp
    from public.device_diagnostics
   where fingerprint = 'test_fp_067_contract';

  if v_reason is distinct from 'untrusted_autoset_range' then
    raise exception '067 contract: reason not persisted (got %)', v_reason;
  end if;
  if v_fp is distinct from 'test_fp_067_contract' then
    raise exception '067 contract: fingerprint not persisted (got %)', v_fp;
  end if;

  raise notice '067 contract OK: device_diagnostics reason + fingerprint persist';
end $$;

rollback;
