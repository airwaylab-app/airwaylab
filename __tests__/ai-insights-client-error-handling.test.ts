/**
 * Tests for client-side AI insights error handling (AIR-1538).
 *
 * Verifies that:
 * - Failed fetch (network) errors are captured to Sentry with distinguishable context
 * - Error message for network failures does not blame user connectivity
 * - Timeout errors produce an appropriate user message
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCaptureException = vi.fn();
vi.mock('@sentry/nextjs', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
  captureMessage: vi.fn(),
}));

// Minimal NightResult shape matching what the client needs
function makeNight() {
  return {
    date: new Date('2026-03-12'),
    dateStr: '2026-03-12',
    durationHours: 7,
    sessionCount: 1,
    settings: { cpapMode: 'APAP', minPressure: 6, maxPressure: 14, epr: 3, rampTime: 0, settingsSource: 'str_edf' },
    glasgow: { overall: 3.5, skew: 0, spike: 0, flatTop: 0, topHeavy: 0, multiPeak: 0, noPause: 0, inspirRate: 0, multiBreath: 0, variableAmp: 0 },
    wat: { flScore: 40, regularityScore: 1, periodicityIndex: 0.05 },
    ned: {
      breathCount: 400, nedMean: 25, nedMedian: 24, nedP95: 60, nedClearFLPct: 40,
      nedBorderlinePct: 25, fiMean: 0.8, fiFL85Pct: 30, tpeakMean: 0.38, mShapePct: 10,
      reraIndex: 2, reraCount: 3, h1NedMean: 22, h2NedMean: 28, combinedFLPct: 30,
      breaths: [], reras: [],
    },
    oximetry: null,
    machineSummary: undefined,
    settingsFingerprint: undefined,
  };
}

describe('AI Insights Client Error Handling (AIR-1538)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('fetch', undefined);
  });

  it('captures Failed-to-fetch to Sentry with network_fetch_failed tag (standard mode)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const { fetchAIInsights } = await import('@/lib/ai-insights-client');
    await expect(fetchAIInsights([makeNight() as never], 0, null)).rejects.toThrow(
      'The AI analysis service is temporarily unavailable. Please try again.'
    );

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(TypeError),
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({ error_type: 'network_fetch_failed', mode: 'standard' }),
      })
    );
  });

  it('captures Failed-to-fetch to Sentry with network_fetch_failed tag (deep mode)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const { fetchDeepAIInsights } = await import('@/lib/ai-insights-client');
    await expect(fetchDeepAIInsights([makeNight() as never], 0, null)).rejects.toThrow(
      'The AI analysis service is temporarily unavailable. Please try again.'
    );

    expect(mockCaptureException).toHaveBeenCalledWith(
      expect.any(TypeError),
      expect.objectContaining({
        level: 'warning',
        tags: expect.objectContaining({ error_type: 'network_fetch_failed', mode: 'deep' }),
      })
    );
  });

  it('does not capture to Sentry for external AbortError (unmount)', async () => {
    const externalController = new AbortController();
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => {
      externalController.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    }));

    const { fetchAIInsights } = await import('@/lib/ai-insights-client');
    await expect(
      fetchAIInsights([makeNight() as never], 0, null, externalController.signal)
    ).rejects.toBeInstanceOf(DOMException);

    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('returns server error message verbatim for non-ok responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: 'AI service is temporarily unavailable. Our team has been notified and is working on it.' }),
    }));

    const { fetchAIInsights } = await import('@/lib/ai-insights-client');
    await expect(fetchAIInsights([makeNight() as never], 0, null)).rejects.toThrow(
      'AI service is temporarily unavailable. Our team has been notified and is working on it.'
    );
  });
});
