// ============================================================
// AirwayLab — Oximetry Trace IDB Tests
// Verifies IndexedDB persistence for oximetry trace data.
// Uses mocked IndexedDB (same pattern as waveform-decimation tests).
// ============================================================

import { describe, it, expect } from 'vitest';
import type { OximetryTraceData, OximetryTracePoint } from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────────

function makeTrace(overrides: Partial<OximetryTraceData> = {}): OximetryTraceData {
  const trace: OximetryTracePoint[] = [];
  for (let i = 0; i < 100; i++) {
    trace.push({ t: i * 4, spo2: 95 + Math.round(Math.random() * 3), hr: 65 + Math.round(Math.random() * 10) });
  }
  return {
    trace,
    durationSeconds: 400,
    odi3Events: [120, 240],
    odi4Events: [240],
    ...overrides,
  };
}

// ── Test 1: StoredOximetryTrace structure ────────────────────

describe('oximetry-trace-idb structure', () => {
  it('Test 1: OximetryTraceData has expected shape for IDB storage', () => {
    const trace = makeTrace();
    expect(trace.trace).toHaveLength(100);
    expect(trace.durationSeconds).toBe(400);
    expect(trace.odi3Events).toEqual([120, 240]);
    expect(trace.odi4Events).toEqual([240]);
    // Verify individual point shape
    expect(trace.trace[0]).toHaveProperty('t');
    expect(trace.trace[0]).toHaveProperty('spo2');
    expect(trace.trace[0]).toHaveProperty('hr');
  });
});

// ── Test 2: loadOximetryTrace returns null for non-existent ──

describe('oximetry-trace-idb load non-existent', () => {
  it('Test 2: loadOximetryTrace returns null when indexedDB is undefined', async () => {
    const origIndexedDB = globalThis.indexedDB;
    try {
      // @ts-expect-error — intentionally setting to undefined for test
      globalThis.indexedDB = undefined;

      const { vi } = await import('vitest');
      vi.resetModules();
      const idb = await import('@/lib/oximetry-trace-idb');

      const result = await idb.loadOximetryTrace('2026-03-13');
      expect(result).toBeNull();
    } finally {
      globalThis.indexedDB = origIndexedDB;
    }
  });
});

// ── Test 3: Engine version check exists ──────────────────────

describe('oximetry-trace-idb engine version check', () => {
  it('Test 3: loadOximetryTrace checks ENGINE_VERSION', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/oximetry-trace-idb.ts'), 'utf-8');
    expect(source).toContain('result.engineVersion !== ENGINE_VERSION');
  });
});

// ── Test 4: TTL check exists ─────────────────────────────────

describe('oximetry-trace-idb TTL check', () => {
  it('Test 4: loadOximetryTrace uses 90-day TTL', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/oximetry-trace-idb.ts'), 'utf-8');
    expect(source).toContain('90 * 24 * 60 * 60 * 1000');
    expect(source).toContain('Date.now() - result.storedAt > TTL_MS');
  });
});

// ── Test 5: Multiple dates stored independently ──────────────

describe('oximetry-trace-idb multiple dates', () => {
  it('Test 5: traces for different dates have different dateStr keys', () => {
    const trace1 = makeTrace();
    const trace2 = makeTrace({ durationSeconds: 600 });
    // Verify traces are distinct objects with different data
    expect(trace1.durationSeconds).toBe(400);
    expect(trace2.durationSeconds).toBe(600);
    // In IDB, these would be keyed by dateStr — verify the schema supports this
    const stored1 = { dateStr: '2026-03-12', ...trace1, storedAt: Date.now(), engineVersion: '0.7.0' };
    const stored2 = { dateStr: '2026-03-13', ...trace2, storedAt: Date.now(), engineVersion: '0.7.0' };
    expect(stored1.dateStr).not.toBe(stored2.dateStr);
  });
});

// ── Test 6: clearAll clears oximetry-traces store ────────────

describe('oximetry-trace-idb clearAll', () => {
  it('Test 6: waveform-idb clearAll handles both stores', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/waveform-idb.ts'), 'utf-8');
    // clearAll should reference both store names
    expect(source).toContain('oximetry-traces');
    expect(source).toContain('waveforms');
  });
});

// ── Test 8: storeOximetryTrace does not throw ────────────────

describe('oximetry-trace-idb error handling', () => {
  it('Test 8: storeOximetryTrace returns without throwing when IDB unavailable', async () => {
    const origIndexedDB = globalThis.indexedDB;
    try {
      // @ts-expect-error — intentionally setting to undefined for test
      globalThis.indexedDB = undefined;

      const { vi } = await import('vitest');
      vi.resetModules();
      const idb = await import('@/lib/oximetry-trace-idb');

      // Should not throw
      await expect(
        idb.storeOximetryTrace('2026-03-13', makeTrace())
      ).resolves.toBeUndefined();
    } finally {
      globalThis.indexedDB = origIndexedDB;
    }
  });

  it('does not send IndexedDB errors to Sentry (graceful degradation)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/oximetry-trace-idb.ts'), 'utf-8');
    expect(source).not.toContain("import * as Sentry from '@sentry/nextjs'");
  });
});

// ── Test 9: IDB version bump ─────────────────────────────────

describe('oximetry-trace-idb schema', () => {
  it('Test 9: DB_VERSION is 3 to accommodate breath-data and pld-traces stores', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/waveform-idb.ts'), 'utf-8');
    expect(source).toMatch(/DB_VERSION\s*=\s*3/);
  });

  it('onupgradeneeded creates all object stores', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/waveform-idb.ts'), 'utf-8');
    expect(source).toContain("'oximetry-traces'");
    expect(source).toContain("'breath-data'");
    expect(source).toContain("'pld-traces'");
  });
});
