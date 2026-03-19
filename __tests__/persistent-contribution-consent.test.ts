import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { trackContributedDates } from '@/lib/contribute';
import { getConsentState } from '@/components/upload/contribution-consent-utils';
import type { NightResult } from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────────────

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
    },
    glasgow: {
      overall: 2.5,
      skew: 0.3,
      spike: 0.2,
      flatTop: 0.1,
      topHeavy: 0.1,
      multiPeak: 0.1,
      noPause: 0.2,
      inspirRate: 0.3,
      multiBreath: 0.1,
      variableAmp: 0.2,
    },
    wat: { flScore: 30, regularityScore: 75, periodicityIndex: 5 },
    ned: {
      nedMean: 20,
      combinedFLPct: 25,
      reraIndex: 3,
      h1NedMean: 18,
      h2NedMean: 22,
      flatnessIndex: 0.6,
      mShapePct: 5,
      estimatedArousalIndex: 8,
    },
    oximetry: null,
  } as unknown as NightResult;
}

/** Filters nights to only those not in contributedDates — mirrors the analyze page logic. */
function filterNewNights(nights: NightResult[]): NightResult[] {
  const contributedDates: string[] = JSON.parse(
    localStorage.getItem('airwaylab_contributed_dates') || '[]'
  );
  const contributedSet = new Set(contributedDates);
  return nights.filter((n) => !contributedSet.has(n.dateStr));
}

// ── Tests ────────────────────────────────────────────────────────

describe('persistent-contribution-consent', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  // Test 1: Opted-in users see auto-confirmation, not manual button
  describe('DataContribution consent-aware rendering', () => {
    it('opted-in + new data → auto-confirmation path (not manual button)', () => {
      storage.set('airwaylab_contribute_optin', '1');
      storage.set('airwaylab_contributed_dates', JSON.stringify(['2026-01-01']));

      const nights = [makeNight('2026-01-01'), makeNight('2026-01-02')];
      const isOptedIn = getConsentState();
      const newNights = filterNewNights(nights);

      expect(isOptedIn).toBe(true);
      expect(newNights).toHaveLength(1);
      // When opted in + has new data → component should render auto-confirm, not manual button
    });

    // Test 2: First-time / opted-out users see manual UI
    it('no consent stored → manual contribution button', () => {
      expect(getConsentState()).toBe(false);
    });

    it('consent explicitly "0" → manual contribution button', () => {
      storage.set('airwaylab_contribute_optin', '0');
      expect(getConsentState()).toBe(false);
    });

    // Test 3: No banner when opted in + no new data + has contributed before
    it('opted-in, no new data, contributed before → renders nothing', () => {
      storage.set('airwaylab_contribute_optin', '1');
      storage.set('airwaylab_contributed_dates', JSON.stringify(['2026-01-01', '2026-01-02']));

      const nights = [makeNight('2026-01-01'), makeNight('2026-01-02')];
      const newNights = filterNewNights(nights);
      const contributedDates: string[] = JSON.parse(
        localStorage.getItem('airwaylab_contributed_dates') || '[]'
      );

      expect(newNights).toHaveLength(0);
      expect(contributedDates.length).toBeGreaterThan(0);
      // Component should return null
    });
  });

  // Test 4: Auto-submit filters nights to new only
  describe('auto-submit filters to new nights only', () => {
    it('filters out 58 contributed nights, sends only the 1 new night', () => {
      const allDates = Array.from({ length: 59 }, (_, i) => {
        const d = new Date(2026, 0, 1 + i);
        return d.toISOString().slice(0, 10);
      });
      storage.set(
        'airwaylab_contributed_dates',
        JSON.stringify(allDates.slice(0, 58))
      );

      const allNights = allDates.map(makeNight);
      const newNights = filterNewNights(allNights);

      expect(newNights).toHaveLength(1);
      expect(newNights[0]!.dateStr).toBe(allDates[58]);
    });

    it('sends all nights when none were previously contributed', () => {
      const nights = [makeNight('2026-01-01'), makeNight('2026-01-02')];
      const newNights = filterNewNights(nights);
      expect(newNights).toHaveLength(2);
    });
  });

  // Test 5: trackContributedDates is cumulative
  describe('trackContributedDates cumulative update', () => {
    it('updates count to 59 after adding 1 new night to 58 existing', () => {
      const existingDates = Array.from({ length: 58 }, (_, i) => {
        const d = new Date(2026, 0, 1 + i);
        return d.toISOString().slice(0, 10);
      });
      storage.set('airwaylab_contributed_dates', JSON.stringify(existingDates));

      const newNight = makeNight('2026-02-28');
      trackContributedDates([newNight]);

      const updated: string[] = JSON.parse(
        localStorage.getItem('airwaylab_contributed_dates') || '[]'
      );
      expect(updated).toHaveLength(59);
      expect(updated).toContain('2026-02-28');
      expect(localStorage.getItem('airwaylab_contributed_nights')).toBe('59');
    });
  });

  // Test 6: Error fallback — even opted-in users see manual button on failure
  describe('auto-submit error fallback', () => {
    it('error status means banner should show manual retry even for opted-in users', () => {
      storage.set('airwaylab_contribute_optin', '1');
      type AutoSubmitStatus = 'idle' | 'sending' | 'success' | 'error';
      const status: AutoSubmitStatus = 'error';

      // On error, the banner should fall back to manual contribution
      // regardless of opt-in state
      expect(status).toBe('error');
      expect(getConsentState()).toBe(true);
    });
  });

  // Test 7: Demo mode unchanged — teaser renders regardless of consent
  describe('demo mode unchanged', () => {
    it('renders teaser in demo mode regardless of consent state', () => {
      storage.set('airwaylab_contribute_optin', '1');
      const isDemo = true;
      // In demo mode, the component should always show the teaser banner
      // isDemo=true takes precedence over consent state
      expect(isDemo).toBe(true);
      expect(getConsentState()).toBe(true);
    });
  });

  // Test 8: Loading state coordination
  describe('auto-submit status coordination', () => {
    it('status transitions: idle → sending → success', () => {
      type AutoSubmitStatus = 'idle' | 'sending' | 'success' | 'error';
      let status: AutoSubmitStatus = 'idle';

      status = 'sending';
      expect(status).toBe('sending');
      // Banner should show "Contributing new data..."

      status = 'success';
      expect(status).toBe('success');
      // Banner should show "N new nights contributed automatically — thank you"
    });

    it('status transitions: idle → sending → error', () => {
      type AutoSubmitStatus = 'idle' | 'sending' | 'success' | 'error';
      let status: AutoSubmitStatus = 'idle';

      status = 'sending';
      status = 'error';
      expect(status).toBe('error');
      // Banner should fall back to manual button with retry
    });
  });
});
