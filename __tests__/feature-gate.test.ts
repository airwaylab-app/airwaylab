import { describe, it, expect, beforeEach, vi } from 'vitest';
import { canAccess, getAIRemaining, getAIUsageThisMonth, incrementAIUsage } from '@/lib/auth/feature-gate';

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

describe('canAccess', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  // Paid tier access
  it('supporter can access pdf_report', () => {
    expect(canAccess('pdf_report', 'supporter')).toBe(true);
  });

  it('champion can access pdf_report', () => {
    expect(canAccess('pdf_report', 'champion')).toBe(true);
  });

  it('community cannot access pdf_report', () => {
    expect(canAccess('pdf_report', 'community')).toBe(false);
  });

  it('community cannot access cloud_sync', () => {
    expect(canAccess('cloud_sync', 'community')).toBe(false);
  });

  it('supporter can access cloud_sync', () => {
    expect(canAccess('cloud_sync', 'supporter')).toBe(true);
  });

  // Champion-only features
  it('champion can access early_access', () => {
    expect(canAccess('early_access', 'champion')).toBe(true);
  });

  it('supporter cannot access early_access', () => {
    expect(canAccess('early_access', 'supporter')).toBe(false);
  });

  it('community cannot access early_access', () => {
    expect(canAccess('early_access', 'community')).toBe(false);
  });

  // AI insights with usage limits
  it('community can access ai_insights when under limit', () => {
    expect(canAccess('ai_insights', 'community', 0)).toBe(true);
    expect(canAccess('ai_insights', 'community', 2)).toBe(true);
  });

  it('community cannot access ai_insights when at limit', () => {
    expect(canAccess('ai_insights', 'community', 3)).toBe(false);
  });

  it('community cannot access ai_insights when over limit', () => {
    expect(canAccess('ai_insights', 'community', 10)).toBe(false);
  });

  it('supporter can always access ai_insights regardless of usage', () => {
    expect(canAccess('ai_insights', 'supporter', 100)).toBe(true);
  });

  it('champion can always access ai_insights regardless of usage', () => {
    expect(canAccess('ai_insights', 'champion', 100)).toBe(true);
  });

  // AI insights using localStorage usage tracking
  it('reads from localStorage when aiUsageThisMonth not provided', () => {
    expect(canAccess('ai_insights', 'community')).toBe(true);
  });
});

describe('getAIRemaining', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('returns 3 for community with no usage', () => {
    expect(getAIRemaining('community')).toBe(3);
  });

  it('returns 0 for community at limit', () => {
    // Simulate 3 uses
    for (let i = 0; i < 3; i++) incrementAIUsage();
    expect(getAIRemaining('community')).toBe(0);
  });

  it('returns Infinity for supporter', () => {
    expect(getAIRemaining('supporter')).toBe(Infinity);
  });

  it('returns Infinity for champion', () => {
    expect(getAIRemaining('champion')).toBe(Infinity);
  });
});

describe('AI usage tracking', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('starts at 0', () => {
    expect(getAIUsageThisMonth()).toBe(0);
  });

  it('increments correctly', () => {
    incrementAIUsage();
    expect(getAIUsageThisMonth()).toBe(1);
    incrementAIUsage();
    expect(getAIUsageThisMonth()).toBe(2);
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementationOnce(() => { throw new Error('quota exceeded'); });
    expect(getAIUsageThisMonth()).toBe(0);
  });

  it('incrementAIUsage handles localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('quota exceeded'); });
    // Should not throw
    expect(() => incrementAIUsage()).not.toThrow();
  });
});
