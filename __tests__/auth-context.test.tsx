import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mock localStorage ────────────────────────────────────────────
const storage = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: vi.fn((key: string) => storage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { storage.set(key, value); }),
  removeItem: vi.fn((key: string) => { storage.delete(key); }),
  clear: vi.fn(() => { storage.clear(); }),
  get length() { return storage.size; },
  key: vi.fn((index: number) => Array.from(storage.keys())[index] ?? null),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

// ── Mock fetch (for email opt-in POST) ──────────────────────────
const fetchMock = vi.fn(() => Promise.resolve(new Response()));
globalThis.fetch = fetchMock;

// ── Mock Sentry ─────────────────────────────────────────────────
const mockCaptureException = vi.fn();
const mockCaptureMessage = vi.fn();
const mockSetUser = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: (...args: unknown[]) => mockCaptureMessage(...args),
  setUser: (...args: unknown[]) => mockSetUser(...args),
}));

// ── Mock Supabase client ────────────────────────────────────────
// Build a chainable query builder that resolves to configurable data
type QueryResult = { data: Record<string, unknown> | null; error: { message: string } | null };

function makeQueryBuilder(result: QueryResult) {
  const builder: Record<string, unknown> = {};
  const chainMethods = ['select', 'eq', 'in', 'order', 'limit'];
  for (const method of chainMethods) {
    builder[method] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  return builder;
}

let mockProfileResult: QueryResult = { data: null, error: null };
let mockSubscriptionResult: QueryResult = { data: null, error: null };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
const mockFrom = vi.fn((table: string) => {
  if (table === 'profiles') return makeQueryBuilder(mockProfileResult);
  if (table === 'subscriptions') return makeQueryBuilder(mockSubscriptionResult);
  return makeQueryBuilder({ data: null, error: null });
});

const mockUpdate = vi.fn(() => ({
  eq: vi.fn(() => Promise.resolve({ error: null })),
}));

   
const mockFromWithUpdate = vi.fn((table: string) => {
  if (table === 'profiles') {
    const qb = makeQueryBuilder(mockProfileResult);
    qb.update = mockUpdate;
    return qb;
  }
  if (table === 'subscriptions') return makeQueryBuilder(mockSubscriptionResult);
  return makeQueryBuilder({ data: null, error: null });
});

let mockSession: { user: { id: string; email: string } } | null = null;
const mockGetSession = vi.fn(() => Promise.resolve({ data: { session: mockSession } }));
const mockGetUser = vi.fn(() => Promise.resolve({ data: { user: null } }));
const mockSignInWithOtp = vi.fn(() => Promise.resolve({ error: null as { message: string } | null }));
const mockSignOut = vi.fn(() => Promise.resolve({ error: null as { message: string } | null }));
const mockUnsubscribe = vi.fn();

type AuthCallback = (event: string, session: unknown) => void;
let authChangeCallback: AuthCallback | null = null;

const mockOnAuthStateChange = vi.fn((callback: AuthCallback) => {
  authChangeCallback = callback;
  return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
});

const mockSupabase = {
  from: mockFromWithUpdate,
  auth: {
    getSession: mockGetSession,
    getUser: mockGetUser,
    signInWithOtp: mockSignInWithOtp,
    signOut: mockSignOut,
    onAuthStateChange: mockOnAuthStateChange,
  },
};

let supabaseEnabled = true;

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowser: () => supabaseEnabled ? mockSupabase : null,
}));

import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import type { Tier } from '@/lib/auth/auth-context';

// ── Test consumer component ─────────────────────────────────────
function AuthConsumer() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.id : 'null'}</span>
      <span data-testid="tier">{auth.tier}</span>
      <span data-testid="isPaid">{String(auth.isPaid)}</span>
      <span data-testid="isLoading">{String(auth.isLoading)}</span>
      <span data-testid="profile">{auth.profile ? JSON.stringify(auth.profile) : 'null'}</span>
      <span data-testid="subscription">{auth.subscription ? JSON.stringify(auth.subscription) : 'null'}</span>
      <button data-testid="sign-out" onClick={() => auth.signOut()}>Sign Out</button>
      <button data-testid="sign-in" onClick={() => auth.signIn('test@example.com')}>Sign In</button>
      <button data-testid="refresh" onClick={() => auth.refreshProfile()}>Refresh</button>
      <button data-testid="walkthrough" onClick={() => auth.markWalkthroughComplete()}>Complete Walkthrough</button>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────
