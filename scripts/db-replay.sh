#!/usr/bin/env bash
# Replay every AirwayLab migration into a fresh DB in filename order, then run
# the SQL contract tests. Proves the migration history is replayable and gates
# the claim_stripe_event contract.
#
# Migrations are applied MANUALLY in prod (see skills/awl-migration); they are
# sequential (001..NNN). The two duplicate-version pairs (003_*, 036_*) are
# order-independent (different tables), so filename-sorted apply is correct.
#
# Usage:
#   DATABASE_URL=postgres://user:pass@host:5432/db scripts/db-replay.sh
# The target should be a fresh DB; this script bootstraps a minimal Supabase
# auth/roles shim first (for plain-Postgres CI without GoTrue).
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to a fresh target Postgres}"

run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q "$@"; }

echo ">> bootstrap: Supabase auth/roles shim"
run -f scripts/ci-db-bootstrap.sql

echo ">> replay migrations (filename order)"
for f in supabase/migrations/*.sql; do
  echo "   apply $(basename "$f")"
  run -f "$f"
done

echo ">> SQL contract tests"
for t in supabase/tests/*.sql; do
  echo "   run $(basename "$t")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$t"
done

echo ">> db-replay: OK"
