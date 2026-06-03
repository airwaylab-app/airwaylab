// ============================================================
// AirwayLab — IndexedDB Per-Breath Data Storage
// Persists compact per-breath NED metrics for instant reload.
// Mirrors the oximetry-trace-idb pattern: 90-day TTL, engine
// version invalidation, non-fatal on failure.
//
// Transactions, the shared connection, the serialized op queue, and the
// disk-quota guard come from ./idb-core (fixes I1/I2/I3/I4/I6).
// ============================================================

import * as Sentry from '@sentry/nextjs';
import type { Breath } from './types';
import { BREATH_DATA_STORE_NAME } from './waveform-idb';
import { runTx, assertQuota, isQuotaError } from './idb-core';
import { ENGINE_VERSION } from './engine-version';

const STORE_NAME = BREATH_DATA_STORE_NAME;
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
// Structured-clone OOM guard: ~256 bytes per compact breath (JSON ~120 chars × 2).
// IDB quota is disk-based, but the clone algorithm itself can OOM under memory pressure
// with very large objects — see Sentry JAVASCRIPT-NEXTJS-64. This is separate from the
// disk-quota check (assertQuota) which guards against QuotaExceededError on write.
const MAX_IDB_BYTES = 20 * 1024 * 1024; // 20 MB
const BYTES_PER_COMPACT_BREATH = 256;

/**
 * Compact per-breath representation for IndexedDB.
 * Strips inspFlow (Float32Array per breath) to keep storage reasonable.
 * Only stores computed metrics and timing needed for temporal analysis.
 */
export interface CompactBreath {
  ned: number;
  fi: number;
  isMShape: boolean;
  tPeakTi: number;
  qPeak: number;
  ti: number;
  /** inspStart / samplingRate — timing for temporal analysis */
  inspStartSec: number;
  /** expEnd / samplingRate — timing for temporal analysis */
  expEndSec: number;
}

interface StoredBreathData {
  dateStr: string;
  breaths: CompactBreath[];
  breathCount: number;
  samplingRate: number;
  storedAt: number;
  engineVersion: string;
}

/**
 * Convert full Breath objects to compact representation for storage.
 * Strips inspFlow (Float32Array) and converts sample indices to seconds.
 */
function toCompactBreaths(breaths: Breath[], samplingRate: number): CompactBreath[] {
  return breaths.map((b) => ({
    ned: b.ned,
    fi: b.fi,
    isMShape: b.isMShape,
    tPeakTi: b.tPeakTi,
    qPeak: b.qPeak,
    ti: b.ti,
    inspStartSec: b.inspStart / samplingRate,
    expEndSec: b.expEnd / samplingRate,
  }));
}

/**
 * Store per-breath data in IndexedDB.
 * Overwrites any existing entry for the same date.
 * Quota failures reject with a typed QuotaError (see idb-core) so the caller
 * knows the PHI was not persisted instead of it being silently swallowed.
 */
export async function storeBreathData(
  dateStr: string,
  breaths: Breath[],
  samplingRate: number
): Promise<void> {
  try {
    const compact = toCompactBreaths(breaths, samplingRate);
    const estimatedBytes = compact.length * BYTES_PER_COMPACT_BREATH;

    Sentry.addBreadcrumb({
      message: 'breath-data-idb: storing breath data',
      category: 'idb',
      data: { dateStr, breathCount: compact.length, estimatedBytes },
    });

    if (estimatedBytes > MAX_IDB_BYTES) {
      console.warn(
        `[breath-data-idb] breath data too large for IDB (est. ${estimatedBytes} bytes / ${compact.length} breaths) — skipping write to avoid structured-clone OOM`
      );
      return;
    }

    await assertQuota(estimatedBytes); // I4: disk-quota headroom check

    const stored: StoredBreathData = {
      dateStr,
      breaths: compact,
      breathCount: breaths.length,
      samplingRate,
      storedAt: Date.now(),
      engineVersion: ENGINE_VERSION,
    };
    await runTx(STORE_NAME, 'readwrite', (tx) =>
      tx.objectStore(STORE_NAME).put(stored),
    );
  } catch (err) {
    // I1: surface quota failures to the caller (PHI was not saved).
    if (isQuotaError(err)) throw err;
    // Non-quota failures stay non-fatal; callers fall back to in-memory. Expected in private browsing.
    console.warn('[breath-data-idb] store failed:', err);
  }
}

/**
 * Load per-breath data from IndexedDB.
 * Returns null if not found, expired, or engine version mismatch.
 */
export async function loadBreathData(
  dateStr: string
): Promise<CompactBreath[] | null> {
  try {
    const result = await runTx<StoredBreathData | undefined>(
      STORE_NAME,
      'readonly',
      (tx) => tx.objectStore(STORE_NAME).get(dateStr),
    );

    if (!result) {
      return null;
    }

    // Engine version mismatch -> stale data
    if (result.engineVersion !== ENGINE_VERSION) {
      deleteBreathData(dateStr).catch(() => { /* fire-and-forget stale IDB cleanup */ });
      return null;
    }

    // TTL check
    if (Date.now() - result.storedAt > TTL_MS) {
      deleteBreathData(dateStr).catch(() => { /* fire-and-forget expired IDB cleanup */ });
      return null;
    }

    return result.breaths;
  } catch {
    // IndexedDB unavailable (private browsing, etc.) — non-fatal
    return null;
  }
}

/**
 * Delete a specific breath data entry from IndexedDB.
 */
async function deleteBreathData(dateStr: string): Promise<void> {
  try {
    await runTx(STORE_NAME, 'readwrite', (tx) =>
      tx.objectStore(STORE_NAME).delete(dateStr),
    );
  } catch {
    // Non-fatal — best-effort cleanup
  }
}