function makeProfileData(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    display_name: 'Test User',
    tier: 'community' as Tier,
    stripe_customer_id: null,
    show_on_supporters: false,
    walkthrough_completed: false,
    email_opt_in: false,
    discord_id: null,
    discord_username: null,
    ...overrides,
  };
}

function makeSubscriptionData(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sub-1',
    stripe_subscription_id: 'sub_stripe_1',
    stripe_price_id: 'price_1',
    status: 'active',
    tier: 'supporter' as Tier,
    current_period_end: '2026-04-01T00:00:00Z',
    cancel_at_period_end: false,
    ...overrides,
  };
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <AuthConsumer />
    </AuthProvider>
  );
}

// ── Setup / Teardown ────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  storage.clear();
  mockSession = null;
  mockProfileResult = { data: null, error: null };
  mockSubscriptionResult = { data: null, error: null };
  supabaseEnabled = true;
  authChangeCallback = null;

  // Reset window.location.search to empty
  Object.defineProperty(window, 'location', {
    value: { ...window.location, search: '', pathname: '/', origin: 'http://localhost:3000' },
    writable: true,
  });
  window.history.replaceState = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ───────────────────────────────────────────────────────

describe('AuthProvider — rendering', () => {
  it('renders children', async () => {
    render(
      <AuthProvider>
        <div data-testid="child">Hello</div>
      </AuthProvider>
    );
    expect(screen.getByTestId('child')).toHaveTextContent('Hello');
  });

  it('provides auth context to child components', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('user')).toBeInTheDocument();
    });
  });
});

describe('useAuth — unauthenticated state', () => {
  it('returns null user when not authenticated', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
  });

  it('defaults tier to community when no profile', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('tier')).toHaveTextContent('community');
  });

  it('defaults isPaid to false when no profile', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('isPaid')).toHaveTextContent('false');
  });

  it('sets profile and subscription to null', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('profile')).toHaveTextContent('null');
    expect(screen.getByTestId('subscription')).toHaveTextContent('null');
  });
});

describe('useAuth — authenticated state', () => {
  beforeEach(() => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData(), error: null };
    mockSubscriptionResult = { data: null, error: null };
  });

  it('sets user from session', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('user-123');
  });

  it('fetches and sets profile data', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    const profileText = screen.getByTestId('profile').textContent!;
    const profile = JSON.parse(profileText);
    expect(profile.email).toBe('test@example.com');
    expect(profile.display_name).toBe('Test User');
  });
});

describe('Tier computation', () => {
  it('returns community tier for community profile', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData({ tier: 'community' }), error: null };
    mockSubscriptionResult = { data: null, error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('tier')).toHaveTextContent('community');
    expect(screen.getByTestId('isPaid')).toHaveTextContent('false');
  });

  it('returns supporter tier and isPaid=true', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData({ tier: 'supporter' }), error: null };
    mockSubscriptionResult = { data: makeSubscriptionData({ tier: 'supporter' }), error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('tier')).toHaveTextContent('supporter');
    expect(screen.getByTestId('isPaid')).toHaveTextContent('true');
  });

  it('returns champion tier and isPaid=true', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData({ tier: 'champion' }), error: null };
    mockSubscriptionResult = { data: makeSubscriptionData({ tier: 'champion' }), error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('tier')).toHaveTextContent('champion');
    expect(screen.getByTestId('isPaid')).toHaveTextContent('true');
  });

  it('falls back to community for invalid tier value in profile', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData({ tier: 'invalid_tier' }), error: null };
    mockSubscriptionResult = { data: null, error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('tier')).toHaveTextContent('community');
  });

  it('falls back to community for invalid tier value in subscription', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData({ tier: 'supporter' }), error: null };
    mockSubscriptionResult = { data: makeSubscriptionData({ tier: 'garbage' }), error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    // Tier is derived from profile, not subscription
    expect(screen.getByTestId('tier')).toHaveTextContent('supporter');
    // But verify the subscription stored has the validated tier
    const subText = screen.getByTestId('subscription').textContent!;
    const sub = JSON.parse(subText);
    expect(sub.tier).toBe('community'); // invalid -> fallback
  });
});

