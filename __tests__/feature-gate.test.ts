import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock localStorage ──────────────────────────────────────────
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

import { canAccess, getAIRemaining, getAIUsageThisMonth, incrementAIUsage } from '@/lib/auth/feature-gate';

function getUsageKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `airwaylab_ai_usage_${yyyy}_${mm}`;
}

describe('canAccess — feature access matrix', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  // ── Features available to all tiers ──────────────────────────

  it('grants ai_insights to community tier (with usage remaining)', () => {
    expect(canAccess('ai_insights', 'community', 0)).toBe(true);
  });

  it('grants ai_insights to supporter tier', () => {
    expect(canAccess('ai_insights', 'supporter')).toBe(true);
  });

  it('grants ai_insights to champion tier', () => {
    expect(canAccess('ai_insights', 'champion')).toBe(true);
  });

  it('grants cloud_sync to all tiers', () => {
    expect(canAccess('cloud_sync', 'community')).toBe(true);
    expect(canAccess('cloud_sync', 'supporter')).toBe(true);
    expect(canAccess('cloud_sync', 'champion')).toBe(true);
  });

  it('grants raw_storage to all tiers', () => {
    expect(canAccess('raw_storage', 'community')).toBe(true);
    expect(canAccess('raw_storage', 'supporter')).toBe(true);
    expect(canAccess('raw_storage', 'champion')).toBe(true);
  });

  // ── Supporter+ features ──────────────────────────────────────

  it('denies deep_ai_insights to community tier', () => {
    expect(canAccess('deep_ai_insights', 'community')).toBe(false);
  });

  it('grants deep_ai_insights to supporter and champion', () => {
    expect(canAccess('deep_ai_insights', 'supporter')).toBe(true);
    expect(canAccess('deep_ai_insights', 'champion')).toBe(true);
  });

  it('denies trends_full to community tier', () => {
    expect(canAccess('trends_full', 'community')).toBe(false);
  });

  it('denies pdf_report to community tier', () => {
    expect(canAccess('pdf_report', 'community')).toBe(false);
  });

  it('denies enhanced_export to community tier', () => {
    expect(canAccess('enhanced_export', 'community')).toBe(false);
  });

  it('grants supporter-tier features to supporter', () => {
    expect(canAccess('trends_full', 'supporter')).toBe(true);
    expect(canAccess('pdf_report', 'supporter')).toBe(true);
    expect(canAccess('enhanced_export', 'supporter')).toBe(true);
    expect(canAccess('supporter_badge', 'supporter')).toBe(true);
  });

  // ── Champion-only features ───────────────────────────────────

  it('denies early_access to community and supporter', () => {
    expect(canAccess('early_access', 'community')).toBe(false);
    expect(canAccess('early_access', 'supporter')).toBe(false);
  });

  it('grants early_access to champion only', () => {
    expect(canAccess('early_access', 'champion')).toBe(true);
  });
});

describe('canAccess — community AI usage limits', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('allows AI at usage 0 (3 remaining)', () => {
    expect(canAccess('ai_insights', 'community', 0)).toBe(true);
  });

  it('allows AI at usage 2 (1 remaining)', () => {
    expect(canAccess('ai_insights', 'community', 2)).toBe(true);
  });

  it('blocks AI at usage 3 (limit reached)', () => {
    expect(canAccess('ai_insights', 'community', 3)).toBe(false);
  });

  it('blocks AI at usage 5 (over limit)', () => {
    expect(canAccess('ai_insights', 'community', 5)).toBe(false);
  });

  it('reads from localStorage when aiUsageThisMonth not provided', () => {
    const key = getUsageKey();
    storage.set(key, '3');
    expect(canAccess('ai_insights', 'community')).toBe(false);
  });

  it('paid tiers ignore the monthly limit entirely', () => {
    const key = getUsageKey();
    storage.set(key, '100');
    expect(canAccess('ai_insights', 'supporter')).toBe(true);
    expect(canAccess('ai_insights', 'champion')).toBe(true);
  });
});

describe('AI usage tracking helpers', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('getAIUsageThisMonth returns 0 when no usage recorded', () => {
    expect(getAIUsageThisMonth()).toBe(0);
  });

  it('incrementAIUsage increments the counter', () => {
    expect(getAIUsageThisMonth()).toBe(0);
    incrementAIUsage();
    expect(getAIUsageThisMonth()).toBe(1);
    incrementAIUsage();
    expect(getAIUsageThisMonth()).toBe(2);
  });

  it('getAIRemaining returns Infinity for paid tiers', () => {
    expect(getAIRemaining('supporter')).toBe(Infinity);
    expect(getAIRemaining('champion')).toBe(Infinity);
  });

  it('getAIRemaining reflects current usage for community', () => {
    expect(getAIRemaining('community')).toBe(3);
    incrementAIUsage();
    expect(getAIRemaining('community')).toBe(2);
    incrementAIUsage();
    incrementAIUsage();
    expect(getAIRemaining('community')).toBe(0);
  });

  it('getAIRemaining never goes below 0', () => {
    const key = getUsageKey();
    storage.set(key, '10');
    expect(getAIRemaining('community')).toBe(0);
  });

  it('usage key is month-scoped (different months are isolated)', () => {
    incrementAIUsage();
    expect(getAIUsageThisMonth()).toBe(1);

    const key = getUsageKey();
    const differentMonthKey = key.replace(/_\d{2}$/, '_99');
    storage.set(differentMonthKey, '5');

    // Current month still shows 1
    expect(getAIUsageThisMonth()).toBe(1);
  });
});
