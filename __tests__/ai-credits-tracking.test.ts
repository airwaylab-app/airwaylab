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

import { getAIRemaining, getAIUsageThisMonth, incrementAIUsage } from '@/lib/auth/feature-gate';

function getUsageKey(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `airwaylab_ai_usage_${yyyy}_${mm}`;
}

describe('AI Credits Tracking — Server sync and fallback', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  // ── C1: Community tier sees real remaining credits ──────────

  it('reports 3 remaining when localStorage has 0 usage', () => {
    // Simulates server returning 0 usage → getAIRemaining should show 3
    expect(getAIRemaining('community')).toBe(3);
  });

  it('reports 1 remaining when localStorage has 2 usage', () => {
    const key = getUsageKey();
    storage.set(key, '2');
    expect(getAIRemaining('community')).toBe(1);
  });

  it('reports 0 remaining when localStorage has 3 usage', () => {
    const key = getUsageKey();
    storage.set(key, '3');
    expect(getAIRemaining('community')).toBe(0);
  });

  // ── C2: Decrement after successful fetch ───────────────────

  it('decrements from 3 to 2 after incrementAIUsage', () => {
    expect(getAIRemaining('community')).toBe(3);
    incrementAIUsage();
    expect(getAIRemaining('community')).toBe(2);
  });

  // ── C7: Paid tiers get unlimited ──────────────────────────

  it('returns Infinity for supporter tier', () => {
    expect(getAIRemaining('supporter')).toBe(Infinity);
  });

  it('returns Infinity for champion tier', () => {
    expect(getAIRemaining('champion')).toBe(Infinity);
  });

  // ── C8: localStorage fallback when server unavailable ─────

  it('uses localStorage count as fallback (1 usage = 2 remaining)', () => {
    const key = getUsageKey();
    storage.set(key, '1');
    // When server remainingCredits is undefined, component falls back to getAIRemaining
    expect(getAIRemaining('community')).toBe(2);
  });

  it('handles cleared localStorage gracefully (returns 3)', () => {
    // Simulate cleared localStorage — no usage key present
    expect(getAIUsageThisMonth()).toBe(0);
    expect(getAIRemaining('community')).toBe(3);
  });
});

describe('AI Credits Tracking — API response parsing', () => {
  it('fetchAIInsights returns remainingCredits from response', async () => {
    // Mock fetch to return a response with remainingCredits
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        insights: [{ id: 'ai-test', type: 'info', title: 'Test', body: 'Test body', category: 'glasgow' }],
        remainingCredits: 2,
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { fetchAIInsights } = await import('@/lib/ai-insights-client');

    // Create minimal NightResult-like data
    const nights = [{
      dateStr: '2026-03-10',
      durationHours: 7,
      sessionCount: 1,
      settings: { papMode: 'APAP', epap: 10, ipap: 15, pressureSupport: 0 },
      glasgow: { overall: 3.0 },
      wat: { flScore: 30 },
      ned: { nedMean: 20 },
      oximetry: null,
      oximetryTrace: null,
      settingsMetrics: null,
      crossDevice: null, machineSummary: null, settingsFingerprint: null,
    }] as never[];

    const result = await fetchAIInsights(nights, 0, null);

    expect(result).not.toBeNull();
    expect(result!.remainingCredits).toBe(2);
    expect(result!.insights).toHaveLength(1);

    vi.unstubAllGlobals();
  });

  it('returns undefined remainingCredits when server does not include it', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        insights: [{ id: 'ai-test', type: 'info', title: 'Test', body: 'Test body', category: 'glasgow' }],
        // No remainingCredits field
      }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { fetchAIInsights } = await import('@/lib/ai-insights-client');

    const nights = [{
      dateStr: '2026-03-10',
      durationHours: 7,
      sessionCount: 1,
      settings: {},
      glasgow: { overall: 3.0 },
      wat: { flScore: 30 },
      ned: { nedMean: 20 },
      oximetry: null,
      oximetryTrace: null,
      settingsMetrics: null,
      crossDevice: null, machineSummary: null, settingsFingerprint: null,
    }] as never[];

    const result = await fetchAIInsights(nights, 0, null);

    expect(result).not.toBeNull();
    expect(result!.remainingCredits).toBeUndefined();

    vi.unstubAllGlobals();
  });

  it('throws with error message when fetch fails (server unavailable)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: 'AI service error' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const { fetchAIInsights } = await import('@/lib/ai-insights-client');

    const nights = [{
      dateStr: '2026-03-10',
      durationHours: 7,
      sessionCount: 1,
      settings: {},
      glasgow: { overall: 3.0 },
      wat: { flScore: 30 },
      ned: { nedMean: 20 },
      oximetry: null,
      oximetryTrace: null,
      settingsMetrics: null,
      crossDevice: null, machineSummary: null, settingsFingerprint: null,
    }] as never[];

    await expect(fetchAIInsights(nights, 0, null)).rejects.toThrow('AI service error');

    vi.unstubAllGlobals();
  });
});
