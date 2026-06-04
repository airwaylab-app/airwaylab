/**
 * Unit tests for the ST1 webhook re-drive step in
 * app/api/cron/subscription-drift/route.ts (redriveStripeEvents).
 *
 * This is the path that actually retries Stripe webhook events: the webhook
 * route returns 200 to Stripe BEFORE processing, so a failed event is never
 * retried by Stripe itself. The cron picks up `failed` (and stale `processing`)
 * stripe_events rows, refetches the event from Stripe, and reprocesses it via
 * the shared runStripeJob state machine.
 *
 * Covers:
 *   1. A `failed` row is re-driven to `done` (the core requirement).
 *   2. A stale `processing` row is picked up; a fresh `processing` row is not
 *      (verified via the .or() filter the cron builds).
 *   3. stripe.events.retrieve failing leaves the row failed + attempts++.
 *   4. No eligible rows → no Stripe calls, counts are zero.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────

const mockCaptureException = vi.fn();
const mockCaptureMessage = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
}));

vi.mock('@/lib/discord', () => ({
  syncRole: vi.fn(),
  isDiscordConfigured: vi.fn(() => false),
  searchGuildMember: vi.fn().mockResolvedValue({ status: 'not_found' }),
  getTierRoleId: vi.fn().mockReturnValue(null),
}));

const mockSendAlert = vi.fn();
vi.mock('@/lib/discord-webhook', () => ({
  sendAlert: (...args: unknown[]) => mockSendAlert(...args),
  formatRevenueEmbed: vi.fn().mockReturnValue({}),
  alertStripePaymentFailed: vi.fn().mockResolvedValue(undefined),
  COLORS: { amber: 0xf59e0b },
}));

// Email modules are pulled in transitively via the webhooks/stripe route
// (runStripeJob → processStripeEvent imports them).
vi.mock('@/lib/email/sequences', () => ({
  cancelSequence: vi.fn().mockResolvedValue(undefined),
  scheduleSequence: vi.fn().mockResolvedValue(undefined),
  scheduleWinBackForUser: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/lib/email/send', () => ({ sendEmail: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/email/transactional', () => ({
  welcomeEmail: vi.fn().mockReturnValue({ subject: 'W', html: '<p>W</p>' }),
  cancellationEmail: vi.fn().mockReturnValue({ subject: 'C', html: '<p>C</p>' }),
}));

// Stripe mock: events.retrieve drives the re-drive; subscriptions used by the
// drift recovery path (returns empty here).
const mockEventsRetrieve = vi.fn();
const mockSubsList = vi.fn().mockResolvedValue({ data: [] });
const mockSubsRetrieve = vi.fn();
vi.mock('stripe', () => {
  class MockStripe {
    events = { retrieve: (...args: unknown[]) => mockEventsRetrieve(...args) };
    subscriptions = {
      list: (...args: unknown[]) => mockSubsList(...args),
      retrieve: (...args: unknown[]) => mockSubsRetrieve(...args),
    };
  }
  return { default: MockStripe };
});

// Supabase mock. The drift queries all resolve empty so only the re-drive runs.
// stripe_events is the table under test: the re-drive SELECT returns the rows we
// configure, and we capture every UPDATE so we can assert the state transition.
let redriveRows: Array<Record<string, unknown>> = [];
const stripeEventsUpdates: Array<Record<string, unknown>> = [];
let capturedOrFilter = '';
let capturedLt: { col: string; val: unknown } | null = null;

const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  })),
}));

function emptyProfilesChain(): Record<string, unknown> {
  const chain: Record<string, unknown> = {};
  chain['select'] = vi.fn(() => chain);
  chain['in'] = vi.fn().mockResolvedValue({ data: [], error: null });
  chain['eq'] = vi.fn(() => chain);
  chain['not'] = vi.fn().mockImplementation((field: string) =>
    field === 'stripe_customer_id' ? chain : Promise.resolve({ data: [], error: null })
  );
  chain['is'] = vi.fn().mockResolvedValue({ data: [], error: null });
  chain['update'] = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  chain['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null });
  return chain;
}

/**
 * stripe_events builder. A thenable proxy that supports every shape the cron +
 * runStripeJob use against this table:
 *   - re-drive SELECT:  .select(cols).lt(attempts).or(f).order().limit()
 *                       → resolves redriveRows
 *   - state UPDATE:     .update(patch).eq()   → awaited → { error: null }
 *   - status confirm:   .select('status').eq().maybeSingle() → last update's status
 * The ATOMIC CLAIM is NOT a builder call: it is supabase.rpc('claim_stripe_event')
 * (migration 063), mocked via mockRpc. By default the claim WINS; set
 * claimWins=false to simulate a row another worker already owns (rpc returns []).
 */
let claimWins = true;

