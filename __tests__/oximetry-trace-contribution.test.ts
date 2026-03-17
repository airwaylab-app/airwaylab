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

import {
  getContributedOximetryDates,
  trackContributedOximetryDate,
  clearContributedOximetryDates,
  getContributedOximetryEngine,
  setContributedOximetryEngine,
} from '@/components/upload/contribution-consent-utils';

describe('oximetry trace contribution tracking', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('returns empty set when no dates contributed', () => {
    expect(getContributedOximetryDates().size).toBe(0);
  });

  it('tracks contributed dates', () => {
    trackContributedOximetryDate('2026-03-15');
    trackContributedOximetryDate('2026-03-16');
    const dates = getContributedOximetryDates();
    expect(dates.has('2026-03-15')).toBe(true);
    expect(dates.has('2026-03-16')).toBe(true);
    expect(dates.size).toBe(2);
  });

  it('deduplicates dates', () => {
    trackContributedOximetryDate('2026-03-15');
    trackContributedOximetryDate('2026-03-15');
    expect(getContributedOximetryDates().size).toBe(1);
  });

  it('clears all dates and engine version', () => {
    trackContributedOximetryDate('2026-03-15');
    setContributedOximetryEngine('0.7.0');
    clearContributedOximetryDates();
    expect(getContributedOximetryDates().size).toBe(0);
    expect(getContributedOximetryEngine()).toBeNull();
  });

  it('stores and retrieves engine version', () => {
    setContributedOximetryEngine('0.7.0');
    expect(getContributedOximetryEngine()).toBe('0.7.0');
  });

  it('returns null engine when not set', () => {
    expect(getContributedOximetryEngine()).toBeNull();
  });

  it('handles corrupted localStorage gracefully', () => {
    storage.set('airwaylab_contributed_oxtrace_dates', 'not-json');
    expect(getContributedOximetryDates().size).toBe(0);
  });

  it('uses correct localStorage keys with airwaylab_ prefix', () => {
    trackContributedOximetryDate('2026-03-15');
    setContributedOximetryEngine('0.7.0');
    expect(storage.has('airwaylab_contributed_oxtrace_dates')).toBe(true);
    expect(storage.has('airwaylab_contributed_oxtrace_engine')).toBe(true);
  });
});
