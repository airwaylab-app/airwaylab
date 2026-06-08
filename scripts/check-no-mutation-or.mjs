#!/usr/bin/env node
/**
 * Fail CI if a Supabase mutation chains an `.or()` filter.
 *
 * `or` on a MUTATION (UPDATE/DELETE/upsert) is unsafe on the PostgREST stack and
 * must never reach prod. The failure mode has CHANGED over time — both are bad:
 *  - 2026-06-04 billing incident: PostgREST REJECTED the Stripe claim's
 *    `.update().or(status…)` with Postgres `42703 "column … does not exist"`
 *    (even though the column exists), stranding every checkout. Loud but fatal.
 *  - Current PostgREST (v12.2.x+) no longer 42703s — it SILENTLY applies the
 *    `or`, so a wrong filter now mis-updates rows QUIETLY instead of erroring
 *    (verified by the db-contract harness). Silent corruption is arguably worse.
 * Either way this static guard is the version-independent line of defense — do
 * NOT relax it. The same `or` works on a SELECT, which is why this slips past
 * unit tests + typecheck + a clean deploy. Fix: move the conditional
 * UPDATE/DELETE into a SQL function (RPC). See migration 063 / `claim_stripe_event`.
 * Plain filters (`eq`, `in`, `neq`) ARE fine on mutations.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

// Directory pathspecs catch every nested AND top-level file under each dir.
const files = execSync('git ls-files app lib workers', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(ts|tsx)$/.test(f));

// Strip comments so a doc-comment mentioning `.update().or()` is not flagged.
// Keep `://` so a URL is not mistaken for a line comment.
function stripComments(s) {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/gm, '$1');
}

const violations = [];
for (const file of files) {
  const src = stripComments(readFileSync(file, 'utf8'));
  // From each mutation call, scan to the end of the statement (`;`) and flag if
  // an `.or(` filter appears in that chain. A mutation chain is a single
  // statement, so the first `;` after the call terminates it.
  const re = /\.(update|delete|upsert)\s*\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const start = m.index;
    const semi = src.indexOf(';', start);
    const chunk = src.slice(start, semi === -1 ? src.length : semi);
    if (/\.or\s*\(/.test(chunk)) {
      const line = src.slice(0, start).split('\n').length;
      violations.push(`${file}:${line}  .${m[1]}(...) … .or(...)`);
    }
  }
}

if (violations.length) {
  console.error('✖ or-on-mutation detected (unsafe on PostgREST):');
  for (const v of violations) console.error('  ' + v);
  console.error('\n`or` on a MUTATION is either rejected (legacy 42703) or SILENTLY mis-applied');
  console.error('(current PostgREST) — never ship it. Move the conditional UPDATE/DELETE into');
  console.error('a SQL function (RPC). See migration 063 / claim_stripe_event.');
  process.exit(1);
}
console.log('✓ no or-on-mutation patterns found');
