import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getShareConsent,
  setShareConsent,
  clearShareConsent,
  hasRememberedShareChoice,
} from '@/lib/share-consent';

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

describe('share-consent', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  describe('getShareConsent', () => {
    it('returns null when no consent stored', () => {
      expect(getShareConsent()).toBeNull();
    });

    it('returns stored consent state', () => {
      const state = {
        dataShareConsent: true,
        shareScope: 'single' as const,
        rememberedChoice: false,
      };
      storage.set('airwaylab_share_consent', JSON.stringify(state));
      expect(getShareConsent()).toEqual(state);
    });

    it('returns null for corrupted data', () => {
      storage.set('airwaylab_share_consent', 'not-json');
      expect(getShareConsent()).toBeNull();
    });

    it('returns null for invalid shape', () => {
      storage.set(
        'airwaylab_share_consent',
        JSON.stringify({ dataShareConsent: 'yes' })
      );
      expect(getShareConsent()).toBeNull();
    });

    it('returns null for invalid shareScope', () => {
      storage.set(
        'airwaylab_share_consent',
        JSON.stringify({
          dataShareConsent: true,
          shareScope: 'invalid',
          rememberedChoice: false,
        })
      );
      expect(getShareConsent()).toBeNull();
    });
  });

  describe('setShareConsent', () => {
    it('persists consent to localStorage', () => {
      const state = {
        dataShareConsent: true,
        shareScope: 'all' as const,
        rememberedChoice: true,
      };
      setShareConsent(state);

      const raw = storage.get('airwaylab_share_consent');
      expect(raw).toBeDefined();
      expect(JSON.parse(raw!)).toEqual(state);
    });
  });

  describe('clearShareConsent', () => {
    it('removes consent from localStorage', () => {
      setShareConsent({
        dataShareConsent: true,
        shareScope: 'single',
        rememberedChoice: false,
      });
      clearShareConsent();
      expect(storage.get('airwaylab_share_consent')).toBeUndefined();
    });
  });

  describe('hasRememberedShareChoice', () => {
    it('returns false when no consent stored', () => {
      expect(hasRememberedShareChoice()).toBe(false);
    });

    it('returns false when consent exists but not remembered', () => {
      setShareConsent({
        dataShareConsent: true,
        shareScope: 'single',
        rememberedChoice: false,
      });
      expect(hasRememberedShareChoice()).toBe(false);
    });

    it('returns true when consent exists and is remembered', () => {
      setShareConsent({
        dataShareConsent: true,
        shareScope: 'all',
        rememberedChoice: true,
      });
      expect(hasRememberedShareChoice()).toBe(true);
    });

    it('returns false when dataShareConsent is false even if remembered', () => {
      setShareConsent({
        dataShareConsent: false,
        shareScope: 'single',
        rememberedChoice: true,
      });
      expect(hasRememberedShareChoice()).toBe(false);
    });
  });
});