function stripeEventsBuilder(): Record<string, unknown> {
  // Tracks the last terminal so the thenable returns the right payload.
  let pending: 'select_rows' | 'update_eq' | null = null;

  const builder: Record<string, unknown> = {};
  const ret = () => builder;

  builder['select'] = vi.fn(ret);
  // HIGH 3: the re-drive query excludes attempts >= MAX_ATTEMPTS via .lt().
  builder['lt'] = vi.fn((col: string, val: unknown) => { capturedLt = { col, val }; return builder; });
  builder['or'] = vi.fn((f: string) => { capturedOrFilter = f; return builder; });
  builder['order'] = vi.fn(ret);
  builder['limit'] = vi.fn(() => { pending = 'select_rows'; return builder; });
  builder['eq'] = vi.fn(() => { if (pending === null) pending = 'update_eq'; return builder; });
  builder['update'] = vi.fn((patch: Record<string, unknown>) => {
    stripeEventsUpdates.push(patch);
    pending = 'update_eq';
    return builder;
  });
  builder['maybeSingle'] = vi.fn().mockImplementation(() => {
    // Confirm-status read after runStripeJob: reflect the last update.
    const last = stripeEventsUpdates[stripeEventsUpdates.length - 1];
    return Promise.resolve({ data: { status: last?.status ?? 'failed' }, error: null });
  });
  // Thenable: resolve based on which terminal was last invoked.
  (builder as { then?: unknown }).then = (resolve: (v: unknown) => void) => {
    if (pending === 'select_rows') return resolve({ data: redriveRows, error: null });
    return resolve({ data: null, error: null });
  };
  return builder;
}

function profilesBuilderWithRow(): Record<string, unknown> {
  // Used inside processStripeEvent (phantom-user guard + tier update).
  const chain: Record<string, unknown> = {};
  chain['select'] = vi.fn(() => chain);
  chain['eq'] = vi.fn(() => chain);
  chain['maybeSingle'] = vi.fn().mockResolvedValue({ data: { id: 'user-1' }, error: null });
  chain['update'] = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  return chain;
}

function makeRequest(secret = 'test-secret'): NextRequest {
  return {
    headers: { get: (h: string) => (h === 'authorization' ? `Bearer ${secret}` : null) },
  } as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  redriveRows = [];
  stripeEventsUpdates.length = 0;
  capturedOrFilter = '';
  capturedLt = null;
  claimWins = true;
  // Atomic claim is the claim_stripe_event RPC. Resolves a winning RETURNING set
  // by default; reads claimWins at call time so a test can flip it before GET.
  mockRpc.mockImplementation(() =>
    Promise.resolve({ data: claimWins ? [{ event_id: 'evt_claimed' }] : [], error: null })
  );
  process.env.CRON_SECRET = 'test-secret';
  process.env.STRIPE_SECRET_KEY = 'sk_test_fake';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  mockSendAlert.mockResolvedValue(undefined);
  mockFrom.mockImplementation((table: string) => {
    if (table === 'stripe_events') return stripeEventsBuilder();
    if (table === 'profiles') {
      // The drift queries need the empty-result chain; processStripeEvent needs
      // a row. Both shapes are covered by returning a chain that resolves rows
      // for the .in()/.not()/.is() drift terminals AND a profile for maybeSingle.
      const empty = emptyProfilesChain();
      const withRow = profilesBuilderWithRow();
      // Merge: drift terminals from `empty`, processStripeEvent reads from `withRow`.
      return {
        ...empty,
        maybeSingle: withRow['maybeSingle'],
      };
    }
    // subscriptions / subscription_events / discord_* — benign chainable no-ops.
    const chain: Record<string, unknown> = {};
    const ret = () => chain;
    for (const m of ['select', 'eq', 'in', 'update', 'upsert', 'insert', 'delete', 'order']) {
      chain[m] = vi.fn(ret);
    }
    chain['maybeSingle'] = vi.fn().mockResolvedValue({ data: null, error: null });
    chain['limit'] = vi.fn().mockResolvedValue({ data: [], error: null });
    // Make the builder itself awaitable (e.g. update().eq() awaited directly).
    (chain as { then?: unknown }).then = (resolve: (v: unknown) => void) =>
      resolve({ data: null, error: null });
    return chain;
  });
});

