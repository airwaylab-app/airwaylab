/**
 * Integration tests: Waveform orchestrator file filtering and lifecycle (AC-4)
 *
 * Tests the orchestrator's BRP filtering, date filtering, cache,
 * and error propagation. Worker is mocked since jsdom has no real Workers.
 *
 * Strategy: test observable behaviour (state changes, return values, cache)
 * rather than implementation details (what gets posted to the Worker).
 * Full pipeline tests (with real Worker) are covered by Playwright E2E.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import type { WaveformData } from '@/lib/waveform-types';

const FIXTURES = path.resolve(__dirname, '../fixtures/sd-card');

/**
 * Helper: create a mock File with webkitRelativePath from a real fixture.
 */
function createMockFile(relativePath: string): File {
  const fullPath = path.join(FIXTURES, relativePath);
  let data: ArrayBuffer;
  try {
    const buf = fs.readFileSync(fullPath);
    // Copy into a proper ArrayBuffer to satisfy TypeScript's BlobPart constraint
    const ab = new ArrayBuffer(buf.byteLength);
    new Uint8Array(ab).set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
    data = ab;
  } catch {
    data = new ArrayBuffer(100);
  }
  const file = new File([data], path.basename(relativePath), {
    type: 'application/octet-stream',
  });
  Object.defineProperty(file, 'webkitRelativePath', {
    value: `SD-card/${relativePath}`,
    writable: false,
  });
  return file;
}

const fakeWaveform: WaveformData = {
  dateStr: '2026-03-09',
  durationSeconds: 100,
  originalSampleRate: 25,
  flow: [{ t: 0, min: -10, max: 10, avg: 0 }],
  pressure: [],
  leak: [],
  events: [],
  tidalVolume: [],
  respiratoryRate: [],
  stats: {
    breathCount: 10,
    flowMin: -50,
    flowMax: 50,
    flowMean: 0,
    pressureMin: null,
    pressureMax: null,
    leakMean: null,
    leakMax: null,
    leakP95: null,
  },
};

// Mock Worker as a class so `new Worker(...)` works
const workerPostMessage = vi.fn();
const workerTerminate = vi.fn();

class MockWorker {
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: ErrorEvent) => void) | null = null;
  postMessage = workerPostMessage.mockImplementation(() => {
    // Auto-respond with a fake result
    queueMicrotask(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', {
          data: { type: 'WAVEFORM_RESULT', waveform: fakeWaveform },
        }));
      }
    });
  });
  terminate = workerTerminate;
}

vi.stubGlobal('Worker', MockWorker);

let waveformOrchestrator: typeof import('@/lib/waveform-orchestrator').waveformOrchestrator;

beforeEach(async () => {
  vi.resetModules();
  workerPostMessage.mockClear();
  workerTerminate.mockClear();
  const mod = await import('@/lib/waveform-orchestrator');
  waveformOrchestrator = mod.waveformOrchestrator;
});

afterEach(() => {
  waveformOrchestrator.reset();
});

// ── Test Case 10: Empty files → unavailable ───────────────────

describe('Orchestrator error handling', () => {
  it('returns null and sets status unavailable for empty files array', async () => {
    const result = await waveformOrchestrator.extract([], '2026-03-09');
    expect(result).toBeNull();
    expect(waveformOrchestrator.getState().status).toBe('unavailable');
  });

  // ── Test Case 11: No BRP files → error ────────────────────────

  it('returns null and sets error when files contain no BRP', async () => {
    const nonBrpFile = new File([new ArrayBuffer(100000)], '20260310_000159_PLD.edf', {
      type: 'application/octet-stream',
    });
    Object.defineProperty(nonBrpFile, 'webkitRelativePath', {
      value: 'SD/DATALOG/20260309/20260310_000159_PLD.edf',
      writable: false,
    });

    const result = await waveformOrchestrator.extract([nonBrpFile], '2026-03-09');
    expect(result).toBeNull();
    expect(waveformOrchestrator.getState().status).toBe('error');
    expect(waveformOrchestrator.getState().error).toContain('No flow data');
  });
});

// ── BRP size filter ───────────────────────────────────────────

describe('Orchestrator BRP size filter', () => {
  it('skips BRP files under 50KB', async () => {
    const tinyFile = createMockFile('DATALOG/20260207/20260208_043817_BRP.edf');

    const result = await waveformOrchestrator.extract([tinyFile], '2026-02-07');
    expect(result).toBeNull();
    expect(waveformOrchestrator.getState().status).toBe('error');
  });
});

// ── Test Case 9: Cache ────────────────────────────────────────

describe('Orchestrator caching', () => {
  it('serves cached waveform on second call without creating a new Worker', async () => {
    // Use setDemoWaveform to populate cache (bypasses Worker entirely)
    waveformOrchestrator.setDemoWaveform(fakeWaveform);
    expect(waveformOrchestrator.hasCached('2026-03-09')).toBe(true);
    expect(waveformOrchestrator.getState().status).toBe('ready');

    // Second call with same date should use cache
    const brpFile = new File([new ArrayBuffer(100000)], '20260310_000159_BRP.edf', {
      type: 'application/octet-stream',
    });
    Object.defineProperty(brpFile, 'webkitRelativePath', {
      value: 'SD/DATALOG/20260309/20260310_000159_BRP.edf',
      writable: false,
    });

    const result = await waveformOrchestrator.extract([brpFile], '2026-03-09');
    expect(result).toEqual(fakeWaveform);
    // Worker should NOT have been called (served from cache)
    expect(workerPostMessage).not.toHaveBeenCalled();
  });

  it('reset() clears cache and state', () => {
    waveformOrchestrator.setDemoWaveform(fakeWaveform);
    expect(waveformOrchestrator.hasCached('2026-03-09')).toBe(true);

    waveformOrchestrator.reset();
    expect(waveformOrchestrator.hasCached('2026-03-09')).toBe(false);
    expect(waveformOrchestrator.getState().status).toBe('idle');
  });
});

// ── Test Case 8: Date filtering (via Worker mock) ─────────────

describe('Orchestrator date filtering', () => {
  it('extracts successfully when valid BRP files exist for the date', async () => {
    // Create a sufficiently large fake BRP file (>50KB) with correct path
    const brpFile = new File([new ArrayBuffer(100000)], '20260310_000159_BRP.edf', {
      type: 'application/octet-stream',
    });
    Object.defineProperty(brpFile, 'webkitRelativePath', {
      value: 'SD/DATALOG/20260309/20260310_000159_BRP.edf',
      writable: false,
    });

    const result = await waveformOrchestrator.extract([brpFile], '2026-03-09');
    expect(result).toBeDefined();
    expect(waveformOrchestrator.getState().status).toBe('ready');
  });

  it('falls back to all BRP files when no path matches target date', async () => {
    // File path doesn't contain the target date folder
    const brpFile = new File([new ArrayBuffer(100000)], 'some_BRP.edf', {
      type: 'application/octet-stream',
    });
    Object.defineProperty(brpFile, 'webkitRelativePath', {
      value: 'SD/other_folder/some_BRP.edf',
      writable: false,
    });

    // Should still proceed (falls back to all BRP files)
    const result = await waveformOrchestrator.extract([brpFile], '2026-03-09');
    expect(result).toBeDefined();
    expect(workerPostMessage).toHaveBeenCalled();
  });
});
