import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Analytics events tests ──────────────────────────────────────

describe('analytics events', () => {
  beforeEach(() => {
    vi.resetModules();
    // Clean window.plausible
    if (typeof window !== 'undefined') {
      delete (window as unknown as Record<string, unknown>).plausible;
    }
  });

  it('trackEvent no-ops when plausible is not loaded', async () => {
    const { trackEvent } = await import('@/lib/analytics');
    // Should not throw
    expect(() => trackEvent('Test Event')).not.toThrow();
  });

  it('trackEvent fires plausible with correct event name and props', async () => {
    const mockPlausible = vi.fn();
    (window as unknown as Record<string, unknown>).plausible = mockPlausible;

    const { trackEvent } = await import('@/lib/analytics');
    trackEvent('Signup Completed', { source: 'ai_teaser' });

    expect(mockPlausible).toHaveBeenCalledWith('Signup Completed', {
      props: { source: 'ai_teaser' },
    });
  });

  it('signupCompleted event fires with source prop', async () => {
    const mockPlausible = vi.fn();
    (window as unknown as Record<string, unknown>).plausible = mockPlausible;

    const { events } = await import('@/lib/analytics');
    events.signupCompleted('pricing');

    expect(mockPlausible).toHaveBeenCalledWith('Signup Completed', {
      props: { source: 'pricing' },
    });
  });

  it('subscriptionStarted event fires with tier, interval, source', async () => {
    const mockPlausible = vi.fn();
    (window as unknown as Record<string, unknown>).plausible = mockPlausible;

    const { events } = await import('@/lib/analytics');
    events.subscriptionStarted('supporter', 'monthly', 'pricing_page');

    expect(mockPlausible).toHaveBeenCalledWith('Subscription Started', {
      props: { tier: 'supporter', interval: 'monthly', source: 'pricing_page' },
    });
  });

  it('subscriptionCancelled event fires with tier and months_active', async () => {
    const mockPlausible = vi.fn();
    (window as unknown as Record<string, unknown>).plausible = mockPlausible;

    const { events } = await import('@/lib/analytics');
    events.subscriptionCancelled('champion', 6);

    expect(mockPlausible).toHaveBeenCalledWith('Subscription Cancelled', {
      props: { tier: 'champion', months_active: 6 },
    });
  });

  it('errorRecovery event fires with error_type and recovered flag', async () => {
    const mockPlausible = vi.fn();
    (window as unknown as Record<string, unknown>).plausible = mockPlausible;

    const { events } = await import('@/lib/analytics');
    events.errorRecovery('upload_failed', true);

    expect(mockPlausible).toHaveBeenCalledWith('Error Recovery', {
      props: { error_type: 'upload_failed', recovered: true },
    });
  });
});

// ── ML export route auth tests ──────────────────────────────────

describe('ML export route authentication', () => {
  it('rejects requests without ADMIN_API_KEY header', async () => {
    // Import the validation helper
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
