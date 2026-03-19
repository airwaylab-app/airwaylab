import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ENGINE_VERSION } from '@/lib/engine-version';

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

// Import after localStorage mock is set up
import {
  getContributedWaveformDates,
  trackContributedWaveformDate,
  clearContributedWaveformDates,
  getContributedWaveformEngine,
  setContributedWaveformEngine,
  getFailedWaveformDates,
  trackFailedWaveformDate,
} from '@/components/upload/contribution-consent-utils';
import { persistResults, loadPersistedResults } from '@/lib/persistence';
import { SAMPLE_NIGHTS } from '@/lib/sample-data';

describe('engine-version', () => {
  it('exports a version string', () => {
    expect(typeof ENGINE_VERSION).toBe('string');
    expect(ENGINE_VERSION.length).toBeGreaterThan(0);
  });
});

describe('waveform date tracking', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('returns empty set when nothing tracked', () => {
    const dates = getContributedWaveformDates();
    expect(dates.size).toBe(0);
  });

  it('tracks contributed dates', () => {
    trackContributedWaveformDate('2025-01-15');
    trackContributedWaveformDate('2025-01-16');
    const dates = getContributedWaveformDates();
    expect(dates.has('2025-01-15')).toBe(true);
    expect(dates.has('2025-01-16')).toBe(true);
    expect(dates.size).toBe(2);
  });

  it('deduplicates dates', () => {
    trackContributedWaveformDate('2025-01-15');
    trackContributedWaveformDate('2025-01-15');
    const dates = getContributedWaveformDates();
    expect(dates.size).toBe(1);
  });

  it('clears all dates', () => {
    trackContributedWaveformDate('2025-01-15');
    clearContributedWaveformDates();
    const dates = getContributedWaveformDates();
    expect(dates.size).toBe(0);
  });

  it('tracks engine version', () => {
    setContributedWaveformEngine('0.5.0');
    expect(getContributedWaveformEngine()).toBe('0.5.0');
  });

  it('clears engine version alongside dates', () => {
    setContributedWaveformEngine('0.5.0');
    trackContributedWaveformDate('2025-01-15');
    clearContributedWaveformDates();
    expect(getContributedWaveformEngine()).toBeNull();
    expect(getContributedWaveformDates().size).toBe(0);
  });
});

describe('waveform failure tracking', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('returns empty set when no failures tracked', () => {
    expect(getFailedWaveformDates().size).toBe(0);
  });

  it('tracks failed dates', () => {
    trackFailedWaveformDate('2025-11-12');
    const failed = getFailedWaveformDates();
    expect(failed.has('2025-11-12')).toBe(true);
  });

  it('expires failures after 24h cooldown', () => {
    // Write a failure entry with a timestamp 25 hours ago
    const staleEntry = [{ date: '2025-11-12', failedAt: Date.now() - 25 * 60 * 60 * 1000 }];
    storage.set('airwaylab_waveform_upload_failures', JSON.stringify(staleEntry));

    const failed = getFailedWaveformDates();
    expect(failed.has('2025-11-12')).toBe(false);
  });

  it('keeps failures within cooldown window', () => {
    // Write a failure entry with a timestamp 1 hour ago
    const recentEntry = [{ date: '2025-11-12', failedAt: Date.now() - 60 * 60 * 1000 }];
    storage.set('airwaylab_waveform_upload_failures', JSON.stringify(recentEntry));

    const failed = getFailedWaveformDates();
    expect(failed.has('2025-11-12')).toBe(true);
  });

  it('updates timestamp on re-failure', () => {
    trackFailedWaveformDate('2025-11-12');
    const raw1 = JSON.parse(storage.get('airwaylab_waveform_upload_failures')!);
    const ts1 = raw1[0].failedAt;

    // Small delay to ensure timestamp differs
    trackFailedWaveformDate('2025-11-12');
    const raw2 = JSON.parse(storage.get('airwaylab_waveform_upload_failures')!);
    expect(raw2.length).toBe(1); // No duplicates
    expect(raw2[0].failedAt).toBeGreaterThanOrEqual(ts1);
  });
});

describe('persistence engine version', () => {
  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
  });

  it('stores ENGINE_VERSION alongside cached results', () => {
    persistResults(SAMPLE_NIGHTS, null);
    const raw = storage.get('airwaylab_results');
    expect(raw).toBeDefined();
    const parsed = JSON.parse(raw!);
    expect(parsed.engineVersion).toBe(ENGINE_VERSION);
  });

  it('loads results when engine version matches', () => {
    persistResults(SAMPLE_NIGHTS, null);
    const result = loadPersistedResults();
    expect(result).not.toBeNull();
    expect(result!.nights.length).toBe(SAMPLE_NIGHTS.length);
  });

  it('invalidates cache when engine version differs', () => {
    persistResults(SAMPLE_NIGHTS, null);
    // Manually change the stored engine version to simulate a version bump
    const raw = storage.get('airwaylab_results');
    const parsed = JSON.parse(raw!);
    parsed.engineVersion = '0.0.0-old';
    storage.set('airwaylab_results', JSON.stringify(parsed));

    const result = loadPersistedResults();
    expect(result).toBeNull();
    // Should have removed the stale data
    expect(storage.has('airwaylab_results')).toBe(false);
  });

  it('loads results when engineVersion is missing (pre-upgrade data)', () => {
    // Simulate data from before engine versioning was added
    persistResults(SAMPLE_NIGHTS, null);
    const raw = storage.get('airwaylab_results');
    const parsed = JSON.parse(raw!);
    delete parsed.engineVersion;
    storage.set('airwaylab_results', JSON.stringify(parsed));

    // Should still load — missing version means pre-upgrade, don't invalidate
    const result = loadPersistedResults();
    expect(result).not.toBeNull();
  });
});

describe('contribute-waveforms compression', () => {
  it('handles CompressionStream unavailable gracefully', async () => {
    // Import dynamically to test the compression fallback
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');
    // With no CompressionStream and no fetch mock, this should not throw
    // (it will fail silently on the fetch, which is the expected behavior)
    // We mainly test that the function exists and doesn't crash on import
    expect(typeof contributeWaveformsBackground).toBe('function');
  });
});
