import React from 'react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { NightResult } from '@/lib/types';

// ── Mock localStorage + sessionStorage ──────────────────────
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

const sessionStore = new Map<string, string>();
const sessionStorageMock: Storage = {
  getItem: vi.fn((key: string) => sessionStore.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => { sessionStore.set(key, value); }),
  removeItem: vi.fn((key: string) => { sessionStore.delete(key); }),
  clear: vi.fn(() => { sessionStore.clear(); }),
  get length() { return sessionStore.size; },
  key: vi.fn((index: number) => Array.from(sessionStore.keys())[index] ?? null),
};
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock, writable: true });

// ── Mock fetch ──────────────────────────────────────────────
const fetchMock = vi.fn();
globalThis.fetch = fetchMock;

// ── Mock analytics ──────────────────────────────────────────
vi.mock('@/lib/analytics', () => ({
  events: {
    contributionOptedIn: vi.fn(),
    contributionDismissed: vi.fn(),
  },
}));

// ── Mock contribute module ──────────────────────────────────
vi.mock('@/lib/contribute', () => ({
  contributeNights: vi.fn(() => Promise.resolve({ ok: true, totalSent: 1, contributionId: 'test' })),
  trackContributedDates: vi.fn(),
}));

import { DataContribution } from '@/components/dashboard/data-contribution';

// ── Helpers ─────────────────────────────────────────────────
function makeNight(dateStr: string): NightResult {
  return {
    date: new Date(dateStr),
    dateStr,
    durationHours: 7,
    sessionCount: 1,
    settings: {
      deviceModel: 'AirSense 10',
      papMode: 'CPAP',
      epap: 10,
      ipap: 10,
      pressureSupport: 0,
      riseTime: 1,
      trigger: 'Med',
      cycle: 'Med',
      easyBreathe: 'On',
    },
    glasgow: {
      overall: 3.5,
      skew: 0.5, spike: 0.3, flatTop: 0.4, topHeavy: 0.2,
      multiPeak: 0.3, noPause: 0.5, inspirRate: 0.4,
      multiBreath: 0.6, variableAmp: 0.5,
    },
    wat: { flScore: 45, regularityScore: 1.2, periodicityIndex: 0.05 },
    ned: {
      breathCount: 500, nedMean: 25, nedMedian: 22, nedP95: 55,
      nedClearFLPct: 30, nedBorderlinePct: 20, fiMean: 0.6,
      fiFL85Pct: 15, tpeakMean: 0.35, mShapePct: 8,
      reraIndex: 5, reraCount: 35, h1NedMean: 28, h2NedMean: 22,
      combinedFLPct: 50, estimatedArousalIndex: 12,
    },
    oximetry: null,
  } as unknown as NightResult;
}

