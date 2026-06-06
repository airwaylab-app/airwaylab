#!/usr/bin/env node
/**
 * G5 — end-to-end PostgREST client tests for the `db-contract` CI job.
 *
 * Runs after scripts/db-replay.sh has built the GATE-mode DB (pre-shim + prod
 * schema baseline + post-baseline migrations + supabase/baseline.grants.sql) and
 * a PostgREST service container is up. Exercises the REAL request path — a live
 * PostgREST speaking to a real Postgres over HTTP, switching roles by JWT — so we
 * catch what unit tests + a green build cannot:
 *
 *   1. claim_stripe_event RPC happy path (service-role JWT).
 *   2. claim_stripe_event idempotency (a fresh `processing` row is not re-claimed).
 *   3. permission boundary: anon is denied, service_role is allowed (prod revokes
 *      EXECUTE on the RPC from PUBLIC — replicated in baseline.grants.sql).
 *   4. schema-cache reload semantics (a new function is invisible until
 *      `NOTIFY pgrst, 'reload schema'`).
 *   5. DIAGNOSTIC — the 2026-06-04 `.update().or()` billing incident. Logs the
 *      live or-on-mutation behaviour (not asserted): upstream PostgREST has since
 *      fixed it, so the 42703 symptom no longer reproduces on v12.2.x / v13.x. The
 *      version-independent static `scripts/check-no-mutation-or.mjs` guard is the
 *      real defense; this records what the live stack actually does.
 *
 * No npm dependencies: built-in fetch + crypto for the (HS256) JWT, and psql
 * (already installed in the job) for the DDL/NOTIFY a PostgREST client can't do.
 */
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const PGRST = process.env.PGRST_URL || 'http://localhost:3000';
const SECRET = process.env.PGRST_JWT_SECRET;
const DB = process.env.DATABASE_URL;
if (!SECRET || !DB) {
  console.error('PGRST_JWT_SECRET and DATABASE_URL are required');
  process.exit(2);
}

// ── helpers ──────────────────────────────────────────────────────────────
const b64url = (s) => Buffer.from(s).toString('base64url');
function mintJwt(role) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ role, iat: now, exp: now + 3600 }));
  const data = `${header}.${payload}`;
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}
const SERVICE = mintJwt('service_role');