describe('Profile fetch error handling', () => {
  it('suppresses "Lock was stolen" errors (no Sentry, no console)', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = {
      data: null,
      error: { message: 'Lock was stolen by another request' },
    };
    mockSubscriptionResult = { data: null, error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    // "Lock was stolen" should NOT trigger Sentry
    expect(mockCaptureMessage).not.toHaveBeenCalled();
    expect(mockCaptureException).not.toHaveBeenCalled();
    // Should NOT log to console.error
    expect(consoleSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('[auth-context] Failed to fetch profile:'),
      expect.stringContaining('Lock was stolen')
    );
    consoleSpy.mockRestore();
  });

  it('reports non-lock profile errors to Sentry and console', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = {
      data: null,
      error: { message: 'relation "profiles" does not exist' },
    };
    mockSubscriptionResult = { data: null, error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('Profile fetch failed'),
      expect.objectContaining({
        level: 'warning',
        tags: { context: 'auth-profile-fetch' },
      })
    );
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('handles subscription fetch errors gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData(), error: null };
    mockSubscriptionResult = {
      data: null,
      error: { message: 'subscription table error' },
    };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    expect(mockCaptureMessage).toHaveBeenCalledWith(
      expect.stringContaining('Subscription fetch failed'),
      expect.objectContaining({
        level: 'warning',
        tags: { context: 'auth-subscription-fetch' },
      })
    );
    // Subscription should be null on error
    expect(screen.getByTestId('subscription')).toHaveTextContent('null');
    consoleSpy.mockRestore();
  });

  it('keeps profile even when subscription fetch fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData({ tier: 'supporter' }), error: null };
    mockSubscriptionResult = {
      data: null,
      error: { message: 'DB error' },
    };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    // Profile should still be set
    const profileText = screen.getByTestId('profile').textContent!;
    expect(profileText).not.toBe('null');
    const profile = JSON.parse(profileText);
    expect(profile.tier).toBe('supporter');
  });
});

describe('Sign out', () => {
  it('clears user, session, profile, and subscription on sign out', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData({ tier: 'supporter' }), error: null };
    mockSubscriptionResult = { data: makeSubscriptionData(), error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    // Confirm authenticated state
    expect(screen.getByTestId('user')).toHaveTextContent('user-123');
    expect(screen.getByTestId('tier')).toHaveTextContent('supporter');

    // Sign out
    await act(async () => {
      screen.getByTestId('sign-out').click();
    });

    expect(mockSignOut).toHaveBeenCalled();
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('profile')).toHaveTextContent('null');
    expect(screen.getByTestId('subscription')).toHaveTextContent('null');
    expect(screen.getByTestId('tier')).toHaveTextContent('community');
    expect(screen.getByTestId('isPaid')).toHaveTextContent('false');
  });

  it('reports sign-out errors to Sentry', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData(), error: null };
    mockSubscriptionResult = { data: null, error: null };
    mockSignOut.mockResolvedValueOnce({ error: { message: 'sign-out failed' } });

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('sign-out').click();
    });

    expect(mockCaptureException).toHaveBeenCalledWith(
      { message: 'sign-out failed' },
      expect.objectContaining({ tags: { context: 'auth-sign-out' } })
    );
    consoleSpy.mockRestore();
  });
});