describe('DataContribution', () => {
  beforeEach(() => {
    storage.clear();
    sessionStore.clear();
    vi.clearAllMocks();
    // Stats endpoint — always return 0 to avoid social proof noise in tests
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ totalContributions: 0, totalContributedNights: 0 }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Test 1: Opted-in user with new data sees auto-confirmation, not manual button
  it('renders auto-confirmation when opted in and autoSubmitStatus is "success"', async () => {
    storage.set('airwaylab_contribute_optin', '1');
    storage.set('airwaylab_contributed_dates', JSON.stringify(['2025-01-01']));

    const nights = [makeNight('2025-01-01'), makeNight('2025-01-02')];

    render(
      <DataContribution
        nights={nights}
        autoSubmitStatus="success"
        autoSubmitCount={1}
      />
    );

    await waitFor(() => {
      // Should show auto-contribution success message
      expect(screen.getByText(/1 new night contributed automatically/)).toBeInTheDocument();
    });
    // Should NOT show the manual contribute button
    expect(screen.queryByRole('button', { name: /contribute.*anonymously/i })).not.toBeInTheDocument();
  });

  // Test 2: First-time / opted-out users see the manual button
  it('renders manual button when consent is absent', async () => {
    const nights = [makeNight('2025-01-01')];

    render(<DataContribution nights={nights} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /contribute.*anonymously/i })).toBeInTheDocument();
    });
  });

  it('renders manual button when consent is "0"', async () => {
    storage.set('airwaylab_contribute_optin', '0');
    storage.set('airwaylab_contributed_dates', JSON.stringify(['2025-01-01']));

    const nights = [makeNight('2025-01-01'), makeNight('2025-01-02')];

    render(<DataContribution nights={nights} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /contribute.*anonymously/i })).toBeInTheDocument();
    });
  });

  // Test 3: Nothing renders when opted in, no new data
  it('renders nothing when opted in, no new data, and has contributed before', async () => {
    storage.set('airwaylab_contribute_optin', '1');
    storage.set('airwaylab_contributed_dates', JSON.stringify(['2025-01-01']));

    const nights = [makeNight('2025-01-01')];

    const { container } = render(
      <DataContribution nights={nights} autoSubmitStatus="idle" />
    );

    await waitFor(() => {
      expect(container.innerHTML).toBe('');
    });
  });

  // Test 6: Auto-submit error falls back to manual button for opted-in users
  it('falls back to manual button when auto-submit fails for opted-in users', async () => {
    storage.set('airwaylab_contribute_optin', '1');
    storage.set('airwaylab_contributed_dates', JSON.stringify(['2025-01-01']));

    const nights = [makeNight('2025-01-01'), makeNight('2025-01-02')];

    render(
      <DataContribution
        nights={nights}
        autoSubmitStatus="error"
        autoSubmitCount={1}
      />
    );

    await waitFor(() => {
      // Should show error state with retry
      expect(screen.getByText(/auto-contribution failed/i)).toBeInTheDocument();
    });
  });

  // Test 7: Demo mode unchanged
  it('renders demo teaser regardless of consent state', async () => {
    storage.set('airwaylab_contribute_optin', '1');
    const nights = [makeNight('2025-01-01')];

    render(<DataContribution nights={nights} isDemo />);

    await waitFor(() => {
      expect(screen.getByText(/help build the largest pap therapy dataset/i)).toBeInTheDocument();
    });
  });

  // Test 8: Shows "Contributing..." while in flight
  it('shows in-flight message when autoSubmitStatus is "sending"', async () => {
    storage.set('airwaylab_contribute_optin', '1');
    storage.set('airwaylab_contributed_dates', JSON.stringify(['2025-01-01']));

    const nights = [makeNight('2025-01-01'), makeNight('2025-01-02')];

    render(
      <DataContribution
        nights={nights}
        autoSubmitStatus="sending"
        autoSubmitCount={1}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/contributing new data/i)).toBeInTheDocument();
    });
  });

  // Test: Manual retry success overrides stale error prop
  it('shows success when manual retry succeeds despite autoSubmitStatus="error"', async () => {
    storage.set('airwaylab_contribute_optin', '1');
    storage.set('airwaylab_contributed_dates', JSON.stringify(['2025-01-01']));

    const nights = [makeNight('2025-01-01'), makeNight('2025-01-02')];

    // Render with error state, then click retry
    render(
      <DataContribution
        nights={nights}
        autoSubmitStatus="error"
        autoSubmitCount={1}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/auto-contribution failed/i)).toBeInTheDocument();
    });

    // Simulate clicking retry (which calls handleContribute -> sets status to 'sending' then 'success')
    const retryBtn = screen.getByRole('button', { name: /tap to retry/i });
    retryBtn.click();

    // After retry, contributeNights resolves -> status becomes 'success'
    // The parent prop autoSubmitStatus is still 'error' but internal status overrides it
    await waitFor(() => {
      expect(screen.getByText(/data contributed successfully/i)).toBeInTheDocument();
    });

    // Error message should be gone
    expect(screen.queryByText(/auto-contribution failed/i)).not.toBeInTheDocument();
  });

  // Test: Manual retry loading overrides stale error prop
  it('shows loading state when retry is in progress despite autoSubmitStatus="error"', async () => {
    storage.set('airwaylab_contribute_optin', '1');
    storage.set('airwaylab_contributed_dates', JSON.stringify(['2025-01-01']));

    // Make contributeNights hang (never resolve) to keep status at 'sending'
    const { contributeNights } = await import('@/lib/contribute');
    (contributeNights as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => { /* never resolves */ })
    );

    const nights = [makeNight('2025-01-01'), makeNight('2025-01-02')];

    render(
      <DataContribution
        nights={nights}
        autoSubmitStatus="error"
        autoSubmitCount={1}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/auto-contribution failed/i)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: /tap to retry/i });
    retryBtn.click();

    // Should show retry-in-progress, not error
    await waitFor(() => {
      expect(screen.getByText(/retrying contribution/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/auto-contribution failed/i)).not.toBeInTheDocument();
  });

  // Test: N nights pluralization
  it('pluralizes correctly for multiple new nights', async () => {
    storage.set('airwaylab_contribute_optin', '1');
    storage.set('airwaylab_contributed_dates', JSON.stringify(['2025-01-01']));

    const nights = [
      makeNight('2025-01-01'),
      makeNight('2025-01-02'),
      makeNight('2025-01-03'),
    ];

    render(
      <DataContribution
        nights={nights}
        autoSubmitStatus="success"
        autoSubmitCount={2}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/2 new nights contributed automatically/)).toBeInTheDocument();
    });
  });
});
