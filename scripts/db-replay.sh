#!/usr/bin/env bash
# Build a test DB and run the SQL contract tests, two modes:
#
# GATE mode (preferred): if supabase/baseline.sql exists, apply it (a
# structure-only dump of prod — see supabase/BASELINE.md), then apply only the
# migrations newer than the baseline cut (supabase/baseline.cut), then run the
# contract tests. Faithful and gateable, because the AirwayLab migration history
# is NOT replayable from scratch (PR #984).
#
# AUDIT mode (fallback): with no baseline, bootstrap a minimal Supabase env shim
# and replay ALL migrations in filename order. This surfaces the history's
# replay defects and is EXPECTED to fail until a baseline is committed.
#
# Usage: DATABASE_URL=postgres://user:pass@host:5432/db scripts/db-replay.sh
set -euo pipefail
: "${DATABASE_URL:?set DATABASE_URL to a fresh target Postgres}"
run() { psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q "$@"; }

if [ -f supabase/baseline.sql ]; then
  echo ">> GATE mode: pre-shim (Supabase env) + schema baseline"
  # the baseline assumes the Supabase platform (roles, auth.users/auth.uid,
  # extensions); ci-db-preshim.sql provides a minimal stand-in. search_path
  # matches prod so unqualified references resolve.
  # check_function_bodies=off defers SQL-function body validation so creation
  # order doesn't matter (pg_dump does the same); search_path matches prod.
  export PGOPTIONS="-c search_path=public,auth,storage,extensions -c check_function_bodies=off"
  run -f scripts/ci-db-preshim.sql
  run -f supabase/baseline.sql
  cut="$(cat supabase/baseline.cut 2>/dev/null || echo 000)"
  echo ">> applying migrations newer than baseline cut ${cut}"
  for f in supabase/migrations/*.sql; do
    n="$(basename "$f" | grep -oE '^[0-9]+' || echo 000)"
    if [ "$n" \> "$cut" ]; then echo "   apply $(basename "$f")"; run -f "$f"; fi
  done
else
  echo ">> AUDIT mode: no baseline; shim + full replay (expects history defects, see PR #984)"
  run -f scripts/ci-db-bootstrap.sql
  for f in supabase/migrations/*.sql; do echo "   apply $(basename "$f")"; run -f "$f"; done
fi

echo ">> SQL contract tests"
for t in supabase/tests/*.sql; do
  echo "   run $(basename "$t")"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$t"
done
echo ">> db-replay: OK"