describe('Sign in', () => {
  it('calls signInWithOtp with email and redirect URL', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('sign-in').click();
    });

    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: {
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    });
  });

  it('returns error message on OTP failure', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({
      error: { message: 'Invalid email format' },
    });

    // We need a component that captures the return value
    let signInResult: { error: string | null } | null = null;
    function SignInCapture() {
      const auth = useAuth();
      return (
        <button
          data-testid="do-sign-in"
          onClick={async () => {
            signInResult = await auth.signIn('bad@email');
          }}
        >
          Sign In
        </button>
      );
    }

    render(
      <AuthProvider>
        <SignInCapture />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('do-sign-in')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByTestId('do-sign-in').click();
    });

    expect(signInResult).toEqual({ error: 'Invalid email format' });
  });

  it('does not report rate-limit errors to Sentry', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({
      error: { message: 'For security purposes, please wait 60 seconds' },
    });

    let signInResult: { error: string | null } | null = null;
    function SignInCapture() {
      const auth = useAuth();
      return (
        <button
          data-testid="do-sign-in"
          onClick={async () => {
            signInResult = await auth.signIn('test@example.com');
          }}
        >
          Sign In
        </button>
      );
    }

    render(
      <AuthProvider>
        <SignInCapture />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('do-sign-in')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByTestId('do-sign-in').click();
    });

    // Error is returned to user but NOT sent to Sentry
    expect(signInResult!.error).toContain('security purposes');
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('reports unexpected sign-in errors to Sentry', async () => {
    mockSignInWithOtp.mockResolvedValueOnce({
      error: { message: 'Internal server error' },
    });

    function SignInCapture() {
      const auth = useAuth();
      return (
        <button
          data-testid="do-sign-in"
          onClick={() => auth.signIn('test@example.com')}
        >
          Sign In
        </button>
      );
    }

    render(
      <AuthProvider>
        <SignInCapture />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('do-sign-in')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByTestId('do-sign-in').click();
    });

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
      expect.objectContaining({
        tags: { context: 'auth-sign-in' },
        extra: { emailDomain: 'example.com' },
      })
    );
  });

  it('returns error when supabase is null', async () => {
    supabaseEnabled = false;

    let signInResult: { error: string | null } | null = null;
    function SignInCapture() {
      const auth = useAuth();
      return (
        <button
          data-testid="do-sign-in"
          onClick={async () => {
            signInResult = await auth.signIn('test@example.com');
          }}
        >
          Sign In
        </button>
      );
    }

    render(
      <AuthProvider>
        <SignInCapture />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('do-sign-in')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByTestId('do-sign-in').click();
    });

    expect(signInResult).toEqual({ error: 'Authentication is not configured.' });
  });

  it('catches thrown exceptions during sign-in', async () => {
    mockSignInWithOtp.mockRejectedValueOnce(new Error('Network failure'));

    let signInResult: { error: string | null } | null = null;
    function SignInCapture() {
      const auth = useAuth();
      return (
        <button
          data-testid="do-sign-in"
          onClick={async () => {
            signInResult = await auth.signIn('test@example.com');
          }}
        >
          Sign In
        </button>
      );
    }

    render(
      <AuthProvider>
        <SignInCapture />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('do-sign-in')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByTestId('do-sign-in').click();
    });

    expect(signInResult).toEqual({ error: 'An unexpected error occurred. Please try again.' });
    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { context: 'auth-sign-in', type: 'unexpected' },
      })
    );
  });
});

