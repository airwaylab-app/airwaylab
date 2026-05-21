/**
 * Tests for .single() error destructuring in customer-portal route (AIR-1878).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCaptureException = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: vi.fn(),
}));

vi.mock('@/lib/csrf', () => ({ validateOrigin: vi.fn(() => true) }));

vi.mock('@/lib/rate-limit', () => ({
  stripeRateLimiter: { isLimited: vi.fn(() => false) },
  getRateLimitKey: vi.fn(() => '127.0.0.1'),
}));

const dbError = { code: 'PGRST116', message: 'no rows returned', details: null, hint: null };

const mockSingleFn = vi.fn();
const mockFromFn = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: (...args: unknown[]) => mockSingleFn(...args),
});

vi.mock('@/lib/auth/validate-profile', () => ({
  validateProfileExists: vi.fn().mockResolvedValue({ valid: true }),
}));

vi.mock('@/lib/supabase/server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from: (...args: unknown[]) => mockFromFn(...args),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-xyz' } }, error: null }) },
  })),
  getSupabaseServiceRole: vi.fn(() => null),
}));

function makeRequest() {
  return new Request('https://airwaylab.app/api/customer-portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'https://airwaylab.app' },
    body: JSON.stringify({}),
  });
}

describe('customer-portal: profile lookup DB error', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder';
    mockSingleFn.mockResolvedValue({ data: null, error: dbError });
  });

  it('returns 500 (not 404) when profile lookup returns a DB error', async () => {
    const { POST } = await import('@/app/api/customer-portal/route');
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Service temporarily unavailable');
  });

  it('captures profile error to Sentry with route and check tags', async () => {
    const { POST } = await import('@/app/api/customer-portal/route');
    await POST(makeRequest() as never);
    expect(mockCaptureException).toHaveBeenCalledWith(
      dbError,
      expect.objectContaining({
        tags: expect.objectContaining({ route: 'customer-portal', check: 'profile-lookup' }),
        extra: expect.objectContaining({ userId: 'user-xyz' }),
      })
    );
  });

  it('returns 404 when profile has no stripe_customer_id (genuine missing, no DB error)', async () => {
    mockSingleFn.mockResolvedValue({ data: { stripe_customer_id: null }, error: null });
    const { POST } = await import('@/app/api/customer-portal/route');
    const res = await POST(makeRequest() as never);
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe('No billing account found');
  });
});
