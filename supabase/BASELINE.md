# Schema baseline for the `db-contract` CI gate

The AirwayLab migration history is **not replayable from scratch** (see PR #984:
out-of-band objects + in-place function redefinitions). So the `db-contract` job
gates on a **schema baseline** — a structure-only dump of prod — plus any
migrations added *after* the baseline, instead of replaying all 64 migrations.

## Generate / refresh the baseline (one command, needs DB access)

With the project linked (`supabase link`) or a direct connection string:

```bash
# structure-only dump of the schemas the app uses
supabase db dump --schema public,storage -f supabase/baseline.sql

# record the highest migration number the baseline already includes
ls supabase/migrations | grep -oE '^[0-9]+' | sort -n | tail -1 > supabase/baseline.cut

git add supabase/baseline.sql supabase/baseline.cut
```

Equivalent with plain `pg_dump`:

```bash
pg_dump --schema-only --schema=public --schema=storage "$DATABASE_URL" \
  > supabase/baseline.sql
```

Commit both files. The job then runs in **GATE mode**: apply baseline → apply
migrations newer than `baseline.cut` → run `supabase/tests/*.sql`.

Without `supabase/baseline.sql`, the job runs in **AUDIT mode** (full replay) and
is expected to fail, documenting the history defects.

## Do NOT commit data
Use `--schema-only` / `supabase db dump` (structure only). No prod rows, no PHI.

## Refresh cadence
Regenerate whenever the schema drifts materially. The point is that **new**
migrations are always tested on top of current prod structure, and the
`claim_stripe_event` contract is gated automatically.
