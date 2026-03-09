import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Set env vars before anything else via vi.hoisted
const { mockConstructEvent, mockSubscriptionsRetrieve, mockSupabase } = vi.hoisted(() => {
  // Set env vars as early as possible
  process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_123';
  process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_MONTHLY_PRICE_ID = 'price_supporter_monthly';
  process.env.NEXT_PUBLIC_STRIPE_SUPPORTER_YEARLY_PRICE_ID = 'price_supporter_yearly';
  process.env.NEXT_PUBLIC_STRIPE_CHAMPION_MONTHLY_PRICE_ID = 'price_champion_monthly';
  process.env.NEXT_PUBLIC_STRIPE_CHAMPION_YEARLY_PRICE_ID = 'price_champion_yearly';

  return {
    mockConstructEvent: vi.fn(),
    mockSubscriptionsRetrieve: vi.fn(),
    mockSupabase: { from: vi.fn() },
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

// Mock Supabase service role
vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServiceRole: vi.fn(() => mockSupabase),
  getSupabaseServer: vi.fn(() => null),
}));

// Mock Stripe
vi.mock('stripe', () => {
  class MockStripe {
    webhooks = { constructEvent: mockConstructEvent };
    subscriptions = { retrieve: mockSubscriptionsRetrieve };
  }
  return { default: MockStripe };
});

import { NextRequest } from 'next/server';
import * as Sentry from '@sentry/nextjs';
import { POST } from '@/app/api/webhooks/stripe/route';

function makeWebhookRequest(body: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers: {
      'stripe-signature': 'test_sig',
      'content-type': 'application/json',
    },
    body,
  });
}

describe('Stripe Webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: idempotency insert succeeds (new event)
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return { insert: vi.fn(() => ({ error: null })) };
      }
      if (table === 'subscriptions') {
        return {
          upsert: vi.fn(() => ({ error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null })),
          })),
        };
      }
      if (table === 'profiles') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({ error: null })),
          })),
        };
      }
      return {};
    });
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/webhooks/stripe', {
      method: 'POST',
      body: '{}',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing signature');
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const res = await POST(makeWebhookRequest('{}'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid signature');
  });

  it('returns 200 with duplicate=true for already processed events', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: { object: {} },
    });

    // Simulate duplicate event (insert fails)
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return { insert: vi.fn(() => ({ error: { code: '23505' } })) };
      }
      return {};
    });

    const res = await POST(makeWebhookRequest('{}'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.duplicate).toBe(true);
  });

  it('logs warning for checkout.session.completed with missing metadata', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_test_2',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: {},
          subscription: null,
        },
      },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return { insert: vi.fn(() => ({ error: null })) };
      }
      return {};
    });

    const res = await POST(makeWebhookRequest('{}'));
    expect(res.status).toBe(200);
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      'Stripe checkout.session.completed missing userId or subscriptionId',
      expect.objectContaining({ level: 'warning' })
    );
  });

  it('logs unhandled event types', async () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    mockConstructEvent.mockReturnValue({
      id: 'evt_test_unhandled',
      type: 'some.unknown.event',
      data: { object: {} },
    });

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return { insert: vi.fn(() => ({ error: null })) };
      }
      return {};
    });

    const res = await POST(makeWebhookRequest('{}'));
    expect(res.status).toBe(200);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unhandled event type: some.unknown.event')
    );
    consoleSpy.mockRestore();
  });

  it('returns 500 when webhook handler throws', async () => {
    mockConstructEvent.mockReturnValue({
      id: 'evt_test_error',
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { supabase_user_id: 'user_123' },
          subscription: 'sub_123',
          customer: 'cus_123',
        },
      },
    });

    mockSubscriptionsRetrieve.mockRejectedValue(new Error('Stripe API down'));

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'stripe_events') {
        return { insert: vi.fn(() => ({ error: null })) };
      }
      return {};
    });

    const res = await POST(makeWebhookRequest('{}'));
    expect(res.status).toBe(500);
    expect(Sentry.captureException).toHaveBeenCalled();
  });
});
