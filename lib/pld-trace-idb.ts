// ============================================================
// AirwayLab — IndexedDB PLD Timeseries Storage
// Persists PLD (Pressure/Leak/Detail) channel traces for instant
// reload. Stores the 5 most valuable channels as number arrays.
// Mirrors the oximetry-trace-idb pattern: 90-day TTL, engine
// version invalidation, non-fatal on failure.
// ============================================================

import { openDB } from './waveform-idb';
import { ENGINE_VERSION } from './engine-version';
import * as Sentry from '@sentry/nextjs';

const STORE_NAME = 'pld-traces';
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

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
 */
export async function storePLDTrace(
  dateStr: string,
  pldData: PLDTraceInput
): Promise<void> {
  try {
    const db = await openDB();
    const sampleCount = pldData.leak?.length
      ?? pldData.snore?.length
      ?? pldData.fflIndex?.length
      ?? pldData.therapyPressure?.length
      ?? pldData.respiratoryRate?.length
      ?? 0;

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
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(stored);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch (err) {
    console.error('[pld-trace-idb] store failed:', err);
    Sentry.captureMessage('IndexedDB PLD trace store failed', {
      level: 'warning',
      tags: { module: 'pld-trace-idb' },
      extra: { error: String(err) },
    });
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
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(dateStr);

      request.onsuccess = () => {
        db.close();
        const result = request.result as StoredPLDTrace | undefined;

        if (!result) {
          resolve(null);
          return;
        }

        // Engine version mismatch -> stale data
        if (result.engineVersion !== ENGINE_VERSION) {
          deletePLDTrace(dateStr).catch(() => {});
          resolve(null);
          return;
        }

        // TTL check
        if (Date.now() - result.storedAt > TTL_MS) {
          deletePLDTrace(dateStr).catch(() => {});
          resolve(null);
          return;
        }

        resolve(result);
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    Sentry.captureMessage('IndexedDB PLD trace load unavailable', {
      level: 'warning',
      tags: { module: 'pld-trace-idb' },
    });
    return null;
  }
}

/**
 * Delete a specific PLD trace from IndexedDB.
 */
async function deletePLDTrace(dateStr: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(dateStr);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  } catch {
    Sentry.captureMessage('IndexedDB PLD trace delete failed', {
      level: 'warning',
      tags: { module: 'pld-trace-idb' },
    });
  }
}
