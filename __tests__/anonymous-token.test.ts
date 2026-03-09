import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAnonymousToken } from '@/lib/anonymous-token';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('getAnonymousToken', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('generates a 64-character hex token', () => {
    const token = getAnonymousToken();
    expect(token).not.toBeNull();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns the same token on subsequent calls', () => {
    const token1 = getAnonymousToken();
    const token2 = getAnonymousToken();
    expect(token1).toBe(token2);
  });

  it('stores the token in localStorage', () => {
    getAnonymousToken();
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'airwaylab-anonymous-token',
      expect.stringMatching(/^[a-f0-9]{64}$/)
    );
  });

  it('reuses existing valid token from localStorage', () => {
    const existingToken = 'a'.repeat(64);
    localStorageMock.setItem('airwaylab-anonymous-token', existingToken);
    localStorageMock.getItem.mockReturnValueOnce(existingToken);

    const token = getAnonymousToken();
    expect(token).toBe(existingToken);
  });

  it('regenerates token if existing one is invalid format', () => {
    localStorageMock.getItem.mockReturnValueOnce('not-a-valid-token');

    const token = getAnonymousToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(token).not.toBe('not-a-valid-token');
  });

  it('regenerates token if existing one is wrong length', () => {
    localStorageMock.getItem.mockReturnValueOnce('aabb');

    const token = getAnonymousToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns null if localStorage throws', () => {
    localStorageMock.getItem.mockImplementationOnce(() => { throw new Error('access denied'); });

    const token = getAnonymousToken();
    expect(token).toBeNull();
  });
});
