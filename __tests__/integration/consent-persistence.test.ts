/**
 * Integration tests: Consent state persistence (AC-6)
 *
 * Verifies the consent utility functions correctly persist
 * and retrieve state from localStorage.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Provide a complete localStorage mock (Vitest 4 + Node 22 built-in
// localStorage doesn't have all standard methods in test environments)
const store = new Map<string, string>();

const localStorageMock = {
  getItem: vi.fn((key: string) => store.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => store.set(key, value)),
  removeItem: vi.fn((key: string) => store.delete(key)),
  clear: vi.fn(() => store.clear()),
  get length() { return store.size; },
  key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
};

vi.stubGlobal('localStorage', localStorageMock);

// Import after stubbing localStorage
import {
  getConsentState,
  setConsentState,
  hasExplicitConsent,
  migrateConsentKey,
  getContributedWaveformDates,
  trackContributedWaveformDate,
  clearContributedWaveformDates,
  getContributedWaveformEngine,
  setContributedWaveformEngine,
} from '@/components/upload/contribution-consent-utils';

beforeEach(() => {
  store.clear();
  vi.clearAllMocks();
});

// ── Test Case 15: setConsentState(true) → getConsentState() === true ──

describe('consent state round-trip', () => {
  it('persists opted-in state', () => {
    setConsentState(true);
    expect(getConsentState()).toBe(true);
  });

  // ── Test Case 16: setConsentState(false) → getConsentState() === false ──

  it('persists opted-out state', () => {
    setConsentState(false);
    expect(getConsentState()).toBe(false);
  });

  it('defaults to false when no state is set', () => {
    expect(getConsentState()).toBe(false);
  });

  it('tracks explicit consent correctly', () => {
    expect(hasExplicitConsent()).toBe(false);
    setConsentState(true);
    expect(hasExplicitConsent()).toBe(true);
    setConsentState(false);
    expect(hasExplicitConsent()).toBe(true); // still explicit, just opted out
  });

  it('can toggle state back and forth', () => {
    setConsentState(true);
    expect(getConsentState()).toBe(true);
    setConsentState(false);
    expect(getConsentState()).toBe(false);
    setConsentState(true);
    expect(getConsentState()).toBe(true);
  });
});

describe('consent key migration', () => {
  it('migrates legacy hyphenated key to underscore key', () => {
    store.set('airwaylab-contribute-optin', '1');
    expect(getConsentState()).toBe(false); // wrong key, not found

    migrateConsentKey();
    expect(getConsentState()).toBe(true); // now found under correct key
    expect(store.has('airwaylab-contribute-optin')).toBe(false); // old key removed
  });

  it('does nothing when no legacy key exists', () => {
    migrateConsentKey();
    expect(getConsentState()).toBe(false);
  });
});

describe('waveform contribution tracking', () => {
  it('tracks contributed dates', () => {
    expect(getContributedWaveformDates().size).toBe(0);

    trackContributedWaveformDate('2026-03-09');
    expect(getContributedWaveformDates().has('2026-03-09')).toBe(true);

    trackContributedWaveformDate('2026-03-10');
    expect(getContributedWaveformDates().size).toBe(2);
  });

  it('deduplicates dates', () => {
    trackContributedWaveformDate('2026-03-09');
    trackContributedWaveformDate('2026-03-09');
    expect(getContributedWaveformDates().size).toBe(1);
  });

  it('clears all contributed dates', () => {
    trackContributedWaveformDate('2026-03-09');
    setContributedWaveformEngine('v1.0');
    clearContributedWaveformDates();
    expect(getContributedWaveformDates().size).toBe(0);
    expect(getContributedWaveformEngine()).toBeNull();
  });

  it('tracks and retrieves engine version', () => {
    expect(getContributedWaveformEngine()).toBeNull();
    setContributedWaveformEngine('v1.0');
    expect(getContributedWaveformEngine()).toBe('v1.0');
  });
});