describe('subscription-drift cron — ST1 webhook re-drive', () => {
  it('re-drives a failed row to done (refetches event, runs state machine)', async () => {
    redriveRows = [
      { event_id: 'evt_failed_1', event_type: 'customer.created', status: 'failed', attempts: 1, updated_at: '2026-01-01T00:00:00Z' },
    ];
    // customer.created is an unhandled type → processStripeEvent is a no-op → success.
    mockEventsRetrieve.mockResolvedValue({
      id: 'evt_failed_1',
      type: 'customer.created',
      data: { object: { id: 'cus_x' } },
    });

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(mockEventsRetrieve).toHaveBeenCalledWith('evt_failed_1');
    expect(body.redrive_picked).toBe(1);
    expect(body.redrive_recovered).toBe(1);
    expect(body.redrive_still_failed).toBe(0);

    // State machine ran: claim (RPC) then done. No failed transition.
    expect(mockRpc).toHaveBeenCalledWith(
      'claim_stripe_event',
      expect.objectContaining({ p_event_id: 'evt_failed_1', p_attempts: 2 })
    );
    expect(stripeEventsUpdates).toContainEqual(expect.objectContaining({ status: 'done' }));
    expect(stripeEventsUpdates).not.toContainEqual(expect.objectContaining({ status: 'failed' }));
  });

  it('builds an .or() filter that selects failed rows and stale (not fresh) processing rows', async () => {
    redriveRows = [];
    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    // failed rows unconditionally + processing rows older than the stale cutoff.
    expect(capturedOrFilter).toContain('status.eq.failed');
    expect(capturedOrFilter).toContain('status.eq.processing');
    expect(capturedOrFilter).toContain('updated_at.lt.');
  });

  it('excludes attempts >= MAX_ATTEMPTS via a .lt(attempts, 5) filter (HIGH 3)', async () => {
    redriveRows = [];
    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    // Poison events at the cap must never be re-driven.
    expect(capturedLt).toEqual({ col: 'attempts', val: 5 });
  });

  it('parks the row dead and alerts ops when retrieve fails at the attempt cap (HIGH 3)', async () => {
    // attempts=4 → this run is attempt 5, the cap. retrieve fails so runStripeJob
    // never runs; the cron catch must park the row `dead` and alert once.
    redriveRows = [
      { event_id: 'evt_poison', event_type: 'checkout.session.completed', status: 'failed', attempts: 4, updated_at: '2026-01-01T00:00:00Z' },
    ];
    mockEventsRetrieve.mockRejectedValue(new Error('gone'));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    await GET(makeRequest());

    expect(stripeEventsUpdates).toContainEqual(
      expect.objectContaining({ status: 'dead', attempts: 5 })
    );
    expect(stripeEventsUpdates).not.toContainEqual(
      expect.objectContaining({ status: 'failed', attempts: 5 })
    );
    // One dead-letter ops alert + Sentry message.
    expect(mockSendAlert).toHaveBeenCalledWith('ops', '', expect.any(Array));
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      'Stripe event hit max attempts — parked as dead',
      expect.objectContaining({ tags: expect.objectContaining({ action: 'dead-letter' }) })
    );
  });

  it('does not double-process when the atomic claim is lost (another worker owns the row)', async () => {
    redriveRows = [
      { event_id: 'evt_contended', event_type: 'customer.subscription.updated', status: 'failed', attempts: 1, updated_at: '2026-01-01T00:00:00Z' },
    ];
    mockEventsRetrieve.mockResolvedValue({
      id: 'evt_contended',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_x', metadata: {}, items: { data: [] }, status: 'active', cancel_at_period_end: false } },
    });
    // Claim loses: the conditional UPDATE returns no row.
    claimWins = false;

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    // Picked for re-drive, but runStripeJob returned without processing.
    expect(body.redrive_picked).toBe(1);
    // Claim attempted (RPC) but lost, so never advanced to done or failed.
    expect(mockRpc).toHaveBeenCalledWith(
      'claim_stripe_event',
      expect.objectContaining({ p_event_id: 'evt_contended', p_attempts: 2 })
    );
    expect(stripeEventsUpdates).not.toContainEqual(expect.objectContaining({ status: 'done' }));
    expect(stripeEventsUpdates).not.toContainEqual(expect.objectContaining({ status: 'failed' }));
  });

  it('leaves the row failed and increments attempts when stripe.events.retrieve fails', async () => {
    redriveRows = [
      { event_id: 'evt_failed_2', event_type: 'customer.subscription.updated', status: 'failed', attempts: 2, updated_at: '2026-01-01T00:00:00Z' },
    ];
    mockEventsRetrieve.mockRejectedValue(new Error('No such event'));

    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(body.redrive_picked).toBe(1);
    expect(body.redrive_recovered).toBe(0);
    expect(body.redrive_still_failed).toBe(1);

    // Row kept as failed with attempts incremented from 2 to 3, never deleted.
    expect(stripeEventsUpdates).toContainEqual(
      expect.objectContaining({ status: 'failed', attempts: 3 })
    );
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: expect.objectContaining({ action: 'redrive-event' }) })
    );
  });

  it('does nothing and makes no Stripe calls when there are no eligible rows', async () => {
    redriveRows = [];
    const { GET } = await import('@/app/api/cron/subscription-drift/route');
    const res = await GET(makeRequest());
    const body = await res.json();

    expect(mockEventsRetrieve).not.toHaveBeenCalled();
    expect(body.redrive_picked).toBe(0);
    expect(body.redrive_recovered).toBe(0);
  });
});
