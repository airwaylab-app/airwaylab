// ============================================================
// AirwayLab — IndexedDB PLD Timeseries Storage
// Persists PLD (Pressure/Leak/Detail) channel traces for instant
// reload. Stores the 5 most valuable channels as number arrays.
// Mirrors the oximetry-trace-idb pattern: 90-day TTL, engine
// version invalidation, non-fatal on failure.
//
// Transactions, the shared connection, the serialized op queue, and the
// disk-quota guard come from ./idb-core (fixes I1/I2/I3/I4/I6).
// ============================================================

import { PLD_TRACES_STORE_NAME } from './waveform-idb';
import { runTx, assertQuota, isQuotaError } from './idb-core';
import { ENGINE_VERSION } from './engine-version';

const STORE_NAME = PLD_TRACES_STORE_NAME;
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
// I4: each channel sample is a number (~8 bytes). Up to 5 channels stored.
const BYTES_PER_SAMPLE = 8;
const PLD_METADATA_OVERHEAD_BYTES = 4 * 1024;

/**
 * PLD trace data stored in IndexedDB.
 * Only the 5 most valuable channels are stored as timeseries.
 * Less-used channels are available as PLDSummary aggregate stats
 * (persisted in localStorage with the NightResult).
 */
export interface StoredPLDTrace {
  dateStr: string;
  samplingRate: number;
  durationSeconds: number;
  sampleCount: number;
  /** Leak rate in L/min */
  leak?: number[];
  /** Snore signal (dimensionless) */
  snore?: number[];
  /** Flow limitation index (dimensionless) */
  fflIndex?: number[];
  /** Therapy pressure in cmH2O */
  therapyPressure?: number[];
  /** Respiratory rate in breaths/min */
  respiratoryRate?: number[];
  storedAt: number;
  engineVersion: string;
}

/**
 * Input data for storing a PLD trace.
 * Accepts Float32Arrays or number arrays for each channel.
 */
export interface PLDTraceInput {
  samplingRate: number;
  durationSeconds: number;
  leak?: Float32Array | number[];
  snore?: Float32Array | number[];
  fflIndex?: Float32Array | number[];
  therapyPressure?: Float32Array | number[];
  respiratoryRate?: Float32Array | number[];
}

/**
 * Convert a Float32Array or number[] to a plain number[] for IndexedDB.
 * IndexedDB handles plain arrays better than typed arrays.
 */
function toNumberArray(data: Float32Array | number[] | undefined): number[] | undefined {
  if (!data || data.length === 0) return undefined;
  if (data instanceof Float32Array) return Array.from(data);
  return data;
}

/**
 * Store a PLD trace in IndexedDB.
 * Overwrites any existing entry for the same date.
 * Quota failures reject with a typed QuotaError (see idb-core) so the caller
 * knows the PHI was not persisted instead of it being silently swallowed.
 */
export async function storePLDTrace(
  dateStr: string,
  pldData: PLDTraceInput
): Promise<void> {
  try {
    const sampleCount = pldData.leak?.length
      ?? pldData.snore?.length
      ?? pldData.fflIndex?.length
      ?? pldData.therapyPressure?.length
      ?? pldData.respiratoryRate?.length
      ?? 0;

    const channelCount = [
      pldData.leak,
      pldData.snore,
      pldData.fflIndex,
      pldData.therapyPressure,
      pldData.respiratoryRate,
    ].filter((c) => c && c.length > 0).length;
    await assertQuota(sampleCount * channelCount * BYTES_PER_SAMPLE + PLD_METADATA_OVERHEAD_BYTES); // I4

    const stored: StoredPLDTrace = {
      dateStr,
      samplingRate: pldData.samplingRate,
      durationSeconds: pldData.durationSeconds,
      sampleCount,
      leak: toNumberArray(pldData.leak),
      snore: toNumberArray(pldData.snore),
      fflIndex: toNumberArray(pldData.fflIndex),
      therapyPressure: toNumberArray(pldData.therapyPressure),
      respiratoryRate: toNumberArray(pldData.respiratoryRate),
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
    console.warn('[pld-trace-idb] store failed:', err);
  }
}

/**
 * Load a PLD trace from IndexedDB.
 * Returns null if not found, expired, or engine version mismatch.
 */
export async function loadPLDTrace(
  dateStr: string
): Promise<StoredPLDTrace | null> {
  try {
    const result = await runTx<StoredPLDTrace | undefined>(
      STORE_NAME,
      'readonly',
      (tx) => tx.objectStore(STORE_NAME).get(dateStr),
    );

    if (!result) {
      return null;
    }

    // Engine version mismatch -> stale data
    if (result.engineVersion !== ENGINE_VERSION) {
      deletePLDTrace(dateStr).catch(() => { /* fire-and-forget stale IDB cleanup */ });
      return null;
    }

    // TTL check
    if (Date.now() - result.storedAt > TTL_MS) {
      deletePLDTrace(dateStr).catch(() => { /* fire-and-forget expired IDB cleanup */ });
      return null;
    }

    return result;
  } catch {
    // IndexedDB unavailable (private browsing, etc.) — non-fatal
    return null;
  }
}

/**
 * Delete a specific PLD trace from IndexedDB.
 */
async function deletePLDTrace(dateStr: string): Promise<void> {
  try {
    await runTx(STORE_NAME, 'readwrite', (tx) =>
      tx.objectStore(STORE_NAME).delete(dateStr),
    );
  } catch {
    // Non-fatal — best-effort cleanup
  }
}