describe('Auth state change listener', () => {
  it('updates user and profile on auth state change to signed-in', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');

    // Simulate auth state change (user signs in)
    mockProfileResult = { data: makeProfileData({ tier: 'supporter' }), error: null };
    mockSubscriptionResult = { data: makeSubscriptionData(), error: null };

    await act(async () => {
      authChangeCallback?.('SIGNED_IN', {
        user: { id: 'user-123', email: 'test@example.com' },
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('user-123');
    });
  });

  it('clears profile and subscription on auth state change to signed-out', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData({ tier: 'supporter' }), error: null };
    mockSubscriptionResult = { data: makeSubscriptionData(), error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('user-123');

    // Simulate sign-out via auth state change
    await act(async () => {
      authChangeCallback?.('SIGNED_OUT', null);
    });

    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('profile')).toHaveTextContent('null');
    expect(screen.getByTestId('subscription')).toHaveTextContent('null');
  });

  it('unsubscribes from auth listener on unmount', async () => {
    const { unmount } = renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});

describe('Supabase unavailable (graceful degradation)', () => {
  it('sets isLoading to false immediately when supabase is null', async () => {
    supabaseEnabled = false;
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('null');
    expect(screen.getByTestId('tier')).toHaveTextContent('community');
  });
});

describe('Profile field defaults', () => {
  it('defaults walkthrough_completed to false when null', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = {
      data: makeProfileData({ walkthrough_completed: null }),
      error: null,
    };
    mockSubscriptionResult = { data: null, error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    const profile = JSON.parse(screen.getByTestId('profile').textContent!);
    expect(profile.walkthrough_completed).toBe(false);
  });

  it('defaults email_opt_in to false when null', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = {
      data: makeProfileData({ email_opt_in: null }),
      error: null,
    };
    mockSubscriptionResult = { data: null, error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    const profile = JSON.parse(screen.getByTestId('profile').textContent!);
    expect(profile.email_opt_in).toBe(false);
  });

  it('defaults discord fields to null when missing', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = {
      data: makeProfileData({ discord_id: undefined, discord_username: undefined }),
      error: null,
    };
    mockSubscriptionResult = { data: null, error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    const profile = JSON.parse(screen.getByTestId('profile').textContent!);
    expect(profile.discord_id).toBeNull();
    expect(profile.discord_username).toBeNull();
  });
});

describe('Subscription data', () => {
  it('stores subscription fields correctly', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData({ tier: 'supporter' }), error: null };
    mockSubscriptionResult = {
      data: makeSubscriptionData({
        cancel_at_period_end: true,
        current_period_end: '2026-05-01T00:00:00Z',
      }),
      error: null,
    };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    const sub = JSON.parse(screen.getByTestId('subscription').textContent!);
    expect(sub.cancel_at_period_end).toBe(true);
    expect(sub.current_period_end).toBe('2026-05-01T00:00:00Z');
    expect(sub.status).toBe('active');
  });

  it('sets subscription to null when no active subscription exists', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData(), error: null };
    mockSubscriptionResult = { data: null, error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    expect(screen.getByTestId('subscription')).toHaveTextContent('null');
  });
});

describe('markWalkthroughComplete', () => {
  it('sets localStorage fallback regardless of auth state', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    await act(async () => {
      screen.getByTestId('walkthrough').click();
    });

    expect(storage.get('airwaylab_walkthrough_done')).toBe('1');
  });
});

describe('Email opt-in pending', () => {
  it('sends opt-in POST when localStorage flag is set', async () => {
    storage.set('airwaylab_email_opt_in_pending', '1');
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData(), error: null };
    mockSubscriptionResult = { data: null, error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    // Wait for the email opt-in fetch to be called
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith('/api/email/opt-in', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opt_in: true }),
      }));
    });

    // localStorage flag should be removed
    expect(storage.has('airwaylab_email_opt_in_pending')).toBe(false);
  });

  it('does not send opt-in POST when no flag is set', async () => {
    mockSession = { user: { id: 'user-123', email: 'test@example.com' } };
    mockProfileResult = { data: makeProfileData(), error: null };
    mockSubscriptionResult = { data: null, error: null };

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    // Should not have called the opt-in endpoint
    expect(fetchMock).not.toHaveBeenCalledWith('/api/email/opt-in', expect.anything());
  });
});

describe('Lock was stolen — session retry', () => {
  it('retries getSession on Lock was stolen error', async () => {
    mockGetSession
      .mockRejectedValueOnce(new Error('Lock was stolen by another request'))
      .mockResolvedValueOnce({ data: { session: null } });

    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('isLoading')).toHaveTextContent('false');
    });

    // getSession should have been called twice (original + retry)
    expect(mockGetSession).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-lock errors from getSession', async () => {
    // Non-lock errors should NOT trigger the retry path.
    // The error propagates as an unhandled rejection (caught by React error boundaries
    // in production). Here we verify getSession is only called once (no retry).
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    let callCount = 0;
    mockGetSession.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error('Unexpected DB error'));
      }
      return Promise.resolve({ data: { session: null } });
    });

    // Suppress unhandled rejection at the process level (Vitest runs in Node)
    const noop = () => {};
    process.on('unhandledRejection', noop);

    renderWithProvider();
    await new Promise((r) => setTimeout(r, 200));

    // Non-lock errors should NOT trigger the retry: only 1 call
    expect(callCount).toBe(1);

    process.removeListener('unhandledRejection', noop);
    consoleSpy.mockRestore();
  });
});

describe('useAuth — outside provider', () => {
  it('throws when used outside AuthProvider', () => {
    // Suppress console.error from React about uncaught errors in render
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<AuthConsumer />);
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });
});
