import { describe, it, expect, vi, beforeEach } from 'vitest';
import posthog from 'posthog-js';
import * as analytics from '@/lib/analytics';

// Mock posthog-js so capturePostHog's dynamic import resolves to the spy.
vi.mock('posthog-js', () => ({
  default: {
    __loaded: true,
    capture: vi.fn(),
    setPersonProperties: vi.fn(),
  },
}));

// Dynamic import() in capturePostHog resolves in the macrotask queue, not microtasks.
const flush = () => new Promise<void>(resolve => setTimeout(resolve, 0));

// ── Analytics events tests ──────────────────────────────────────

describe('analytics events', () => {
  beforeEach(() => {
    vi.mocked(posthog.capture).mockClear();
  });

  it('capturePostHog is exported as a function', async () => {
    expect(typeof analytics.capturePostHog).toBe('function');
    analytics.capturePostHog('test');
    await flush(); // drain so this test's async doesn't bleed into the next
    vi.mocked(posthog.capture).mockClear();
  });

  it('signupCompleted fires PostHog with source prop', async () => {
    analytics.events.signupCompleted('pricing');
    await flush();
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith('Signup Completed', { source: 'pricing' });
  });

  it('subscriptionStarted fires PostHog with tier, interval, source', async () => {
    analytics.events.subscriptionStarted('supporter', 'monthly', 'pricing_page');
    await flush();
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith('Subscription Started', {
      tier: 'supporter',
      interval: 'monthly',
      source: 'pricing_page',
    });
  });

  it('subscriptionCancelled fires PostHog with tier and months_active', async () => {
    analytics.events.subscriptionCancelled('champion', 6);
    await flush();
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith('Subscription Cancelled', {
      tier: 'champion',
      months_active: 6,
    });
  });

  it('errorRecovery fires PostHog with error_type and recovered flag', async () => {
    analytics.events.errorRecovery('upload_failed', true);
    await flush();
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith('Error Recovery', {
      error_type: 'upload_failed',
      recovered: true,
    });
  });

  it('pricingViewed fires PostHog', async () => {
    analytics.events.pricingViewed();
    await flush();
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith('Pricing Viewed', undefined);
  });

  it('checkoutStarted fires PostHog with tier, interval, source', async () => {
    analytics.events.checkoutStarted('champion', 'yearly', 'banner');
    await flush();
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith('Checkout Started', {
      tier: 'champion',
      interval: 'yearly',
      source: 'banner',
    });
  });

  it('aiCreditsExhausted fires PostHog', async () => {
    analytics.events.aiCreditsExhausted();
    await flush();
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith('AI Credits Exhausted', undefined);
  });

  it('aiInsightRequested fires PostHog with tier', async () => {
    analytics.events.aiInsightRequested('free');
    await flush();
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith('AI Insight Requested', { tier: 'free' });
  });

  it('aiInsightsButtonClicked fires PostHog with tier and credits_remaining', async () => {
    analytics.events.aiInsightsButtonClicked('supporter', 2);
    await flush();
    expect(vi.mocked(posthog.capture)).toHaveBeenCalledWith('AI Insights Button Clicked', {
      tier: 'supporter',
      credits_remaining: 2,
    });
  });
});

// ── ML export route auth tests ──────────────────────────────────

describe('ML export route authentication', () => {
  it('rejects requests without ADMIN_API_KEY header', async () => {
    const { validateAdminAuth } = await import('@/lib/admin-auth');
    const result = validateAdminAuth(null, 'test-secret');
    expect(result.authorized).toBe(false);
  });

  it('rejects requests with wrong ADMIN_API_KEY', async () => {
    const { validateAdminAuth } = await import('@/lib/admin-auth');
    const result = validateAdminAuth('wrong-key', 'test-secret');
    expect(result.authorized).toBe(false);
  });

  it('accepts requests with correct ADMIN_API_KEY', async () => {
    const { validateAdminAuth } = await import('@/lib/admin-auth');
    const result = validateAdminAuth('test-secret', 'test-secret');
    expect(result.authorized).toBe(true);
  });

  it('rejects when ADMIN_API_KEY env var is not configured', async () => {
    const { validateAdminAuth } = await import('@/lib/admin-auth');
    const result = validateAdminAuth('any-key', undefined);
    expect(result.authorized).toBe(false);
  });
});
