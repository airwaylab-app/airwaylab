/**
 * Test A: Stale-session checkout (profile trigger race)
 *
 * Scenario: create-checkout-session called with a valid auth session but no
 * profile row (trigger hasn't committed yet, or account was deleted).
 *
 * Expected:
 * - HTTP 400 with "Account setup incomplete" message
 * - Sentry event captured with profile-existence-gate tag
 * - No Stripe customer created
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// ── Mocks ────────────────────────────────────────────────────────

vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn(() => true) }));

vi.mock('@/lib/rate-limit', () => ({
  stripeRateLimiter: { isLimited: vi.fn(() => false) },
  getRateLimitKey: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

const mockFrom = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  })),
  getSupabaseServiceRole: vi.fn(() => ({
    from: (...args: unknown[]) => mockFrom(...args),
  })),
}));

const mockCustomersCreate = vi.fn();
const mockCustomersRetrieve = vi.fn();
const mockCheckoutCreate = vi.fn();

vi.mock('stripe', () => {
  class MockStripe {
    customers = {
      create: (...args: unknown[]) => mockCustomersCreate(...args),
      retrieve: (...args: unknown[]) => mockCustomersRetrieve(...args),
    };
    checkout = {
      sessions: { create: (...args: unknown[]) => mockCheckoutCreate(...args) },
    };
  }
  return { default: MockStripe };
});

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({ getAll: vi.fn(() => []), set: vi.fn() })),
}));

// ── Helpers ──────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new Request('http://localhost:3000/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      origin: 'http://localhost:3000',
      'x-forwarded-for': '127.0.0.1',
    },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

function makeNoRowChainable() {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
  };
}

async function callRoute(body: Record<string, unknown>) {
  const { POST } = await import('@/app/api/create-checkout-session/route');
  return POST(makeRequest(body));
}

// ── Setup ────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_123');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID', 'price_supp_m');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID', 'price_supp_y');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID', 'price_champ_m');
  vi.stubEnv('NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID', 'price_champ_y');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://airwaylab.app');

  mockGetUser.mockResolvedValue({
    data: { user: { id: 'user-no-profile', email: 'ghost@example.com' } },
    error: null,
  });
  mockCustomersRetrieve.mockResolvedValue({ id: 'cus_existing', deleted: false });
});

// ── Tests ────────────────────────────────────────────────────────

describe('checkout-profile-race: no profile row for authenticated user (AIR-1873)', () => {
  it('returns HTTP 400 with "Account setup incomplete" when profile row is absent', async () => {
    mockFrom.mockReturnValue(makeNoRowChainable());

    const res = await callRoute({ priceId: 'price_supp_m' });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Account setup incomplete/);
  });

  it('does NOT create a Stripe customer when no profile row exists', async () => {
    mockFrom.mockReturnValue(makeNoRowChainable());

    await callRoute({ priceId: 'price_supp_m' });

    expect(mockCustomersCreate).not.toHaveBeenCalled();
  });

  it('fires Sentry error alert with profile-existence-gate tag', async () => {
    const { captureMessage } = await import('@sentry/nextjs');
    mockFrom.mockReturnValue(makeNoRowChainable());

    await callRoute({ priceId: 'price_supp_m' });

    expect(captureMessage).toHaveBeenCalledWith(
      'Checkout blocked: no profile row for authenticated user',
      expect.objectContaining({
        level: 'error',
        tags: expect.objectContaining({ check: 'profile-existence-gate' }),
      })
    );
  });

  it('returns HTTP 500 (not 400) when the DB itself errors on profile lookup', async () => {
    const dbErrorChainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB timeout' } }),
      update: vi.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(dbErrorChainable);

    const res = await callRoute({ priceId: 'price_supp_m' });

    // DB error → 500, not 400 — the caller cannot recover by signing out
    expect(res.status).toBe(500);
  });

  it('proceeds normally when profile row is present', async () => {
    const existingProfileChainable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { stripe_customer_id: 'cus_existing' },
        error: null,
      }),
      update: vi.fn().mockReturnThis(),
    };
    mockFrom.mockReturnValue(existingProfileChainable);
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/sess' });

    const res = await callRoute({ priceId: 'price_supp_m' });

    expect(res.status).toBe(200);
    expect((await res.json()).url).toBe('https://checkout.stripe.com/sess');
    expect(mockCustomersCreate).not.toHaveBeenCalled(); // reused existing customer
  });
});
