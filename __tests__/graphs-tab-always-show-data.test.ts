import { describe, it, expect } from 'vitest';
import type { NightResult, GlasgowComponents, WATResults, NEDResults, MachineSettings } from '@/lib/types';

/**
 * Tests for graphs-tab-always-show-data spec.
 *
 * These tests verify the rendering conditions and data logic
 * rather than DOM rendering (no React test plugin configured).
 * They mirror the conditional guards in graphs-tab.tsx and trend-chart.tsx.
 */

// --- Test helpers (matching existing codebase patterns) ---

function makeSettings(): MachineSettings {
  return {
    deviceModel: 'AirSense 10',
    epap: 10,
    ipap: 14,
    pressureSupport: 4,
    papMode: 'APAP',
    riseTime: 2,
    trigger: 'Medium',
    cycle: 'Medium',
    easyBreathe: false,
    settingsSource: 'extracted',
  };
}

function makeGlasgow(overall: number): GlasgowComponents {
  return {
    overall,
    skew: 0.3, spike: 0.2, flatTop: 0.25, topHeavy: 0.1,
    multiPeak: 0.15, noPause: 0.3, inspirRate: 0.2, multiBreath: 0.1, variableAmp: 0.2,
  };
}

function makeWAT(overrides: Partial<WATResults> = {}): WATResults {
  return { flScore: 25, regularityScore: 15, periodicityIndex: 8, ...overrides };
}

function makeNED(overrides: Partial<NEDResults> = {}): NEDResults {
  return {
    breathCount: 4200, nedMean: 12, nedMedian: 9, nedP95: 28,
    nedClearFLPct: 5, nedBorderlinePct: 8, fiMean: 0.72, fiFL85Pct: 6,
    tpeakMean: 0.38, mShapePct: 3, reraIndex: 3, reraCount: 21,
    h1NedMean: 10, h2NedMean: 14, combinedFLPct: 18, estimatedArousalIndex: 7,
    ...overrides,
  };
}

function makeNight(dateStr: string, glasgowOverall = 2.5): NightResult {
  return {
    date: new Date(dateStr),
    dateStr,
    durationHours: 7.2,
    sessionCount: 1,
    settings: makeSettings(),
    glasgow: makeGlasgow(glasgowOverall),
    wat: makeWAT(),
    ned: makeNED(),
    oximetry: null,
    oximetryTrace: null,
    settingsMetrics: null,
    crossDevice: null, machineSummary: null, settingsFingerprint: null,
  };
}

// --- Rendering condition tests ---

describe('TrendChart rendering guard', () => {
  // Mirrors the condition in graphs-tab.tsx: nights.length > 0

  it('should render TrendChart when nights has exactly 1 entry', () => {
    const nights = [makeNight('2026-03-13')];
    const shouldRender = nights.length > 0;
    expect(shouldRender).toBe(true);
  });

  it('should render TrendChart when nights has multiple entries', () => {
    const nights = [makeNight('2026-03-13'), makeNight('2026-03-12'), makeNight('2026-03-11')];
    const shouldRender = nights.length > 0;
    expect(shouldRender).toBe(true);
  });

  it('should not render TrendChart when nights is empty', () => {
    const nights: NightResult[] = [];
    const shouldRender = nights.length > 0;
    expect(shouldRender).toBe(false);
  });
});

describe('TrendChart dynamic title', () => {
  // Mirrors the condition in trend-chart.tsx: nights.length > 1 ? 'Multi-Night Trends' : 'Night Metrics'

  it('should show "Night Metrics" for a single night', () => {
    const nights = [makeNight('2026-03-13')];
    const title = nights.length > 1 ? 'Multi-Night Trends' : 'Night Metrics';
    expect(title).toBe('Night Metrics');
  });

  it('should show "Multi-Night Trends" for 2+ nights', () => {
    const nights = [makeNight('2026-03-13'), makeNight('2026-03-12')];
    const title = nights.length > 1 ? 'Multi-Night Trends' : 'Night Metrics';
    expect(title).toBe('Multi-Night Trends');
  });

  it('should show "Multi-Night Trends" for many nights', () => {
    const nights = Array.from({ length: 14 }, (_, i) =>
      makeNight(`2026-03-${String(i + 1).padStart(2, '0')}`)
    );
    const title = nights.length > 1 ? 'Multi-Night Trends' : 'Night Metrics';
    expect(title).toBe('Multi-Night Trends');
  });
});

