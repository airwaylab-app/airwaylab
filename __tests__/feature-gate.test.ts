import { describe, it, expect, beforeEach, vi } from 'vitest';
import { canAccess, getAIRemaining, getAIUsageThisMonth, incrementAIUsage } from '@/lib/auth/feature-gate';

// Mock localStorage
const store: Record<string, string> = {};
beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val; },
    removeItem: (key: string) => { delete store[key]; },
  });
});

describe('canAccess', () => {
  it('grants ai_insights to community with 0 usage', () => {
    expect(canAccess('ai_insights', 'community', 0)).toBe(true);
  });

  it('grants ai_insights to community with 2 usage', () => {
    expect(canAccess('ai_insights', 'community', 2)).toBe(true);
  });

  it('denies ai_insights to community at 3 usage (limit)', () => {
    expect(canAccess('ai_insights', 'community', 3)).toBe(false);
  });

  it('denies ai_insights to community at 10 usage', () => {
    expect(canAccess('ai_insights', 'community', 10)).toBe(false);
  });

  it('grants ai_insights to supporter regardless of usage', () => {
    expect(canAccess('ai_insights', 'supporter', 100)).toBe(true);
  });

  it('grants ai_insights to champion regardless of usage', () => {
    expect(canAccess('ai_insights', 'champion', 999)).toBe(true);
  });

  it('denies cloud_sync to community', () => {
    expect(canAccess('cloud_sync', 'community')).toBe(false);
  });

  it('grants cloud_sync to supporter', () => {
    expect(canAccess('cloud_sync', 'supporter')).toBe(true);
  });

  it('grants cloud_sync to champion', () => {
    expect(canAccess('cloud_sync', 'champion')).toBe(true);
  });

  it('denies early_access to supporter', () => {
    expect(canAccess('early_access', 'supporter')).toBe(false);
  });

  it('grants early_access to champion', () => {
    expect(canAccess('early_access', 'champion')).toBe(true);
  });

  it('grants supporter_badge to supporter and champion', () => {
    expect(canAccess('supporter_badge', 'supporter')).toBe(true);
    expect(canAccess('supporter_badge', 'champion')).toBe(true);
  });

  it('denies supporter_badge to community', () => {
    expect(canAccess('supporter_badge', 'community')).toBe(false);
  });

  it('denies pdf_report to community', () => {
    expect(canAccess('pdf_report', 'community')).toBe(false);
  });

  it('grants pdf_report to supporter', () => {
    expect(canAccess('pdf_report', 'supporter')).toBe(true);
  });
});

describe('getAIRemaining', () => {
  it('returns Infinity for supporter', () => {
    expect(getAIRemaining('supporter')).toBe(Infinity);
  });

  it('returns Infinity for champion', () => {
    expect(getAIRemaining('champion')).toBe(Infinity);
  });

  it('returns 3 for community with no usage', () => {
    expect(getAIRemaining('community')).toBe(3);
  });

  it('returns correct remaining after usage', () => {
    incrementAIUsage();
    incrementAIUsage();
    expect(getAIRemaining('community')).toBe(1);
  });

  it('returns 0 when limit reached', () => {
    incrementAIUsage();
    incrementAIUsage();
    incrementAIUsage();
    expect(getAIRemaining('community')).toBe(0);
  });

  it('never goes negative', () => {
    for (let i = 0; i < 10; i++) incrementAIUsage();
    expect(getAIRemaining('community')).toBe(0);
  });
});

describe('getAIUsageThisMonth / incrementAIUsage', () => {
  it('starts at 0', () => {
    expect(getAIUsageThisMonth()).toBe(0);
  });

  it('increments correctly', () => {
    incrementAIUsage();
    expect(getAIUsageThisMonth()).toBe(1);
    incrementAIUsage();
    expect(getAIUsageThisMonth()).toBe(2);
  });

  it('uses month-based key', () => {
    incrementAIUsage();
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const key = `airwaylab_ai_usage_${yyyy}_${mm}`;
    expect(store[key]).toBe('1');
  });
});