const psql = (sql) =>
  execFileSync('psql', [DB, '-v', 'ON_ERROR_STOP=1', '-tAc', sql], { encoding: 'utf8' }).trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function req(method, path, { jwt, body, prefer } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (jwt) headers.Authorization = `Bearer ${jwt}`;
  if (prefer) headers.Prefer = prefer;
  const res = await fetch(`${PGRST}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log(`  ok   ${name}`);
  else {
    failures++;
    console.error(`  FAIL ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

async function waitForPostgrest() {
  for (let i = 0; i < 90; i++) {
    try {
      const res = await fetch(`${PGRST}/`);
      if (res.status === 200) return;
    } catch {
      /* not up yet */
    }
    await sleep(1000);
  }
  throw new Error('PostgREST did not become ready within 90s');
}

async function reloadSchema() {
  psql(`notify pgrst, 'reload schema'`);
  await sleep(1500);
}

// ── tests ────────────────────────────────────────────────────────────────
async function run() {
  console.log('> waiting for PostgREST to connect + load schema cache');
  await waitForPostgrest();
  // PostgREST may have connected mid-apply (authenticator appears before the
  // baseline finishes), so force one fresh cache before asserting anything.
  await reloadSchema();

  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const EV = '__g5_pgrst_happy__';
  psql(`delete from public.stripe_events where event_id like '__g5_pgrst%'`);

  // 1) happy path — seed via PostgREST as service_role, then claim.
  const seed = await req('POST', '/stripe_events', {
    jwt: SERVICE,
    prefer: 'return=representation',
    body: { event_id: EV, event_type: 'test.g5', status: 'pending', attempts: 0 },
  });
  check('seed stripe_events as service_role → 201', seed.status === 201,
    `status=${seed.status} body=${JSON.stringify(seed.body)}`);

  const claim1 = await req('POST', '/rpc/claim_stripe_event', {
    jwt: SERVICE,
    body: { p_event_id: EV, p_attempts: 1, p_stale_cutoff: cutoff },
  });
  check('claim_stripe_event (service_role) → 200', claim1.status === 200, `status=${claim1.status}`);
  check('claim returns the pending event once',
    Array.isArray(claim1.body) && claim1.body.length === 1 && claim1.body[0].event_id === EV,
    JSON.stringify(claim1.body));

  // 2) idempotency — the row is now `processing` + fresh, so a second claim is a no-op.
  const claim2 = await req('POST', '/rpc/claim_stripe_event', {
    jwt: SERVICE,
    body: { p_event_id: EV, p_attempts: 2, p_stale_cutoff: cutoff },
  });
  check('claim is idempotent (fresh processing not re-claimed)',
    Array.isArray(claim2.body) && claim2.body.length === 0,
    `status=${claim2.status} body=${JSON.stringify(claim2.body)}`);
  const attempts = psql(`select attempts from public.stripe_events where event_id = '${EV}'`);
  check('claimed row left untouched by the no-op (attempts still 1)', attempts === '1',
    `attempts=${attempts}`);

  // 3) permission boundary — anon denied, service_role allowed.
  const anonCall = await req('POST', '/rpc/claim_stripe_event', {
    body: { p_event_id: EV, p_attempts: 9, p_stale_cutoff: cutoff }, // no JWT → anon
  });
  check('anon cannot execute claim_stripe_event (denied)',
    [401, 403, 404].includes(anonCall.status),
    `status=${anonCall.status} body=${JSON.stringify(anonCall.body)}`);
  console.log(`     anon → status=${anonCall.status}, code=${anonCall.body?.code ?? 'n/a'}`);
  const svcCall = await req('POST', '/rpc/claim_stripe_event', {
    jwt: SERVICE,
    body: { p_event_id: '__g5_pgrst_perm__', p_attempts: 1, p_stale_cutoff: cutoff },
  });
  check('service_role can execute claim_stripe_event → 200', svcCall.status === 200,
    `status=${svcCall.status} body=${JSON.stringify(svcCall.body)}`);

  // 4) schema-cache reload semantics.
  psql(`drop function if exists public.__g5_reload_probe()`);
  psql(`create function public.__g5_reload_probe() returns int language sql as 'select 42'`);
  psql(`grant execute on function public.__g5_reload_probe() to service_role`);
  const before = await req('POST', '/rpc/__g5_reload_probe', { jwt: SERVICE });
  check('new function absent from stale schema cache (404)', before.status === 404,
    `status=${before.status} body=${JSON.stringify(before.body)}`);
  await reloadSchema();
  let after = { status: 0, body: null };
  for (let i = 0; i < 10; i++) {
    after = await req('POST', '/rpc/__g5_reload_probe', { jwt: SERVICE });
    if (after.status === 200) break;
    await sleep(1000);
  }
  check('function visible after NOTIFY pgrst reload (200 → 42)',
    after.status === 200 && after.body === 42,
    `status=${after.status} body=${JSON.stringify(after.body)}`);
  psql(`drop function if exists public.__g5_reload_probe()`);
  await reloadSchema();

  // 5) DIAGNOSTIC (not asserted): `.update().or()` — the 2026-06-04 billing
  //    incident pattern. The 057/#945 webhook claimed events with
  //    .eq('event_id',…).or('status.in.(pending,failed),and(status.eq.processing,updated_at.lt.<cutoff>)')
  //    and PostgREST rejected it with PG 42703 "column stripe_events.status does
  //    not exist", stranding every checkout (fix: the claim_stripe_event RPC,
  //    migration 063). VERIFIED HERE: upstream PostgREST has since fixed `or` on a
  //    mutation — BOTH the flat and the exact nested incident filter return 200 on
  //    v12.2.x / v13.x (they apply the filter correctly). So the 42703 symptom is
  //    no longer reproducible on these versions; we log the live behavior for the
  //    record rather than assert it. The version-INDEPENDENT defense is the static
  //    scripts/check-no-mutation-or.mjs guard, which blocks the pattern in code —
  //    important because the failure mode is now SILENT (a wrong filter would
  //    mis-update quietly) rather than a loud 42703.
  const incidentOr =
    `or=(status.in.(pending,failed),and(status.eq.processing,updated_at.lt.${encodeURIComponent(cutoff)}))`;
  const nestedOr = await req(
    'PATCH', `/stripe_events?event_id=eq.${EV}&${incidentOr}`,
    { jwt: SERVICE, prefer: 'return=representation', body: { attempts: 99 } },
  );
  const flatOr = await req(
    'PATCH', `/stripe_events?event_id=eq.${EV}&or=(status.eq.pending,status.eq.failed)`,
    { jwt: SERVICE, prefer: 'return=representation', body: { attempts: 98 } },
  );
  console.log(
    `  diag .update().or() incident(nested) → status=${nestedOr.status}, code=${nestedOr.body?.code ?? 'n/a'}` +
    `; flat → status=${flatOr.status}, code=${flatOr.body?.code ?? 'n/a'} ` +
    `(42703 here = incident reproduced; 200 = or-on-mutation fixed upstream — static guard remains the defense)`,
  );

  psql(`delete from public.stripe_events where event_id like '__g5_pgrst%'`);

  console.log(
    failures === 0
      ? '\n>> ci-postgrest-tests: all assertions passed'
      : `\n>> ci-postgrest-tests: ${failures} assertion(s) FAILED`,
  );
  process.exit(failures === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
