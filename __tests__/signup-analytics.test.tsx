/**
 * AIR-2169: Verify Signup Completed PostHog event fires on auth callback.
 *
 * Root cause: events.signupCompleted() was never called anywhere.
 * Fix: auth-context fires it when auth=success param is present AND
 *      the account was created within the last 2 minutes.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@sentry/nextjs', () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
}));

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseBrowser: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  events: {
    signupCompleted: vi.fn(),
    uploadStart: vi.fn(),
    analysisComplete: vi.fn(),
    demoLoaded: vi.fn(),
    mobileFilePickerTapped: vi.fn(),
    export: vi.fn(),
    emailSubscribe: vi.fn(),
    pricingViewed: vi.fn(),
    checkoutStarted: vi.fn(),
    authStarted: vi.fn(),
    authMagicLinkSent: vi.fn(),
    aiInsightRequested: vi.fn(),
    aiUpsellShown: vi.fn(),
    tabViewed: vi.fn(),
    nightSwitched: vi.fn(),
    thresholdCustomized: vi.fn(),
    contributionOptedIn: vi.fn(),
    contributionDismissed: vi.fn(),
    feedbackSubmitted: vi.fn(),
    returningUserUpload: vi.fn(),
    cloudSyncUsed: vi.fn(),
    shareOptinShown: vi.fn(),
    shareOptinSingle: vi.fn(),
    shareOptinAll: vi.fn(),
    shareOptinRemembered: vi.fn(),
    shareCreated: vi.fn(),
    shareViewed: vi.fn(),
    shareCopied: vi.fn(),
    shareExpiredView: vi.fn(),
    shareFilesUploaded: vi.fn(),
    shareFilesUploadFailed: vi.fn(),
    shareWaveformLoaded: vi.fn(),
    providersPageView: vi.fn(),
    providersDemoClick: vi.fn(),
    providersContactClick: vi.fn(),
    providersContactSubmit: vi.fn(),
    aiTeaserShown: vi.fn(),
    aiTeaserCtaClicked: vi.fn(),
    returningUserNudgeShown: vi.fn(),
    returningUserNudgeClicked: vi.fn(),
    authConsentChecked: vi.fn(),
    edfAutoUploadStarted: vi.fn(),
    edfAutoUploadCompleted: vi.fn(),
    edfAutoUploadFailed: vi.fn(),
    analysisDataStored: vi.fn(),
    aiInsightsButtonClicked: vi.fn(),
    aiInsightsGenerated: vi.fn(),
    aiInsightsFailed: vi.fn(),
    aiCreditsExhausted: vi.fn(),
    deepTeaserShown: vi.fn(),
    deepTeaserCtaClicked: vi.fn(),
    dataDeletionRequested: vi.fn(),
    dataDeletionCompleted: vi.fn(),
    subscriptionStarted: vi.fn(),
    subscriptionCancelled: vi.fn(),
    errorRecovery: vi.fn(),
    gettingStartedViewed: vi.fn(),
    walkthroughStarted: vi.fn(),
    walkthroughStepViewed: vi.fn(),
    walkthroughCompleted: vi.fn(),
    walkthroughSkipped: vi.fn(),
    communityBenchmarksViewed: vi.fn(),
    upgradeNudgeDismissed: vi.fn(),
    upgradeNudgeClicked: vi.fn(),
    mobileReminderShown: vi.fn(),
    mobileReminderSubmitted: vi.fn(),
    mobileReminderSuccess: vi.fn(),
    mobileReminderError: vi.fn(),
    communityPromptShown: vi.fn(),
    communityPromptDismissed: vi.fn(),
    communityPromptGitHubClicked: vi.fn(),
    communityPromptDiscordClicked: vi.fn(),
    championTrendViewed: vi.fn(),
    championTrendUpsellViewed: vi.fn(),
  },
  trackEvent: vi.fn(),
  capturePostHog: vi.fn(),
  setPostHogPersonProps: vi.fn(),
}));

import { getSupabaseBrowser } from '@/lib/supabase/client';
import { events } from '@/lib/analytics';
import { AuthProvider } from '@/lib/auth/auth-context';

const FRESH_CREATED_AT = new Date(Date.now() - 10_000).toISOString(); // 10 seconds ago
const OLD_CREATED_AT = new Date(Date.now() - 300_000).toISOString();  // 5 minutes ago

function makeProfile(userId: string) {
  return {
    id: userId,
    email: 'test@example.com',
    display_name: null,
    tier: 'community',
    stripe_customer_id: null,
    show_on_supporters: false,
    walkthrough_completed: false,
    email_opt_in: false,
    discord_id: null,
    discord_username: null,
  };
}

function makeFromChain(userId: string) {
  return vi.fn((table: string) => ({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue(
          table === 'profiles'
            ? { data: makeProfile(userId), error: null }
            : { data: null, error: null }
        ),
        in: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    }),
  }));
}

/** Simulates the race where getSession() returns null (cookie not yet visible) */
function makeSupabaseMockNullSession(createdAt: string, userId = 'user-new') {
  const freshUser = { id: userId, created_at: createdAt };
  const freshSession = { user: freshUser, access_token: 'tok' };
  return {
    from: makeFromChain(userId),
    auth: {
      getSession: vi.fn()
        .mockResolvedValueOnce({ data: { session: null } })
        .mockResolvedValue({ data: { session: freshSession } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: freshUser } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOtp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

/** Simulates normal case where getSession() immediately returns the new session */
function makeSupabaseMockWithSession(createdAt: string, userId = 'user-existing') {
  const freshUser = { id: userId, created_at: createdAt };
  const freshSession = { user: freshUser, access_token: 'tok' };
  return {
    from: makeFromChain(userId),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: freshSession } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: freshUser } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOtp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  };
}

describe('Signup Completed analytics — AIR-2169', () => {
  beforeEach(() => {
    vi.mocked(events.signupCompleted).mockClear();
  });

  afterEach(() => {
    // Reset URL to bare path after each test
    window.history.pushState({}, '', '/analyze');
  });

  it('fires signupCompleted when auth=success param present and account is new (getSession null path)', async () => {
    window.history.pushState({}, '', '/analyze?auth=success');

    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMockNullSession(FRESH_CREATED_AT) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><div /></AuthProvider>);

    await waitFor(() => {
      expect(vi.mocked(events.signupCompleted)).toHaveBeenCalledWith('magic_link');
    });
  });

  it('fires signupCompleted when auth=success present and getSession already resolved (common path)', async () => {
    window.history.pushState({}, '', '/analyze?auth=success');

    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMockWithSession(FRESH_CREATED_AT) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><div /></AuthProvider>);

    await waitFor(() => {
      expect(vi.mocked(events.signupCompleted)).toHaveBeenCalledWith('magic_link');
    });
  });

  it('does NOT fire signupCompleted for returning user (account older than 2 minutes)', async () => {
    window.history.pushState({}, '', '/analyze?auth=success');

    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMockWithSession(OLD_CREATED_AT, 'user-returning') as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><div /></AuthProvider>);

    await new Promise((r) => setTimeout(r, 150));
    expect(vi.mocked(events.signupCompleted)).not.toHaveBeenCalled();
  });

  it('does NOT fire signupCompleted when auth param is absent', async () => {
    window.history.pushState({}, '', '/analyze');

    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMockWithSession(FRESH_CREATED_AT) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><div /></AuthProvider>);

    await new Promise((r) => setTimeout(r, 150));
    expect(vi.mocked(events.signupCompleted)).not.toHaveBeenCalled();
  });

  it('cleans up auth URL param after processing', async () => {
    window.history.pushState({}, '', '/analyze?auth=success');

    const replaceStateSpy = vi.spyOn(window.history, 'replaceState');

    vi.mocked(getSupabaseBrowser).mockReturnValue(
      makeSupabaseMockNullSession(FRESH_CREATED_AT) as ReturnType<typeof getSupabaseBrowser>
    );

    render(<AuthProvider><div /></AuthProvider>);

    await waitFor(() => {
      expect(replaceStateSpy).toHaveBeenCalledWith(
        {},
        '',
        expect.not.stringContaining('auth=')
      );
    });

    replaceStateSpy.mockRestore();
  });
});
