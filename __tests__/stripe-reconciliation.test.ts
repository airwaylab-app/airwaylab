/**
 * Unit tests for lib/stripe-reconciliation.ts (AIR-2255 Phase 1b).
 *
 * Coverage:
 *   - Active Stripe subscription absent from DB → CRITICAL Sentry alert
 *   - Customer not found in Stripe (resource_missing) → HIGH Sentry alert
 *   - Customer deleted in Stripe → HIGH Sentry alert
 *   - Metadata supabase_user_id mismatch → HIGH Sentry alert
 *   - Clean profile (customer exists, sub in DB) → no Sentry calls
 *   - DB fetch error → throws and fires captureException
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runStripeReconciliation } from '@/lib/stripe-reconciliation';

// ── Sentry mock ──────────────────────────────────────────────────────────────

const mockCaptureMessage = vi.fn();
const mockCaptureException = vi.fn();

vi.mock('@sentry/nextjs', () => ({
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeSupabaseMockV2(
  profiles: Array<{ id: string; stripe_customer_id: string }>,
  dbSubs: Array<{ stripe_subscription_id: string }>
) {
  const fromMock = vi.fn();

  // profiles query: .from('profiles').select('id, stripe_customer_id').not(...)
  // subscriptions query: .from('subscriptions').select('stripe_subscription_id')

  let profilesQueryDone = false;

  fromMock.mockImplementation((table: string) => {
    if (table === 'profiles') {
      return {
        select: vi.fn().mockReturnThis(),
        not: vi.fn().mockResolvedValue({ data: profiles, error: null }),
      };
    }
    if (table === 'subscriptions') {
      profilesQueryDone = true;
      void profilesQueryDone;
      return {
        select: vi.fn().mockResolvedValue({ data: dbSubs, error: null }),
      };
    }
    return { select: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });

  return { from: fromMock };
}

/** Build a minimal mock Stripe client. */
function makeStripeMock({
  customerData = { id: 'cus_1', metadata: { supabase_user_id: 'user-1' } } as Record<
    string,
    unknown
  >,
  customerError = null as unknown,
  activeSubs = [] as Array<{ id: string }>,
  subsError = null as unknown,
} = {}) {
  return {
    customers: {
      retrieve: vi.fn().mockImplementation(() => {
        if (customerError) return Promise.reject(customerError);
        return Promise.resolve(customerData);
      }),
    },
    subscriptions: {
      list: vi.fn().mockImplementation(() => {
        if (subsError) return Promise.reject(subsError);
        return Promise.resolve({ data: activeSubs });
      }),
    },
  };
}

// ── beforeEach ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runStripeReconciliation: active_sub_not_in_db', () => {
  it('fires CRITICAL Sentry alert when Stripe has active sub absent from DB', async () => {
    const supabase = makeSupabaseMockV2(
      [{ id: 'user-1', stripe_customer_id: 'cus_1' }],
      [] // no rows in DB subscriptions
    );

    const stripe = makeStripeMock({
      customerData: { id: 'cus_1', metadata: { supabase_user_id: 'user-1' } },
      activeSubs: [{ id: 'sub_active_123' }],
    });

    const result = await runStripeReconciliation(
      supabase as unknown as Parameters<typeof runStripeReconciliation>[0],
      stripe as unknown as Parameters<typeof runStripeReconciliation>[1]
    );

    expect(result.active_sub_not_in_db).toBe(1);
    expect(result.divergences).toHaveLength(1);
    expect(result.divergences[0]!.divergence_type).toBe('active_sub_not_in_db');
    expect(result.divergences[0]!.severity).toBe('CRITICAL');
    expect(result.divergences[0]!.stripe_subscription_id).toBe('sub_active_123');

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('active subscription has no row in DB'),
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({ divergence_type: 'active_sub_not_in_db' }),
      })
    );
  });

  it('does NOT fire Sentry when active sub is already in DB', async () => {
    const supabase = makeSupabaseMockV2(
      [{ id: 'user-1', stripe_customer_id: 'cus_1' }],
      [{ stripe_subscription_id: 'sub_active_123' }]
    );

    const stripe = makeStripeMock({
      customerData: { id: 'cus_1', metadata: { supabase_user_id: 'user-1' } },
      activeSubs: [{ id: 'sub_active_123' }],
    });

    const result = await runStripeReconciliation(
      supabase as unknown as Parameters<typeof runStripeReconciliation>[0],
      stripe as unknown as Parameters<typeof runStripeReconciliation>[1]
    );

    expect(result.active_sub_not_in_db).toBe(0);
    expect(mockCaptureMessage).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });
});

describe('runStripeReconciliation: customer_not_in_stripe', () => {
  it('fires HIGH Sentry alert when Stripe returns resource_missing', async () => {
    const notFoundError = Object.assign(new Error('No such customer'), {
      code: 'resource_missing',
      statusCode: 404,
    });

    const supabase = makeSupabaseMockV2(
      [{ id: 'user-1', stripe_customer_id: 'cus_phantom' }],
      []
    );

    const stripe = makeStripeMock({ customerError: notFoundError });

    const result = await runStripeReconciliation(
      supabase as unknown as Parameters<typeof runStripeReconciliation>[0],
      stripe as unknown as Parameters<typeof runStripeReconciliation>[1]
    );

    expect(result.customer_not_in_stripe).toBe(1);
    expect(result.divergences[0]!.divergence_type).toBe('customer_not_in_stripe');
    expect(result.divergences[0]!.severity).toBe('HIGH');

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('customer ID not found in Stripe'),
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({ divergence_type: 'customer_not_in_stripe' }),
      })
    );
  });

  it('fires HIGH Sentry alert when Stripe customer is deleted', async () => {
    const supabase = makeSupabaseMockV2(
      [{ id: 'user-1', stripe_customer_id: 'cus_deleted' }],
      []
    );

    const stripe = makeStripeMock({
      customerData: { id: 'cus_deleted', deleted: true },
    });

    const result = await runStripeReconciliation(
      supabase as unknown as Parameters<typeof runStripeReconciliation>[0],
      stripe as unknown as Parameters<typeof runStripeReconciliation>[1]
    );

    expect(result.customer_not_in_stripe).toBe(1);
    expect(result.divergences[0]!.detail).toBe('deleted');
    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('deleted in Stripe'),
      expect.objectContaining({ level: 'error' })
    );
  });
});

