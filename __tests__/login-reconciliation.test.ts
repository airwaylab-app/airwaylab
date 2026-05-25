import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';

// ── Mocks ──────────────────────────────────────────────────────────────

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

const mockGetSession = vi.fn();
const mockGetUser = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFromFn = vi.fn();

const mockSupabase = {
  auth: {
    getSession: () => mockGetSession(),
    getUser: () => mockGetUser(),
    onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
  },
  from: (table: string) => mockFromFn(table),
};

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowser: vi.fn(() => mockSupabase),
}));

// Mock global fetch
const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });

// ── Helpers ────────────────────────────────────────────────────────────

function makeChain(finalValue: unknown) {
  const chain: Record<string, unknown> = {};
  chain['select'] = vi.fn().mockReturnValue(chain);
  chain['eq'] = vi.fn().mockReturnValue(chain);
  chain['in'] = vi.fn().mockReturnValue(chain);
  chain['order'] = vi.fn().mockReturnValue(chain);
  chain['limit'] = vi.fn().mockReturnValue(chain);
  chain['maybeSingle'] = vi.fn().mockResolvedValue(finalValue);
  chain['single'] = vi.fn().mockResolvedValue(finalValue);
  return chain;
}

function setupSession(userId = 'user-abc') {
  const session = { user: { id: userId } };
  mockGetSession.mockResolvedValue({ data: { session } });
  mockOnAuthStateChange.mockImplementation((_event: unknown, _cb: unknown) => {
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  });
}

function TierReader() {
  const { tier, isLoading } = useAuth();
  if (isLoading) return React.createElement('span', { 'data-testid': 'loading' }, 'loading');
  return React.createElement('span', { 'data-testid': 'tier' }, tier);
}

// ── Tests ──────────────────────────────────────────────────────────────

describe('auth-context login-time drift reconciliation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fires sync-subscription when profile.tier is champion but no active subscription exists', async () => {
    setupSession();

    mockFromFn.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeChain({ data: {
          id: 'user-abc', email: 'test@example.com', display_name: null,
          tier: 'champion', stripe_customer_id: null,
          show_on_supporters: false, walkthrough_completed: false,
          email_opt_in: false, discord_id: null, discord_username: null,
        }, error: null });
      }
      if (table === 'subscriptions') {
        return makeChain({ data: null, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const { getByTestId } = render(
      React.createElement(AuthProvider, null, React.createElement(TierReader))
    );

    await waitFor(() => {
      expect(getByTestId('tier').textContent).toBe('community');
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/auth/sync-subscription',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('does NOT fire sync-subscription when profile.tier matches subscription.tier', async () => {
    setupSession();

    mockFromFn.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeChain({ data: {
          id: 'user-abc', email: 'test@example.com', display_name: null,
          tier: 'supporter', stripe_customer_id: 'cus_123',
          show_on_supporters: false, walkthrough_completed: false,
          email_opt_in: false, discord_id: null, discord_username: null,
        }, error: null });
      }
      if (table === 'subscriptions') {
        return makeChain({ data: {
          id: 'sub-1', stripe_subscription_id: 'sub_stripe_1',
          stripe_price_id: 'price_supp', status: 'active',
          tier: 'supporter', current_period_end: null, cancel_at_period_end: false,
        }, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    render(
      React.createElement(AuthProvider, null, React.createElement(TierReader))
    );

    await waitFor(() => {
      expect(mockFetch).not.toHaveBeenCalledWith(
        '/api/auth/sync-subscription',
        expect.anything()
      );
    }, { timeout: 500 });

    // After settling, fetch should still not have been called with sync-subscription
    expect(mockFetch).not.toHaveBeenCalledWith(
      '/api/auth/sync-subscription',
      expect.anything()
    );
  });

  it('returns corrected tier immediately (optimistic update) when drift detected', async () => {
    setupSession();

    mockFromFn.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeChain({ data: {
          id: 'user-abc', email: 'test@example.com', display_name: null,
          tier: 'champion', stripe_customer_id: null,
          show_on_supporters: false, walkthrough_completed: false,
          email_opt_in: false, discord_id: null, discord_username: null,
        }, error: null });
      }
      if (table === 'subscriptions') {
        return makeChain({ data: null, error: null });
      }
      return makeChain({ data: null, error: null });
    });

    const { getByTestId } = render(
      React.createElement(AuthProvider, null, React.createElement(TierReader))
    );

    await waitFor(() => {
      expect(getByTestId('tier').textContent).toBe('community');
    });
  });
});