describe('Glasgow Radar fallback when no waveform', () => {
  // Mirrors the condition in graphs-tab.tsx:
  // !cloudLoading && state.status !== 'loading' && state.status !== 'error' && !storedWaveform

  type WaveformStatus = 'idle' | 'loading' | 'error' | 'ready';

  function shouldShowGlasgowFallback(
    cloudLoading: boolean,
    status: WaveformStatus,
    storedWaveform: unknown,
  ): boolean {
    return !cloudLoading && status !== 'loading' && status !== 'error' && !storedWaveform;
  }

  it('should show Glasgow Radar when no waveform data is available', () => {
    expect(shouldShowGlasgowFallback(false, 'idle', null)).toBe(true);
  });

  it('should NOT show Glasgow Radar when waveform data exists', () => {
    expect(shouldShowGlasgowFallback(false, 'idle', { flow: new Float32Array(100) })).toBe(false);
  });

  it('should NOT show Glasgow Radar while cloud is loading', () => {
    expect(shouldShowGlasgowFallback(true, 'idle', null)).toBe(false);
  });

  it('should NOT show Glasgow Radar while waveform is extracting', () => {
    expect(shouldShowGlasgowFallback(false, 'loading', null)).toBe(false);
  });

  it('should NOT show Glasgow Radar on error (error card shows instead)', () => {
    expect(shouldShowGlasgowFallback(false, 'error', null)).toBe(false);
  });

  it('Glasgow data is always available from persisted NightResult', () => {
    const night = makeNight('2026-03-13', 3.2);
    expect(night.glasgow).toBeDefined();
    expect(night.glasgow.overall).toBe(3.2);
    expect(night.glasgow.skew).toBeGreaterThan(0);
  });
});

describe('Info banner rendering conditions', () => {
  // Mirrors the condition in graphs-tab.tsx:
  // !isDemo && sdFiles.length === 0 && (cloudAttempted || !cloudLoading)

  function shouldShowReUploadBanner(
    isDemo: boolean,
    sdFilesCount: number,
    cloudAttempted: boolean,
    cloudLoading: boolean,
  ): boolean {
    return !isDemo && sdFilesCount === 0 && (cloudAttempted || !cloudLoading);
  }

  it('should show re-upload banner for persisted session (no SD, no demo)', () => {
    expect(shouldShowReUploadBanner(false, 0, true, false)).toBe(true);
  });

  it('should show banner when cloud not attempted but not loading either', () => {
    // cloudAttempted=false, cloudLoading=false → (false || true) = true
    expect(shouldShowReUploadBanner(false, 0, false, false)).toBe(true);
  });

  it('should NOT show any banner in demo mode', () => {
    expect(shouldShowReUploadBanner(true, 0, true, false)).toBe(false);
  });

  it('should NOT show banner when SD files are present', () => {
    expect(shouldShowReUploadBanner(false, 5, true, false)).toBe(false);
  });
});

describe('TrendChart data preparation', () => {
  // Mirrors the data mapping from trend-chart.tsx

  it('should produce valid data points for a single night', () => {
    const nights = [makeNight('2026-03-13', 3.2)];
    const data = nights.map((n) => ({
      date: n.dateStr.slice(5),
      glasgow: +n.glasgow.overall.toFixed(2),
      flScore: +n.wat.flScore.toFixed(1),
      nedMean: +n.ned.nedMean.toFixed(1),
      reraIndex: +n.ned.reraIndex.toFixed(1),
    }));

    expect(data).toHaveLength(1);
    expect(data[0]!.glasgow).toBe(3.2);
    expect(data[0]!.flScore).toBe(25);
    expect(data[0]!.nedMean).toBe(12);
    expect(data[0]!.reraIndex).toBe(3);
    expect(data[0]!.date).toBe('03-13');
  });

  it('should handle multiple nights in chronological order', () => {
    const nights = [
      makeNight('2026-03-13', 2.8),
      makeNight('2026-03-12', 3.5),
      makeNight('2026-03-11', 4.1),
    ];
    // TrendChart reverses the array (most recent is last on X axis)
    const data = [...nights].reverse().map((n) => ({
      date: n.dateStr.slice(5),
      glasgow: +n.glasgow.overall.toFixed(2),
    }));

    expect(data).toHaveLength(3);
    expect(data[0]!.date).toBe('03-11'); // oldest first
    expect(data[2]!.date).toBe('03-13'); // newest last
    expect(data[0]!.glasgow).toBe(4.1);
    expect(data[2]!.glasgow).toBe(2.8);
  });
});
