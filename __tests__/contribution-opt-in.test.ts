import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
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

const OPTED_IN_KEY = 'airwaylab_contribute_optin';
const LEGACY_KEY = 'airwaylab-contribute-optin';

import {
  getConsentState,
  migrateConsentKey,
  setConsentState,
} from '@/components/upload/contribution-consent-utils';

describe('contribution consent utils', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('returns opted-in when localStorage has contribute_optin = "1"', () => {
    storage.set(OPTED_IN_KEY, '1');
    expect(getConsentState()).toBe(true);
  });

  it('returns not opted-in when localStorage has contribute_optin = "0"', () => {
    storage.set(OPTED_IN_KEY, '0');
    expect(getConsentState()).toBe(false);
  });

  it('returns not opted-in when localStorage has no key', () => {
    expect(getConsentState()).toBe(false);
  });

  it('setConsentState stores "1" for true and "0" for false', () => {
    setConsentState(true);
    expect(storage.get(OPTED_IN_KEY)).toBe('1');
    setConsentState(false);
    expect(storage.get(OPTED_IN_KEY)).toBe('0');
  });

  it('migrates legacy key and shows compact state', () => {
    storage.set(LEGACY_KEY, '1');
    migrateConsentKey();
    expect(storage.get(OPTED_IN_KEY)).toBe('1');
    expect(storage.has(LEGACY_KEY)).toBe(false);
    expect(getConsentState()).toBe(true);
  });

  it('migrates legacy key with "0" value correctly', () => {
    storage.set(LEGACY_KEY, '0');
    migrateConsentKey();
    expect(storage.get(OPTED_IN_KEY)).toBe('0');
    expect(storage.has(LEGACY_KEY)).toBe(false);
    expect(getConsentState()).toBe(false);
  });

  it('handles localStorage errors gracefully', () => {
    // Override getItem to throw
    const originalGetItem = localStorageMock.getItem;
    localStorageMock.getItem = vi.fn(() => { throw new Error('SecurityError'); });

    expect(getConsentState()).toBe(false);

    localStorageMock.getItem = originalGetItem;
  });

  it('handles localStorage setItem errors gracefully', () => {
    const originalSetItem = localStorageMock.setItem;
    localStorageMock.setItem = vi.fn(() => { throw new Error('QuotaExceededError'); });

    // Should not throw
    expect(() => setConsentState(true)).not.toThrow();

    localStorageMock.setItem = originalSetItem;
  });
});
