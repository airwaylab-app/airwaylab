import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ENGINE_VERSION } from '@/lib/engine-version';

// ── localStorage mock ────────────────────────────────────────
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

// ── Sentry mock ──────────────────────────────────────────────
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

// ── EDF parser mock ──────────────────────────────────────────
// Returns a minimal EDFFile with synthetic flow data
vi.mock('@/lib/parsers/edf-parser', () => ({
  parseEDF: vi.fn((buffer: ArrayBuffer, filePath: string) => {
    // Extract date from filename: DATALOG/YYYYMMDD/YYYYMMDD_HHMMSS_BRP.edf
    const match = filePath.match(/(\d{8})_(\d{6})_BRP/);
    const dateStr = match?.[1] ?? '20250115';
    const timeStr = match?.[2] ?? '220000';
    const y = parseInt(dateStr.slice(0, 4));
    const m = parseInt(dateStr.slice(4, 6)) - 1;
    const d = parseInt(dateStr.slice(6, 8));
    const h = parseInt(timeStr.slice(0, 2));
    const min = parseInt(timeStr.slice(2, 4));

    // 100 samples of synthetic sine wave flow data
    const flowData = new Float32Array(100);
    for (let i = 0; i < 100; i++) {
      flowData[i] = Math.sin((2 * Math.PI * i) / 25);
    }

    return {
      header: {
        version: '0',
        patientId: '',
        recordingId: '',
        startDate: `${d}.${m + 1}.${y % 100}`,
        startTime: `${h}.${min}.0`,
        headerBytes: 256,
        reserved: '',
        numDataRecords: 4,
        recordDuration: 1,
        numSignals: 1,
      },
      signals: [{
        label: 'Flow',
        transducer: '',
        physicalDimension: 'L/min',
        physicalMin: -100,
        physicalMax: 100,
        digitalMin: -32768,
        digitalMax: 32767,
        prefiltering: '',
        numSamples: 25,
        reserved: '',
      }],
      recordingDate: new Date(y, m, d, h, min),
      flowData,
      pressureData: null,
      samplingRate: 25,
      durationSeconds: 4,
      filePath,
    };
  }),
}));

import {
  getContributedWaveformDates,
  trackContributedWaveformDate,
  setContributedWaveformEngine,
} from '@/components/upload/contribution-consent-utils';
import type { NightResult } from '@/lib/types';

// ── Test helpers ─────────────────────────────────────────────

/** Create a minimal NightResult for testing. */
function makeNight(dateStr: string): NightResult {
  return {
    date: new Date(dateStr),
    dateStr,
    durationHours: 7.5,
    sessionCount: 1,
    settings: {
      deviceModel: 'AirSense 10',
      epap: 10,
      ipap: 16,
      pressureSupport: 6,
      papMode: 'APAP',
      riseTime: 3,
      trigger: 'Medium',
      cycle: 'Medium',
      easyBreathe: false,
      settingsSource: 'extracted',
    },
    glasgow: {
      overall: 2.1,
      skew: 0.3, spike: 0.15, flatTop: 0.35, topHeavy: 0.22,
      multiPeak: 0.2, noPause: 0.1, inspirRate: 0.25,
      multiBreath: 0.15, variableAmp: 0.3,
    },
    wat: { flScore: 32, regularityScore: 68, periodicityIndex: 18 },
    ned: {
      breathCount: 4120, nedMean: 19.5, nedMedian: 17.2, nedP95: 38.5,
      nedClearFLPct: 3.2, nedBorderlinePct: 8.5, fiMean: 0.72,
      fiFL85Pct: 12.5, tpeakMean: 0.38, mShapePct: 4.8,
      reraIndex: 6.4, reraCount: 48, h1NedMean: 17.8, h2NedMean: 21.2,
      combinedFLPct: 22, estimatedArousalIndex: 8.2,
    },
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null,
  };
}

/** Create a mock SD card File with a BRP path inside a DATALOG folder. */
function makeBRPFile(dateStr: string): File {
  const dateNum = dateStr.replace(/-/g, '');
  const path = `CPAP_DATA/DATALOG/${dateNum}/${dateNum}_220000_BRP.edf`;
  const name = `${dateNum}_220000_BRP.edf`;
  // Create a file with enough bytes to pass the 50KB BRP filter
  const data = new Uint8Array(60 * 1024);
  const file = new File([data], name, { type: 'application/octet-stream' });
  Object.defineProperty(file, 'webkitRelativePath', { value: path, writable: false });
  return file;
}

