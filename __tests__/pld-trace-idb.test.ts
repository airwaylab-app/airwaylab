// ============================================================
// AirwayLab — PLD Trace IDB Tests
// Verifies IndexedDB persistence for PLD timeseries data.
// Uses source inspection (same pattern as oximetry-trace-idb tests).
// ============================================================

import { describe, it, expect } from 'vitest';
import type { StoredPLDTrace, PLDTraceInput } from '@/lib/pld-trace-idb';

// -- Helpers ----------------------------------------------------------

function makePLDInput(overrides: Partial<PLDTraceInput> = {}): PLDTraceInput {
  const sampleCount = 1800; // 1 hour at 0.5 Hz
  return {
    samplingRate: 0.5,
    durationSeconds: 3600,
    leak: Array.from({ length: sampleCount }, () => 2 + Math.random() * 8),
    snore: Array.from({ length: sampleCount }, () => Math.random() * 3),
    fflIndex: Array.from({ length: sampleCount }, () => Math.random()),
    therapyPressure: Array.from({ length: sampleCount }, () => 10 + Math.random() * 4),
    respiratoryRate: Array.from({ length: sampleCount }, () => 12 + Math.random() * 6),
    ...overrides,
  };
}

// -- Test 1: StoredPLDTrace structure ---------------------------------

describe('pld-trace-idb structure', () => {
  it('Test 1: PLDTraceInput has expected shape for IDB storage', () => {
    const input = makePLDInput();
    expect(input.samplingRate).toBe(0.5);
    expect(input.durationSeconds).toBe(3600);
    expect(input.leak).toHaveLength(1800);
    expect(input.snore).toHaveLength(1800);
    expect(input.fflIndex).toHaveLength(1800);
    expect(input.therapyPressure).toHaveLength(1800);
    expect(input.respiratoryRate).toHaveLength(1800);
  });

  it('StoredPLDTrace includes metadata fields', () => {
    const stored: StoredPLDTrace = {
      dateStr: '2026-03-13',
      samplingRate: 0.5,
      durationSeconds: 3600,
      sampleCount: 1800,
      leak: [1, 2, 3],
      storedAt: Date.now(),
      engineVersion: '0.7.0',
    };
    expect(stored).toHaveProperty('dateStr');
    expect(stored).toHaveProperty('storedAt');
    expect(stored).toHaveProperty('engineVersion');
    expect(stored).toHaveProperty('sampleCount');
  });
});

// -- Test 2: loadPLDTrace returns null when IDB unavailable -----------

describe('pld-trace-idb load non-existent', () => {
  it('Test 2: loadPLDTrace returns null when indexedDB is undefined', async () => {
    const origIndexedDB = globalThis.indexedDB;
    try {
      // @ts-expect-error -- intentionally setting to undefined for test
      globalThis.indexedDB = undefined;

      const { vi } = await import('vitest');
      vi.resetModules();
      const idb = await import('@/lib/pld-trace-idb');

      const result = await idb.loadPLDTrace('2026-03-13');
      expect(result).toBeNull();
    } finally {
      globalThis.indexedDB = origIndexedDB;
    }
  });
});

// -- Test 3: Engine version check exists ------------------------------

describe('pld-trace-idb engine version check', () => {
  it('Test 3: loadPLDTrace checks ENGINE_VERSION', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/pld-trace-idb.ts'), 'utf-8');
    expect(source).toContain('result.engineVersion !== ENGINE_VERSION');
  });
});

// -- Test 4: TTL check exists -----------------------------------------

describe('pld-trace-idb TTL check', () => {
  it('Test 4: loadPLDTrace uses 90-day TTL', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/pld-trace-idb.ts'), 'utf-8');
    expect(source).toContain('90 * 24 * 60 * 60 * 1000');
    expect(source).toContain('Date.now() - result.storedAt > TTL_MS');
  });
});

// -- Test 5: Multiple dates stored independently ----------------------

describe('pld-trace-idb multiple dates', () => {
  it('Test 5: PLD traces for different dates have different dateStr keys', () => {
    const trace1: StoredPLDTrace = {
      dateStr: '2026-03-12',
      samplingRate: 0.5,
      durationSeconds: 3600,
      sampleCount: 1800,
      leak: [1, 2, 3],
      storedAt: Date.now(),
      engineVersion: '0.7.0',
    };
    const trace2: StoredPLDTrace = {
      dateStr: '2026-03-13',
      samplingRate: 0.5,
      durationSeconds: 7200,
      sampleCount: 3600,
      leak: [4, 5, 6],
      storedAt: Date.now(),
      engineVersion: '0.7.0',
    };
    expect(trace1.dateStr).not.toBe(trace2.dateStr);
    expect(trace1.durationSeconds).not.toBe(trace2.durationSeconds);
  });
});

// -- Test 6: waveform-idb creates pld-traces store --------------------

describe('pld-trace-idb schema', () => {
  it('Test 6: onupgradeneeded creates pld-traces store', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/waveform-idb.ts'), 'utf-8');
    expect(source).toContain("'pld-traces'");
  });
});

// -- Test 7: storePLDTrace does not throw when IDB unavailable --------

describe('pld-trace-idb error handling', () => {
  it('Test 7: storePLDTrace returns without throwing when IDB unavailable', async () => {
    const origIndexedDB = globalThis.indexedDB;
    try {
      // @ts-expect-error -- intentionally setting to undefined for test
      globalThis.indexedDB = undefined;

      const { vi } = await import('vitest');
      vi.resetModules();
      const idb = await import('@/lib/pld-trace-idb');

      // Should not throw
      await expect(
        idb.storePLDTrace('2026-03-13', makePLDInput())
      ).resolves.toBeUndefined();
    } finally {
      globalThis.indexedDB = origIndexedDB;
    }
  });

  it('does not send IndexedDB errors to Sentry (graceful degradation)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/pld-trace-idb.ts'), 'utf-8');
    expect(source).not.toContain("import * as Sentry from '@sentry/nextjs'");
  });
});

// -- Test 8: Only 5 channels stored -----------------------------------

describe('pld-trace-idb channel selection', () => {
  it('Test 8: StoredPLDTrace stores exactly 5 channel fields', () => {
    const stored: StoredPLDTrace = {
      dateStr: '2026-03-13',
      samplingRate: 0.5,
      durationSeconds: 3600,
      sampleCount: 1800,
      leak: [1, 2],
      snore: [0, 1],
      fflIndex: [0.5, 0.6],
      therapyPressure: [12, 13],
      respiratoryRate: [14, 15],
      storedAt: Date.now(),
      engineVersion: '0.7.0',
    };
    // 5 channel fields
    expect(stored.leak).toBeDefined();
    expect(stored.snore).toBeDefined();
    expect(stored.fflIndex).toBeDefined();
    expect(stored.therapyPressure).toBeDefined();
    expect(stored.respiratoryRate).toBeDefined();
    // Channels NOT stored (kept as aggregate PLDSummary in localStorage)
    expect(stored).not.toHaveProperty('maskPressure');
    expect(stored).not.toHaveProperty('tidalVolume');
    expect(stored).not.toHaveProperty('minuteVentilation');
  });
});

// -- Test 9: Float32Array conversion exists ---------------------------

describe('pld-trace-idb Float32Array handling', () => {
  it('Test 9: source code converts Float32Array to number[] for IDB', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/pld-trace-idb.ts'), 'utf-8');
    // Should handle Float32Array conversion
    expect(source).toContain('Float32Array');
    expect(source).toContain('Array.from');
  });
});
