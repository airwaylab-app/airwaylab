/**
 * Tests that NotFoundError (SD card ejected mid-read) produces
 * user-friendly error messages in both orchestrators.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

vi.mock('@/lib/waveform-idb', () => ({
  storeWaveform: vi.fn(() => Promise.resolve()),
  loadWaveform: vi.fn(() => Promise.resolve(null)),
  deleteExpired: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/engine-version', () => ({
  ENGINE_VERSION: '1.0.0',
}));

// ── Analysis orchestrator mocks ───────────────────────────────────────────────

vi.mock('@/lib/persistence', () => ({
  loadPersistedResults: vi.fn(() => null),
  persistResults: vi.fn(() => ({ reason: null })),
  persistNightsIncremental: vi.fn(),
}));

vi.mock('@/lib/file-manifest', () => ({
  extractNightDate: vi.fn(() => null),
  buildManifest: vi.fn(() => ({})),
  saveManifest: vi.fn(),
  loadManifest: vi.fn(() => null),
  diffAgainstManifest: vi.fn(() => ({
    unchanged: [],
    changedNights: new Set(),
    changedFiles: [],
  })),
}));

vi.mock('@/lib/oximetry-trace-idb', () => ({
  storeOximetryTrace: vi.fn(),
  loadOximetryTrace: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/breath-data-idb', () => ({
  storeBreathData: vi.fn(),
  loadBreathData: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/pld-trace-idb', () => ({
  storePLDTrace: vi.fn(),
  loadPLDTrace: vi.fn(() => Promise.resolve(null)),
}));

vi.mock('@/lib/auth/feature-gate', () => ({
  getAnalysisWindowDays: vi.fn(() => Infinity),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNotFoundError(): DOMException {
  return new DOMException('File or directory not found.', 'NotFoundError');
}

function makeNotReadableError(): DOMException {
  return new DOMException('File could not be read.', 'NotReadableError');
}

/** Fake BRP file that throws the given error from arrayBuffer() */
function makeBrpFile(err: Error): File {
  return {
    name: '20260101_BRP.edf',
    webkitRelativePath: 'DATALOG/20260101/20260101_BRP.edf',
    size: 100 * 1024,
    arrayBuffer: () => Promise.reject(err),
  } as unknown as File;
}

/** Fake EDF file that throws the given error from arrayBuffer() */
function makeEdfFile(err: Error): File {
  return {
    name: '20260101_BRP.edf',
    webkitRelativePath: 'DATALOG/20260101/20260101_BRP.edf',
    size: 100 * 1024,
    arrayBuffer: () => Promise.reject(err),
  } as unknown as File;
}

// ── Waveform orchestrator ─────────────────────────────────────────────────────

describe('WaveformOrchestrator — SD card disconnect errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('maps NotFoundError to user-friendly SD card message', async () => {
    const { waveformOrchestrator } = await import('@/lib/waveform-orchestrator');
    const file = makeBrpFile(makeNotFoundError());

    const result = await waveformOrchestrator.extract([file], '2026-01-01');

    expect(result).toBeNull();
    expect(waveformOrchestrator.getState().status).toBe('error');
    expect(waveformOrchestrator.getState().error).toBe(
      'The SD card was removed or became unavailable. Please reconnect and try again.'
    );
  });

  it('preserves existing NotReadableError mapping', async () => {
    const { waveformOrchestrator } = await import('@/lib/waveform-orchestrator');
    const file = makeBrpFile(makeNotReadableError());

    const result = await waveformOrchestrator.extract([file], '2026-01-01');

    expect(result).toBeNull();
    expect(waveformOrchestrator.getState().error).toBe(
      'Could not read your SD card files. Please check the card is still connected and try again.'
    );
  });

  it('reports NotFoundError to Sentry', async () => {
    const { waveformOrchestrator } = await import('@/lib/waveform-orchestrator');
    const Sentry = await import('@sentry/nextjs');
    const file = makeBrpFile(makeNotFoundError());

    await waveformOrchestrator.extract([file], '2026-01-01');

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'NotFoundError' }),
      expect.objectContaining({ extra: expect.objectContaining({ context: 'waveform-extraction' }) })
    );
  });
});

// ── Analysis orchestrator ─────────────────────────────────────────────────────

describe('AnalysisOrchestrator — SD card disconnect errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    // Stub Worker so it is available but never reached (error happens before worker spawn)
    vi.stubGlobal('Worker', function MockWorker() {
      throw new Error('Worker should not be instantiated in this test');
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('maps NotFoundError to user-friendly SD card message', async () => {
    const { orchestrator } = await import('@/lib/analysis-orchestrator');
    const file = makeEdfFile(makeNotFoundError());
    const fileList = [file];

    try {
      await orchestrator.analyze(fileList, undefined, undefined, undefined, 'community');
    } catch {
      // analyze() re-throws after setting state
    }

    expect(orchestrator.getState().status).toBe('error');
    expect(orchestrator.getState().error).toBe(
      'The SD card was removed or became unavailable. Please reconnect and try again.'
    );
  });

  it('reports NotFoundError to Sentry with analysis-worker context', async () => {
    const { orchestrator } = await import('@/lib/analysis-orchestrator');
    const Sentry = await import('@sentry/nextjs');
    const file = makeEdfFile(makeNotFoundError());

    try {
      await orchestrator.analyze([file], undefined, undefined, undefined, 'community');
    } catch {
      // expected
    }

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'NotFoundError' }),
      expect.objectContaining({ extra: expect.objectContaining({ context: 'analysis-worker' }) })
    );
  });
});
