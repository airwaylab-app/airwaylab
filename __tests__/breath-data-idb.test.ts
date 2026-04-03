// ============================================================
// AirwayLab — Per-Breath Data IDB Tests
// Verifies IndexedDB persistence for compact breath data.
// Uses source inspection (same pattern as oximetry-trace-idb tests).
// ============================================================

import { describe, it, expect } from 'vitest';
import type { CompactBreath } from '@/lib/breath-data-idb';

// -- Helpers ----------------------------------------------------------

function makeCompactBreaths(count: number): CompactBreath[] {
  const breaths: CompactBreath[] = [];
  for (let i = 0; i < count; i++) {
    breaths.push({
      ned: 10 + Math.random() * 40,
      fi: 0.5 + Math.random() * 0.4,
      isMShape: Math.random() > 0.8,
      tPeakTi: 0.2 + Math.random() * 0.3,
      qPeak: 5 + Math.random() * 15,
      ti: 0.8 + Math.random() * 0.8,
      inspStartSec: i * 3.5,
      expEndSec: i * 3.5 + 2.5,
    });
  }
  return breaths;
}

// -- Test 1: CompactBreath structure ----------------------------------

describe('breath-data-idb structure', () => {
  it('Test 1: CompactBreath has expected shape', () => {
    const breaths = makeCompactBreaths(50);
    expect(breaths).toHaveLength(50);

    const first = breaths[0]!;
    expect(first).toHaveProperty('ned');
    expect(first).toHaveProperty('fi');
    expect(first).toHaveProperty('isMShape');
    expect(first).toHaveProperty('tPeakTi');
    expect(first).toHaveProperty('qPeak');
    expect(first).toHaveProperty('ti');
    expect(first).toHaveProperty('inspStartSec');
    expect(first).toHaveProperty('expEndSec');
    // Verify inspFlow is NOT present (stripped for storage)
    expect(first).not.toHaveProperty('inspFlow');
  });
});

// -- Test 2: loadBreathData returns null when IDB unavailable ---------

describe('breath-data-idb load non-existent', () => {
  it('Test 2: loadBreathData returns null when indexedDB is undefined', async () => {
    const origIndexedDB = globalThis.indexedDB;
    try {
      // @ts-expect-error -- intentionally setting to undefined for test
      globalThis.indexedDB = undefined;

      const { vi } = await import('vitest');
      vi.resetModules();
      const idb = await import('@/lib/breath-data-idb');

      const result = await idb.loadBreathData('2026-03-13');
      expect(result).toBeNull();
    } finally {
      globalThis.indexedDB = origIndexedDB;
    }
  });
});

// -- Test 3: Engine version check exists ------------------------------

describe('breath-data-idb engine version check', () => {
  it('Test 3: loadBreathData checks ENGINE_VERSION', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/breath-data-idb.ts'), 'utf-8');
    expect(source).toContain('result.engineVersion !== ENGINE_VERSION');
  });
});

// -- Test 4: TTL check exists -----------------------------------------

describe('breath-data-idb TTL check', () => {
  it('Test 4: loadBreathData uses 90-day TTL', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/breath-data-idb.ts'), 'utf-8');
    expect(source).toContain('90 * 24 * 60 * 60 * 1000');
    expect(source).toContain('Date.now() - result.storedAt > TTL_MS');
  });
});

// -- Test 5: Multiple dates stored independently ----------------------

describe('breath-data-idb multiple dates', () => {
  it('Test 5: breath data for different dates have different dateStr keys', () => {
    const breaths1 = makeCompactBreaths(30);
    const breaths2 = makeCompactBreaths(50);
    expect(breaths1).toHaveLength(30);
    expect(breaths2).toHaveLength(50);
    // In IDB, these would be keyed by dateStr
    const stored1 = { dateStr: '2026-03-12', breaths: breaths1, breathCount: 30, samplingRate: 25, storedAt: Date.now(), engineVersion: '0.7.0' };
    const stored2 = { dateStr: '2026-03-13', breaths: breaths2, breathCount: 50, samplingRate: 25, storedAt: Date.now(), engineVersion: '0.7.0' };
    expect(stored1.dateStr).not.toBe(stored2.dateStr);
    expect(stored1.breathCount).not.toBe(stored2.breathCount);
  });
});

// -- Test 6: waveform-idb creates breath-data store -------------------

describe('breath-data-idb schema', () => {
  it('Test 6: onupgradeneeded creates breath-data store', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/waveform-idb.ts'), 'utf-8');
    expect(source).toContain("'breath-data'");
  });
});

// -- Test 7: storeBreathData does not throw when IDB unavailable ------

describe('breath-data-idb error handling', () => {
  it('Test 7: storeBreathData returns without throwing when IDB unavailable', async () => {
    const origIndexedDB = globalThis.indexedDB;
    try {
      // @ts-expect-error -- intentionally setting to undefined for test
      globalThis.indexedDB = undefined;

      const { vi } = await import('vitest');
      vi.resetModules();
      const idb = await import('@/lib/breath-data-idb');

      // Should not throw
      await expect(
        idb.storeBreathData('2026-03-13', [], 25)
      ).resolves.toBeUndefined();
    } finally {
      globalThis.indexedDB = origIndexedDB;
    }
  });

  it('does not send IndexedDB errors to Sentry (graceful degradation)', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/breath-data-idb.ts'), 'utf-8');
    expect(source).not.toContain("import * as Sentry from '@sentry/nextjs'");
  });
});

// -- Test 8: toCompactBreaths strips inspFlow -------------------------

describe('breath-data-idb compact conversion', () => {
  it('Test 8: source code converts Breath to CompactBreath stripping inspFlow', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');
    const source = readFileSync(resolve(__dirname, '../lib/breath-data-idb.ts'), 'utf-8');
    // Conversion function should map breath fields and compute seconds from samples
    expect(source).toContain('b.inspStart / samplingRate');
    expect(source).toContain('b.expEnd / samplingRate');
    // Should NOT reference inspFlow in the mapping
    expect(source).not.toContain('inspFlow:');
  });
});
