import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Set env vars early via vi.hoisted
const { mockAuthGetUser, mockSupabaseFrom, mockAdminFrom, mockCheckoutCreate, mockCustomersCreate, mockValidateOrigin, mockIsLimited } = vi.hoisted(() => {
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID = 'price_supporter_monthly';
  process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID = 'price_supporter_yearly';
  process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID = 'price_champion_monthly';
  process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID = 'price_champion_yearly';

  return {
    mockAuthGetUser: vi.fn(),
    mockSupabaseFrom: vi.fn(),
    mockAdminFrom: vi.fn(),
    mockCheckoutCreate: vi.fn(),
    mockCustomersCreate: vi.fn(),
    mockValidateOrigin: vi.fn(() => true),
    mockIsLimited: vi.fn(() => false),
  };
});

// Mock Sentry
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: vi.fn(() => []),
    set: vi.fn(),
  })),
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    auth: { getUser: mockAuthGetUser },
    from: mockSupabaseFrom,
  })),
  getSupabaseServiceRole: vi.fn(() => ({
    from: mockAdminFrom,
  })),
}));

// Mock CSRF
vi.mock('@/lib/csrf', () => ({
  validateOrigin: mockValidateOrigin,
}));

// Mock rate limiter
vi.mock('@/lib/rate-limit', () => ({
  stripeRateLimiter: { isLimited: mockIsLimited },
  getRateLimitKey: vi.fn(() => '1.2.3.4'),
}));

// Mock Stripe
vi.mock('stripe', () => {
  class MockStripe {
    checkout = { sessions: { create: mockCheckoutCreate } };
    customers = { create: mockCustomersCreate };
  }
  return { default: MockStripe };
});

import { POST } from '@/app/api/create-checkout-session/route';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/create-checkout-session', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'origin': 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  });
}

describe('POST /api/create-checkout-session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidateOrigin.mockReturnValue(true);
    mockIsLimited.mockReturnValue(false);
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user_123', email: 'test@example.com' } },
      error: null,
    });
  });

  it('returns 403 when CSRF check fails', async () => {
    mockValidateOrigin.mockReturnValue(false);
    const res = await POST(makeRequest({ priceId: 'price_supporter_monthly' }));
    expect(res.status).toBe(403);
  });

  it('returns 429 when rate limited', async () => {
    mockIsLimited.mockReturnValue(true);
    const res = await POST(makeRequest({ priceId: 'price_supporter_monthly' }));
    expect(res.status).toBe(429);
  });

  it('returns 401 when user is not authenticated', async () => {
    mockAuthGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'No session' },
    });
    const res = await POST(makeRequest({ priceId: 'price_supporter_monthly' }));
    expect(res.status).toBe(401);
  });

  it('returns 400 when priceId is missing', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it('returns 400 when priceId is not in allowed list', async () => {
    const res = await POST(makeRequest({ priceId: 'price_evil_plan' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid price selected');
  });

  it('creates checkout session for valid request with existing customer', async () => {
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { stripe_customer_id: 'cus_existing' },
          })),
        })),
      })),
    });

    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/session123' });

    const res = await POST(makeRequest({ priceId: 'price_supporter_monthly' }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBe('https://checkout.stripe.com/session123');
  });

  it('creates new Stripe customer when none exists', async () => {
    // User has no stripe_customer_id
    mockSupabaseFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { stripe_customer_id: null },
          })),
        })),
      })),
    });

    // Admin re-check also returns null
    mockAdminFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({
            data: { stripe_customer_id: null },
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({ error: null })),
      })),
    });

    mockCustomersCreate.mockResolvedValue({ id: 'cus_new' });
    mockCheckoutCreate.mockResolvedValue({ url: 'https://checkout.stripe.com/new' });

    const res = await POST(makeRequest({ priceId: 'price_champion_monthly' }));
    expect(res.status).toBe(200);
    expect(mockCustomersCreate).toHaveBeenCalledWith({
      email: 'test@example.com',
      metadata: { supabase_user_id: 'user_123' },
    });
  });

  it('returns 400 for invalid JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': 'http://localhost:3000',
      },
      body: 'not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
