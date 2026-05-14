import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── localStorage mock ────────────────────────────────────────────
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

// ── Tier state for component tests ────────────────────────────────
let mockTier = 'community';

vi.mock('@/lib/auth/auth-context', () => ({
  useAuth: () => ({ tier: mockTier }),
}));

vi.mock('@/lib/analytics', () => ({
  events: {
    upgradeNudgeDismissed: vi.fn(),
    upgradeNudgeClicked: vi.fn(),
  },
}));

// ── Imports after mocks ───────────────────────────────────────────
import { getAnalysisWindowDays } from '@/lib/auth/feature-gate';
import { HistoryExpiryWarning } from '@/components/dashboard/history-expiry-warning';
import type { NightResult } from '@/lib/types';

// ── Helpers ───────────────────────────────────────────────────────

function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function makeNight(dateStr: string): NightResult {
  return {
    dateStr,
    ahi: 2,
    ahiBreakdown: { obstructive: 1, central: 0.5, hypopnea: 0.5 },
    leakStats: { median: 0, p95: 0 },
    pressureStats: { median: 8, p95: 10, min: 6, max: 12 },
    minutesAboveLeakThreshold: 0,
    totalMinutes: 480,
    therapyMode: 'CPAP',
    tidalVolume: null,
    minuteVentilation: null,
    respiratoryRate: null,
    ieRatio: null,
    flowLimitIndex: null,
    snoreIndex: null,
    oximetry: null,
    glasgow: null,
    engineVersion: 'test',
  } as unknown as NightResult;
}

// ── Tests: getAnalysisWindowDays ──────────────────────────────────

describe('getAnalysisWindowDays', () => {
  it('returns 30 for community tier', () => {
    expect(getAnalysisWindowDays('community')).toBe(30);
  });

  it('returns 90 for supporter tier', () => {
    expect(getAnalysisWindowDays('supporter')).toBe(90);
  });

  it('returns Infinity for champion tier', () => {
    expect(getAnalysisWindowDays('champion')).toBe(Infinity);
  });
});

// ── Tests: 30-night filter logic ──────────────────────────────────

describe('30-night community window filter logic', () => {
  it('keeps nights within 30 nights and drops older ones', () => {
    const raw = [
      makeNight(daysAgoStr(3)),
      makeNight(daysAgoStr(5)),
      makeNight(daysAgoStr(10)),
      makeNight(daysAgoStr(20)),
      makeNight(daysAgoStr(31)),   // outside 30-day window
      makeNight(daysAgoStr(45)),   // outside 30-day window
    ];

    const windowDays = getAnalysisWindowDays('community');
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const filtered = raw.filter((n) => n.dateStr >= cutoffStr);
    expect(filtered).toHaveLength(4);
    expect(filtered.map((n) => n.dateStr)).toEqual([
      daysAgoStr(3),
      daysAgoStr(5),
      daysAgoStr(10),
      daysAgoStr(20),
    ]);
  });
});

// ── Tests: HistoryExpiryWarning community variant ─────────────────

describe('HistoryExpiryWarning — community variant', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    mockTier = 'community';
  });

  it('renders community banner when tier=community and hiddenNightCount=3', () => {
    render(<HistoryExpiryWarning nights={[makeNight(daysAgoStr(3))]} hiddenNightCount={3} />);
    expect(screen.getByText(/viewing the last 30 nights/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /see full history/i })).toHaveAttribute('href', '/pricing');
  });

  it('does not render community banner when hiddenNightCount=0', () => {
    render(<HistoryExpiryWarning nights={[makeNight(daysAgoStr(3))]} hiddenNightCount={0} />);
    expect(screen.queryByText(/viewing the last 30 nights/i)).not.toBeInTheDocument();
  });

  it('does not render community banner when hiddenNightCount is omitted', () => {
    render(<HistoryExpiryWarning nights={[makeNight(daysAgoStr(3))]} />);
    expect(screen.queryByText(/viewing the last 30 nights/i)).not.toBeInTheDocument();
  });

  it('dismisses community banner and stores timestamp in localStorage', () => {
    render(<HistoryExpiryWarning nights={[makeNight(daysAgoStr(2))]} hiddenNightCount={2} />);
    fireEvent.click(screen.getByLabelText(/dismiss for now/i));
    expect(screen.queryByText(/viewing the last 30 nights/i)).not.toBeInTheDocument();
    expect(storage.get('airwaylab_community_window_dismissed')).toBeDefined();
  });
});

// ── Tests: HistoryExpiryWarning supporter variant (regression) ────

describe('HistoryExpiryWarning — supporter expiry warning (regression)', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    mockTier = 'supporter';
  });

  it('does not render supporter warning when no nights are near expiry', () => {
    // All nights are very recent — nowhere near the 90-day window
    const nights = [makeNight(daysAgoStr(1)), makeNight(daysAgoStr(2))];
    render(<HistoryExpiryWarning nights={nights} />);
    expect(screen.queryByText(/expire/i)).not.toBeInTheDocument();
  });

  it('renders supporter expiry warning when oldest night is within 15 days of 90-day limit', () => {
    // Night that is 77 days old (90 - 77 = 13 days left → within 15-day warning window)
    const nights = [makeNight(daysAgoStr(77))];
    render(<HistoryExpiryWarning nights={nights} />);
    expect(screen.getByText(/expire/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /keep your history/i })).toHaveAttribute('href', '/pricing');
  });
});
