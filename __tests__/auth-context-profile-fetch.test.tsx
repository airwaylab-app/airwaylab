import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowser: vi.fn(),
}))

import * as Sentry from '@sentry/nextjs';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';

// Consumer that exposes auth state for assertions
function TestConsumer() {
  const { profile, isLoading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{isLoading ? 'loading' : 'ready'}</span>
      <span data-testid="profile-id">{profile ? profile.id : 'null'}</span>
    </div>
  );
}

function makeProfileChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue(result),
      }),
    }),
  };
}

function makeSubChain(result: { data: unknown; error: unknown }) {
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

function makeSupabaseMock({
  profileResult,
  subResult = { data: null, error: null },
  userId = 'user-abc',
}: {
  profileResult: { data: unknown; error: unknown };
  subResult?: { data: unknown; error: unknown };
  userId?: string;
}) {
  return {
    from: vi.fn((table: string) =>
      table === 'profiles' ? makeProfileChain(profileResult) : makeSubChain(subResult)
    ),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: userId } } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOtp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  };
}

// Helper for retry tests: the profile maybeSingle mock is shared across from() calls so
// mockResolvedValueOnce sequences work across the initial query and any retry.
function makeSupabaseMockWithProfileRetry({
  profileResults,
  subResult = { data: null, error: null },
  userId = 'user-abc',
}: {
  profileResults: Array<{ data: unknown; error: unknown }>;
  subResult?: { data: unknown; error: unknown };
  userId?: string;
}) {
  const maybeSingleMock = vi.fn();
  profileResults.forEach((r) => maybeSingleMock.mockResolvedValueOnce(r));
  // Return same chain object on every from('profiles') call so the mock state is preserved.
  const sharedProfileChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: maybeSingleMock,
      }),
    }),
  };
  return {
    from: vi.fn((table: string) =>
      table === 'profiles' ? sharedProfileChain : makeSubChain(subResult)
    ),
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: userId } } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOtp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    },
  };
}

const SAMPLE_PROFILE = {
  id: 'user-abc',
  email: 'test@example.com',
  display_name: 'Test User',
  tier: 'community' as const,
  stripe_customer_id: null,
  show_on_supporters: false,
  walkthrough_completed: false,
  email_opt_in: false,
  discord_id: null,
  discord_username: null,
};

describe('AuthProvider fetchProfile — AIR-1486 regression', () => {
  beforeEach(() => {
    vi.mocked(Sentry.captureMessage).mockClear();
    vi.mocked(Sentry.captureException).mockClear();
    vi.mocked(Sentry.setUser).mockClear();
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it('does not throw when maybeSingle returns null (missing profile row) — AIR-1486', async () => {
    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMock({ profileResult: { data: null, error: null } }) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'));
    expect(screen.getByTestId('profile-id')).toHaveTextContent('null');
    expect(vi.mocked(Sentry.captureMessage)).toHaveBeenCalledWith(
      'Profile row missing for authenticated user',
      expect.objectContaining({ level: 'warning' })
    );
  });

  it('sets profile in context when maybeSingle returns a row', async () => {
    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMock({ profileResult: { data: SAMPLE_PROFILE, error: null } }) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'));
    expect(screen.getByTestId('profile-id')).toHaveTextContent('user-abc');
    expect(vi.mocked(Sentry.captureMessage)).not.toHaveBeenCalled();
  });

  it('captures Sentry warning (not exception) on profile fetch error', async () => {
    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMock({
        profileResult: { data: null, error: { message: 'DB connection timeout' } },
      }) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'));
    expect(vi.mocked(Sentry.captureMessage)).toHaveBeenCalledWith(
      expect.stringContaining('DB connection timeout'),
      expect.objectContaining({ level: 'warning' })
    );
    expect(vi.mocked(Sentry.captureException)).not.toHaveBeenCalled();
  });

  it('suppresses Sentry on "Lock was stolen" transient error', async () => {
    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMock({
        profileResult: { data: null, error: { message: 'Lock was stolen by another request' } },
      }) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'));
    expect(vi.mocked(Sentry.captureMessage)).not.toHaveBeenCalled();
    expect(vi.mocked(Sentry.captureException)).not.toHaveBeenCalled();
  });

  // AIR-1763: Chrome 116+ / newer GoTrue surfaces a different error string for the same
  // navigator.locks race — "Lock broken by another request with the 'steal' option."
  // The previous check (includes('Lock was stolen')) missed this variant, leaking events
  // to Sentry (JAVASCRIPT-NEXTJS-2M + 5M).
  it('suppresses Sentry on "steal option" lock contention variant (AIR-1763)', async () => {
    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMock({
        profileResult: {
          data: null,
          error: { message: "Lock broken by another request with the 'steal' option." },
        },
      }) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'));
    expect(vi.mocked(Sentry.captureMessage)).not.toHaveBeenCalled();
    expect(vi.mocked(Sentry.captureException)).not.toHaveBeenCalled();
  });

  // AIR-2369: JAVASCRIPT-NEXTJS-6J — NetworkError on profile fetch from transient Supabase
  // EU connectivity blip. The retry resolves it; Sentry must not fire.
  it('retries once on NetworkError and sets profile without firing Sentry (AIR-2369)', async () => {
    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMockWithProfileRetry({
        profileResults: [
          { data: null, error: { message: 'NetworkError when attempting to fetch resource.' } },
          { data: SAMPLE_PROFILE, error: null },
        ],
      }) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'), {
      timeout: 3000,
    });
    expect(screen.getByTestId('profile-id')).toHaveTextContent('user-abc');
    expect(vi.mocked(Sentry.captureMessage)).not.toHaveBeenCalled();
    expect(vi.mocked(Sentry.captureException)).not.toHaveBeenCalled();
  });

  it('fires Sentry with after_retry=true when NetworkError persists after retry (AIR-2369)', async () => {
    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMockWithProfileRetry({
        profileResults: [
          { data: null, error: { message: 'NetworkError when attempting to fetch resource.' } },
          { data: null, error: { message: 'NetworkError when attempting to fetch resource.' } },
        ],
      }) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><TestConsumer /></AuthProvider>);

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'), {
      timeout: 3000,
    });
    expect(screen.getByTestId('profile-id')).toHaveTextContent('null');
    expect(vi.mocked(Sentry.captureMessage)).toHaveBeenCalledWith(
      expect.stringContaining('NetworkError'),
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({ after_retry: 'true' }),
      })
    );
  });
});
