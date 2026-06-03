// ============================================================
// AirwayLab — IndexedDB Oximetry Trace Storage
// Persists downsampled OximetryTraceData for instant reload.
// Mirrors the waveform-idb pattern: 90-day TTL, engine version
// invalidation, non-fatal on failure.
//
// Transactions, the shared connection, the serialized op queue, and the
// disk-quota guard come from ./idb-core (fixes I1/I2/I3/I4/I6).
// ============================================================

import type { OximetryTraceData } from './types';
import { OXIMETRY_STORE_NAME } from './waveform-idb';
import { runTx, assertQuota, isQuotaError } from './idb-core';
import { ENGINE_VERSION } from './engine-version';

const STORE_NAME = OXIMETRY_STORE_NAME;
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
// I4: ~24 bytes per trace point (t/spo2/hr numbers + clone overhead) plus
// a small fixed overhead for the event arrays/metadata.
const BYTES_PER_TRACE_POINT = 24;
const TRACE_METADATA_OVERHEAD_BYTES = 4 * 1024;

interface StoredOximetryTrace extends OximetryTraceData {
  dateStr: string;
  storedAt: number;
  engineVersion: string;
}

function estimateTraceBytes(trace: OximetryTraceData): number {
  const points = trace.trace?.length ?? 0;
  const events = (trace.odi3Events?.length ?? 0) + (trace.odi4Events?.length ?? 0);
  return points * BYTES_PER_TRACE_POINT + events * 8 + TRACE_METADATA_OVERHEAD_BYTES;
}

/**
 * Store an oximetry trace in IndexedDB.
 * Overwrites any existing entry for the same date.
 * Quota failures reject with a typed QuotaError (see idb-core) so the caller
 * knows the PHI was not persisted instead of it being silently swallowed.
 */
export async function storeOximetryTrace(
  dateStr: string,
  trace: OximetryTraceData
): Promise<void> {
  try {
    await assertQuota(estimateTraceBytes(trace)); // I4
    const stored: StoredOximetryTrace = {
      dateStr,
      ...trace,
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
    console.warn('[oximetry-trace-idb] store failed:', err);
  }
}

/**
 * Load an oximetry trace from IndexedDB.
 * Returns null if not found, expired, or engine version mismatch.
 */
export async function loadOximetryTrace(
  dateStr: string
): Promise<OximetryTraceData | null> {
  try {
    const result = await runTx<StoredOximetryTrace | undefined>(
      STORE_NAME,
      'readonly',
      (tx) => tx.objectStore(STORE_NAME).get(dateStr),
    );

    if (!result) {
      return null;
    }

    // Engine version mismatch → stale data
    if (result.engineVersion !== ENGINE_VERSION) {
      deleteOximetryTrace(dateStr).catch(() => { /* fire-and-forget stale IDB cleanup */ });
      return null;
    }

    // TTL check
    if (Date.now() - result.storedAt > TTL_MS) {
      deleteOximetryTrace(dateStr).catch(() => { /* fire-and-forget expired IDB cleanup */ });
      return null;
    }

    return {
      trace: result.trace,
      durationSeconds: result.durationSeconds,
      odi3Events: result.odi3Events,
      odi4Events: result.odi4Events,
    };
  } catch {
    // IndexedDB unavailable (private browsing, etc.) — non-fatal
    return null;
  }
}

/**
 * Delete a specific oximetry trace from IndexedDB.
 */
async function deleteOximetryTrace(dateStr: string): Promise<void> {
  try {
    await runTx(STORE_NAME, 'readwrite', (tx) =>
      tx.objectStore(STORE_NAME).delete(dateStr),
    );
  } catch {
    // Non-fatal — best-effort cleanup
  }
}
