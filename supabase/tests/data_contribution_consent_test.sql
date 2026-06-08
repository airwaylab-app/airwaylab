-- Contract test for profiles.data_contribution_consent / _at (migration 065).
--
-- Verifies the additive consent columns exist with the right shape: a NOT NULL boolean
-- defaulting to false (consent is opt-in), and a nullable timestamptz. FK-free catalog
-- introspection, so it needs no auth.users/profiles row. Runs in a transaction and
-- ROLLBACKs, persisting nothing.
--
-- Run against a test/branch DB (NOT prod):
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/data_contribution_consent_test.sql
-- A failed assertion RAISEs and aborts; success emits
-- 'data_contribution_consent: all assertions passed'.
--
-- Wired into CI via the `db-contract` job (.github/workflows/integration-db.yml), which
-- replays the full migration history into a throwaway Postgres and runs every
-- supabase/tests/*.sql.

begin;

do $$
declare
  v_type     text;
  v_default  text;
  v_nullable text;
begin
  -- data_contribution_consent: boolean, NOT NULL, default false
  select data_type, column_default, is_nullable
    into v_type, v_default, v_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'data_contribution_consent';
  if v_type is null then raise exception 'profiles.data_contribution_consent is missing'; end if;
  if v_type <> 'boolean' then raise exception 'data_contribution_consent must be boolean (got %)', v_type; end if;
  if v_nullable <> 'NO' then raise exception 'data_contribution_consent must be NOT NULL'; end if;
  if v_default is null or v_default not like '%false%' then
    raise exception 'data_contribution_consent must default false (got %)', v_default;
  end if;

  -- data_contribution_consent_at: timestamptz, nullable
  select data_type, is_nullable
    into v_type, v_nullable
    from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles'
      and column_name = 'data_contribution_consent_at';
  if v_type is null then raise exception 'profiles.data_contribution_consent_at is missing'; end if;
  if v_type <> 'timestamp with time zone' then
    raise exception 'data_contribution_consent_at must be timestamptz (got %)', v_type;
  end if;
  if v_nullable <> 'YES' then raise exception 'data_contribution_consent_at must be nullable'; end if;

  raise notice 'data_contribution_consent: all assertions passed';
end $$;

rollback;
