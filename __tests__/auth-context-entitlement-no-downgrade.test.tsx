import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowser: vi.fn(),
}));

import { getSupabaseBrowser } from '@/lib/supabase/client';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { canAccess } from '@/lib/auth/feature-gate';

// Surfaces the derived entitlement plus whether AI insights are unlocked,
// which is exactly what the A1 bug would lock out for a paid user.
function TestConsumer() {
  const { tier, isPaid, entitlementStatus } = useAuth();
  return (
    <div>
      <span data-testid="tier">{tier}</span>
      <span data-testid="isPaid">{isPaid ? 'paid' : 'free'}</span>
      <span data-testid="status">{entitlementStatus}</span>
      <span data-testid="deepAi">{canAccess('deep_ai_insights', tier) ? 'unlocked' : 'locked'}</span>
    </div>
  );
}

const USER_ID = 'user-paid';

// A profile-fetch result that flips between calls so we can simulate a
// successful first resolution followed by a transient error.
function makeProfilesTable(results: Array<{ data: unknown; error: unknown }>) {
  let call = 0;
  const next = () => results[Math.min(call++, results.length - 1)];
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockImplementation(() => Promise.resolve(next())),
      }),
    }),
  };
}

function makeSubTable(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue(result),
            }),
          }),
        }),
      }),
    }),
  };
}

// Captures the onAuthStateChange callback so a test can re-trigger fetchProfile.
let authChangeHandler: ((event: string, session: unknown) => void) | null = null;

function makeSupabaseMock({
  profileResults,
  subResult = { data: null, error: null },
}: {
  profileResults: Array<{ data: unknown; error: unknown }>;
  subResult?: { data: unknown; error: unknown };
}) {
  const profilesTable = makeProfilesTable(profileResults);
  return {
    from: vi.fn((table: string) =>
      table === 'profiles' ? profilesTable : makeSubTable(subResult)
    ),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: USER_ID } } },
      }),
      onAuthStateChange: vi.fn((cb: (e: string, s: unknown) => void) => {
        authChangeHandler = cb;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      }),
      signInWithOtp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  };
}

const CHAMPION_PROFILE = {
  id: USER_ID,
  email: 'paid@example.com',
  display_name: 'Paid User',
  tier: 'champion' as const,
  stripe_customer_id: 'cus_123',
  show_on_supporters: false,
  walkthrough_completed: true,
  email_opt_in: false,
  discord_id: null,
  discord_username: null,
  ai_insights_consent: true,
};

// Active subscription matching CHAMPION_PROFILE, so the login-time drift-heal
// (which reconciles profile.tier toward an active subscription) leaves the
// resolved tier at 'champion' instead of healing it down to 'community'.
const CHAMPION_SUB = {
  id: 'sub-1',
  stripe_subscription_id: 'sub_x',
  stripe_price_id: 'price_x',
  status: 'active',
  tier: 'champion' as const,
  current_period_end: null,
  cancel_at_period_end: false,
};

describe('AuthProvider entitlement — A1 no silent downgrade', () => {
  beforeEach(() => {
    authChangeHandler = null;
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it('keeps a paid user paid (and AI unlocked) when a later profile fetch errors', async () => {
    // 1st fetch: champion resolves. 2nd fetch (re-auth): transient DB error.
    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMock({
        profileResults: [
          { data: CHAMPION_PROFILE, error: null },
          { data: null, error: { message: 'DB connection timeout' } },
        ],
        subResult: { data: CHAMPION_SUB, error: null },
      }) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><TestConsumer /></AuthProvider>);

    // Resolved as champion.
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('resolved'));
    expect(screen.getByTestId('tier')).toHaveTextContent('champion');
    expect(screen.getByTestId('isPaid')).toHaveTextContent('paid');
    expect(screen.getByTestId('deepAi')).toHaveTextContent('unlocked');

    // Re-auth fires and the profile fetch now errors.
    await act(async () => {
      authChangeHandler?.('TOKEN_REFRESHED', { user: { id: USER_ID } });
      await Promise.resolve();
    });

    // Fetch is now unknown, but the paid entitlement must survive — no downgrade.
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unknown'));
    expect(screen.getByTestId('tier')).toHaveTextContent('champion');
    expect(screen.getByTestId('isPaid')).toHaveTextContent('paid');
    expect(screen.getByTestId('deepAi')).toHaveTextContent('unlocked');
  });

  it('cold start: profile fetch errors but a readable subscription keeps the user paid (the A1 lockout)', async () => {
    // This is the exact A1 regression: on the FIRST load the profile read
    // fails, so the old code left profile=null and derived tier='community',
    // locking a paid user out of AI/benchmarks. The subscription row is the
    // server source of truth and must establish entitlement instead.
    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMock({
        profileResults: [{ data: null, error: { message: 'DB connection timeout' } }],
        subResult: { data: { ...CHAMPION_SUB, tier: 'champion' }, error: null },
      }) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unknown'));
    // No silent downgrade: subscription fallback grants champion access.
    expect(screen.getByTestId('tier')).toHaveTextContent('champion');
    expect(screen.getByTestId('isPaid')).toHaveTextContent('paid');
    expect(screen.getByTestId('deepAi')).toHaveTextContent('unlocked');
  });

  it('falls back to a previously-loaded subscription row when a later profile fetch errors', async () => {
    // 1st fetch resolves supporter with a matching active subscription, which
    // persists in state. 2nd fetch errors; the subscription must hold the line.
    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMock({
        profileResults: [
          { data: { ...CHAMPION_PROFILE, tier: 'supporter' }, error: null },
          { data: null, error: { message: 'DB connection timeout' } },
        ],
        subResult: { data: { ...CHAMPION_SUB, tier: 'supporter' }, error: null },
      }) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('resolved'));
    expect(screen.getByTestId('tier')).toHaveTextContent('supporter');

    await act(async () => {
      authChangeHandler?.('TOKEN_REFRESHED', { user: { id: USER_ID } });
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('unknown'));
    // Subscription survives the profile error -> entitlement stays paid.
    expect(screen.getByTestId('tier')).toHaveTextContent('supporter');
    expect(screen.getByTestId('isPaid')).toHaveTextContent('paid');
  });

  it('still resolves a genuine community user to community (no false upgrade)', async () => {
    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMock({
        profileResults: [{ data: { ...CHAMPION_PROFILE, tier: 'community' }, error: null }],
      }) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('resolved'));
    expect(screen.getByTestId('tier')).toHaveTextContent('community');
    expect(screen.getByTestId('isPaid')).toHaveTextContent('free');
    expect(screen.getByTestId('deepAi')).toHaveTextContent('locked');
  });
});