// ── Tests ────────────────────────────────────────────────────

describe('contributeWaveformsBackground — integration', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage.clear();
    vi.clearAllMocks();
    fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uploads waveform data for new nights', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    const nights = [makeNight('2025-01-15')];
    const files = [makeBRPFile('2025-01-15')];

    await contributeWaveformsBackground(nights, files, 'test-contribution-id');

    // Should have made one fetch call to the API
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]![0]).toBe('/api/contribute-waveforms');

    const callArgs = fetchSpy.mock.calls[0]![1];
    expect(callArgs.method).toBe('POST');
    expect(callArgs.headers['X-Night-Date']).toBe('2025-01-15');
    expect(callArgs.headers['X-Contribution-Id']).toBe('test-contribution-id');
    expect(callArgs.headers['X-Engine-Version']).toBe(ENGINE_VERSION);
    expect(callArgs.headers['X-Sampling-Rate']).toBe('25');
    expect(callArgs.headers['X-Device-Model']).toBe('AirSense 10');
    expect(callArgs.headers['X-Pap-Mode']).toBe('APAP');
    expect(callArgs.headers['Content-Type']).toBe('application/octet-stream');
    expect(callArgs.headers['X-Channel-Count']).toBe('1'); // mock parser has no pressure
    expect(callArgs.headers['X-Format-Version']).toBe('2');
    expect(callArgs.headers['X-Has-Pressure']).toBe('false');

    // Should have binary body (AWL2 header + flow data)
    expect(callArgs.body).toBeInstanceOf(ArrayBuffer);
    expect(callArgs.body.byteLength).toBeGreaterThan(16); // at least AWL2 header
  });

  it('tracks contributed dates after successful upload', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    const nights = [makeNight('2025-01-15'), makeNight('2025-01-16')];
    const files = [makeBRPFile('2025-01-15'), makeBRPFile('2025-01-16')];

    await contributeWaveformsBackground(nights, files, 'test-id');

    const tracked = getContributedWaveformDates();
    expect(tracked.has('2025-01-15')).toBe(true);
    expect(tracked.has('2025-01-16')).toBe(true);
  });

  it('skips already-contributed nights (incremental upload)', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    // Pre-mark one night as contributed
    trackContributedWaveformDate('2025-01-15');

    const nights = [makeNight('2025-01-15'), makeNight('2025-01-16')];
    const files = [makeBRPFile('2025-01-15'), makeBRPFile('2025-01-16')];

    await contributeWaveformsBackground(nights, files, 'test-id');

    // Should only upload the new night (2025-01-16)
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]![1].headers['X-Night-Date']).toBe('2025-01-16');
  });

  it('skips all nights when everything is already contributed', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    trackContributedWaveformDate('2025-01-15');
    trackContributedWaveformDate('2025-01-16');

    const nights = [makeNight('2025-01-15'), makeNight('2025-01-16')];
    const files = [makeBRPFile('2025-01-15'), makeBRPFile('2025-01-16')];

    await contributeWaveformsBackground(nights, files, 'test-id');

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('clears contributed dates and re-uploads when engine version changes', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    // Simulate a previous contribution with an older engine
    trackContributedWaveformDate('2025-01-15');
    setContributedWaveformEngine('0.5.0-old');

    const nights = [makeNight('2025-01-15')];
    const files = [makeBRPFile('2025-01-15')];

    await contributeWaveformsBackground(nights, files, 'test-id');

    // Dates should have been cleared and re-uploaded
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]![1].headers['X-Night-Date']).toBe('2025-01-15');
  });

  it('does not clear dates when engine version matches', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    trackContributedWaveformDate('2025-01-15');
    setContributedWaveformEngine(ENGINE_VERSION);

    const nights = [makeNight('2025-01-15'), makeNight('2025-01-16')];
    const files = [makeBRPFile('2025-01-15'), makeBRPFile('2025-01-16')];

    await contributeWaveformsBackground(nights, files, 'test-id');

    // Only the new night should be uploaded
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]![1].headers['X-Night-Date']).toBe('2025-01-16');
  });

  it('records engine version after successful contribution', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');
    const { getContributedWaveformEngine } = await import('@/components/upload/contribution-consent-utils');

    const nights = [makeNight('2025-01-15')];
    const files = [makeBRPFile('2025-01-15')];

    await contributeWaveformsBackground(nights, files, 'test-id');

    expect(getContributedWaveformEngine()).toBe(ENGINE_VERSION);
  });

  it('does not throw on fetch failure (fire-and-forget)', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    fetchSpy.mockResolvedValue({ ok: false, status: 500 });

    const nights = [makeNight('2025-01-15')];
    const files = [makeBRPFile('2025-01-15')];

    // Should not throw
    await expect(
      contributeWaveformsBackground(nights, files, 'test-id')
    ).resolves.toBeUndefined();

    // Should NOT track the date since upload failed
    const tracked = getContributedWaveformDates();
    expect(tracked.has('2025-01-15')).toBe(false);
  });

  it('does not throw on network error (fire-and-forget)', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    fetchSpy.mockRejectedValue(new Error('Network error'));

    const nights = [makeNight('2025-01-15')];
    const files = [makeBRPFile('2025-01-15')];

    await expect(
      contributeWaveformsBackground(nights, files, 'test-id')
    ).resolves.toBeUndefined();
  });

  it('sends anonymised analysis results in headers', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    const nights = [makeNight('2025-01-15')];
    const files = [makeBRPFile('2025-01-15')];

    await contributeWaveformsBackground(nights, files, 'test-id');

    const resultsHeader = fetchSpy.mock.calls[0]![1].headers['X-Analysis-Results'];
    const parsed = JSON.parse(resultsHeader);

    // Should contain anonymised scores
    expect(parsed.glasgow.overall).toBe(2.1);
    expect(parsed.wat.flScore).toBe(32);
    expect(parsed.ned.nedMean).toBe(19.5);
    expect(parsed.ned.estimatedArousalIndex).toBe(8.2);
    expect(parsed.oximetry).toBeNull();
    expect(parsed.settingsMetrics).toBeNull();

    // Should NOT contain raw data or personal info
    expect(parsed.date).toBeUndefined();
    expect(parsed.dateStr).toBeUndefined();
    expect(parsed.settings).toBeUndefined();
  });

  it('uploads multiple nights sequentially', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    const nights = [
      makeNight('2025-01-15'),
      makeNight('2025-01-16'),
      makeNight('2025-01-17'),
    ];
    const files = [
      makeBRPFile('2025-01-15'),
      makeBRPFile('2025-01-16'),
      makeBRPFile('2025-01-17'),
    ];

    await contributeWaveformsBackground(nights, files, 'test-id');

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    const uploadedDates = fetchSpy.mock.calls.map(
      (c: unknown[]) => (c[1] as { headers: Record<string, string> }).headers['X-Night-Date']
    );
    expect(uploadedDates).toContain('2025-01-15');
    expect(uploadedDates).toContain('2025-01-16');
    expect(uploadedDates).toContain('2025-01-17');
  });

  it('does nothing when no SD files provided', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    const nights = [makeNight('2025-01-15')];

    await contributeWaveformsBackground(nights, [], 'test-id');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('does nothing when no nights provided', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    const files = [makeBRPFile('2025-01-15')];

    await contributeWaveformsBackground([], files, 'test-id');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('continues uploading remaining nights when one fails', async () => {
    const { contributeWaveformsBackground } = await import('@/lib/contribute-waveforms');

    // First call fails, second succeeds
    fetchSpy
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true });

    const nights = [makeNight('2025-01-15'), makeNight('2025-01-16')];
    const files = [makeBRPFile('2025-01-15'), makeBRPFile('2025-01-16')];

    await contributeWaveformsBackground(nights, files, 'test-id');

    expect(fetchSpy).toHaveBeenCalledTimes(2);

    // Only the successful night should be tracked
    const tracked = getContributedWaveformDates();
    expect(tracked.has('2025-01-15')).toBe(false);
    expect(tracked.has('2025-01-16')).toBe(true);
  });
});

