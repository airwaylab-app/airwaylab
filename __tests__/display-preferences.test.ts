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
  loadDisplayPreferences,
  saveDateFormat,
  saveTimeFormat,
  saveNumberFormat,
  clearDisplayPreferences,
  DEFAULTS,
} from '@/lib/display-preferences';

describe('display-preferences', () => {
  beforeEach(() => {
    storage.clear();
  });

  it('returns defaults when localStorage is empty', () => {
    const prefs = loadDisplayPreferences();
    expect(prefs).toEqual(DEFAULTS);
  });

  it('persists and loads date format', () => {
    saveDateFormat('MM/DD/YYYY');
    const prefs = loadDisplayPreferences();
    expect(prefs.dateFormat).toBe('MM/DD/YYYY');
    expect(prefs.timeFormat).toBe(DEFAULTS.timeFormat);
    expect(prefs.numberFormat).toBe(DEFAULTS.numberFormat);
  });

  it('persists and loads time format', () => {
    saveTimeFormat('12h');
    const prefs = loadDisplayPreferences();
    expect(prefs.timeFormat).toBe('12h');
  });

  it('persists and loads number format', () => {
    saveNumberFormat('dot');
    const prefs = loadDisplayPreferences();
    expect(prefs.numberFormat).toBe('dot');
  });

  it('returns defaults for invalid stored values', () => {
    storage.set('airwaylab_date_format', 'YYYY-MM-DD');
    storage.set('airwaylab_time_format', 'invalid');
    storage.set('airwaylab_number_format', 'weird');
    const prefs = loadDisplayPreferences();
    expect(prefs).toEqual(DEFAULTS);
  });

  it('falls back individually for partial invalid data', () => {
    saveDateFormat('MM/DD/YYYY');
    storage.set('airwaylab_time_format', 'garbage');
    const prefs = loadDisplayPreferences();
    expect(prefs.dateFormat).toBe('MM/DD/YYYY');
    expect(prefs.timeFormat).toBe(DEFAULTS.timeFormat);
  });

  it('clears all preferences', () => {
    saveDateFormat('MM/DD/YYYY');
    saveTimeFormat('12h');
    saveNumberFormat('dot');
    clearDisplayPreferences();
    const prefs = loadDisplayPreferences();
    expect(prefs).toEqual(DEFAULTS);
  });

  it('uses correct localStorage keys with airwaylab_ prefix', () => {
    saveDateFormat('MM/DD/YYYY');
    saveTimeFormat('12h');
    saveNumberFormat('dot');
    expect(storage.get('airwaylab_date_format')).toBe('MM/DD/YYYY');
    expect(storage.get('airwaylab_time_format')).toBe('12h');
    expect(storage.get('airwaylab_number_format')).toBe('dot');
  });
});