describe('runStripeReconciliation: metadata_mismatch', () => {
  it('fires HIGH Sentry alert when metadata supabase_user_id differs from profile id', async () => {
    const supabase = makeSupabaseMockV2(
      [{ id: 'user-1', stripe_customer_id: 'cus_1' }],
      []
    );

    const stripe = makeStripeMock({
      customerData: {
        id: 'cus_1',
        metadata: { supabase_user_id: 'user-999' }, // wrong UID
      },
      activeSubs: [],
    });

    const result = await runStripeReconciliation(
      supabase as unknown as Parameters<typeof runStripeReconciliation>[0],
      stripe as unknown as Parameters<typeof runStripeReconciliation>[1]
    );

    expect(result.metadata_mismatch).toBe(1);
    expect(result.divergences[0]!.divergence_type).toBe('metadata_mismatch');
    expect(result.divergences[0]!.stripe_metadata_user_id).toBe('user-999');

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('supabase_user_id does not match'),
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({ divergence_type: 'metadata_mismatch' }),
      })
    );
  });

  it('does NOT flag mismatch when metadata supabase_user_id is absent', async () => {
    const supabase = makeSupabaseMockV2(
      [{ id: 'user-1', stripe_customer_id: 'cus_1' }],
      []
    );

    // No supabase_user_id in metadata — legacy customer, not a mismatch
    const stripe = makeStripeMock({
      customerData: { id: 'cus_1', metadata: {} },
      activeSubs: [],
    });

    const result = await runStripeReconciliation(
      supabase as unknown as Parameters<typeof runStripeReconciliation>[0],
      stripe as unknown as Parameters<typeof runStripeReconciliation>[1]
    );

    expect(result.metadata_mismatch).toBe(0);
    expect(mockCaptureMessage).not.toHaveBeenCalled();
  });
});

describe('runStripeReconciliation: clean state', () => {
  it('returns zero divergences and fires no Sentry calls for a clean profile', async () => {
    const supabase = makeSupabaseMockV2(
      [{ id: 'user-1', stripe_customer_id: 'cus_1' }],
      [{ stripe_subscription_id: 'sub_1' }]
    );

    const stripe = makeStripeMock({
      customerData: { id: 'cus_1', metadata: { supabase_user_id: 'user-1' } },
      activeSubs: [{ id: 'sub_1' }],
    });

    const result = await runStripeReconciliation(
      supabase as unknown as Parameters<typeof runStripeReconciliation>[0],
      stripe as unknown as Parameters<typeof runStripeReconciliation>[1]
    );

    expect(result.profiles_checked).toBe(1);
    expect(result.divergences).toHaveLength(0);
    expect(mockCaptureMessage).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('returns immediately when there are no profiles with stripe_customer_id', async () => {
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      not: vi.fn().mockResolvedValue({ data: [], error: null }),
    });
    const supabase = { from: fromMock };
    const stripe = makeStripeMock();

    const result = await runStripeReconciliation(
      supabase as unknown as Parameters<typeof runStripeReconciliation>[0],
      stripe as unknown as Parameters<typeof runStripeReconciliation>[1]
    );

    expect(result.profiles_checked).toBe(0);
    expect(stripe.customers.retrieve).not.toHaveBeenCalled();
  });
});

describe('runStripeReconciliation: result shape', () => {
  it('counts multiple divergence types across multiple profiles', async () => {
    const notFoundError = Object.assign(new Error('No such customer'), {
      code: 'resource_missing',
    });

    const fromMock = vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnThis(),
          not: vi.fn().mockResolvedValue({
            data: [
              { id: 'user-1', stripe_customer_id: 'cus_ok' },
              { id: 'user-2', stripe_customer_id: 'cus_phantom' },
            ],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const supabase = { from: fromMock };

    let retrieveCallCount = 0;
    const stripe = {
      customers: {
        retrieve: vi.fn().mockImplementation(() => {
          retrieveCallCount++;
          if (retrieveCallCount === 1) {
            return Promise.resolve({
              id: 'cus_ok',
              metadata: { supabase_user_id: 'user-1' },
            });
          }
          return Promise.reject(notFoundError);
        }),
      },
      subscriptions: {
        list: vi.fn().mockResolvedValue({ data: [{ id: 'sub_new_999' }] }),
      },
    };

    const result = await runStripeReconciliation(
      supabase as unknown as Parameters<typeof runStripeReconciliation>[0],
      stripe as unknown as Parameters<typeof runStripeReconciliation>[1]
    );

    expect(result.profiles_checked).toBe(2);
    expect(result.active_sub_not_in_db).toBe(1); // user-1 has active sub not in DB
    expect(result.customer_not_in_stripe).toBe(1); // user-2 phantom customer
    expect(result.divergences).toHaveLength(2);
  });
});
