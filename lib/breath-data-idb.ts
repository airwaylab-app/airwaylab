// ============================================================
// AirwayLab — IndexedDB Per-Breath Data Storage
// Persists compact per-breath NED metrics for instant reload.
// Mirrors the oximetry-trace-idb pattern: 90-day TTL, engine
// version invalidation, non-fatal on failure.
// ============================================================

import type { Breath } from './types';
import { openDB } from './waveform-idb';
import { ENGINE_VERSION } from './engine-version';
import * as Sentry from '@sentry/nextjs';

const STORE_NAME = 'breath-data';
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

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
 */
export async function storeBreathData(
  dateStr: string,
  breaths: Breath[],
  samplingRate: number
): Promise<void> {
  try {
    const db = await openDB();
    const stored: StoredBreathData = {
      dateStr,
      breaths: toCompactBreaths(breaths, samplingRate),
      breathCount: breaths.length,
      samplingRate,
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
    console.error('[breath-data-idb] store failed:', err);
    Sentry.captureMessage('IndexedDB breath data store failed', {
      level: 'warning',
      tags: { module: 'breath-data-idb' },
      extra: { error: String(err) },
    });
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
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(dateStr);

      request.onsuccess = () => {
        db.close();
        const result = request.result as StoredBreathData | undefined;

        if (!result) {
          resolve(null);
          return;
        }

        // Engine version mismatch -> stale data
        if (result.engineVersion !== ENGINE_VERSION) {
          deleteBreathData(dateStr).catch(() => {});
          resolve(null);
          return;
        }

        // TTL check
        if (Date.now() - result.storedAt > TTL_MS) {
          deleteBreathData(dateStr).catch(() => {});
          resolve(null);
          return;
        }

        resolve(result.breaths);
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch {
    Sentry.captureMessage('IndexedDB breath data load unavailable', {
      level: 'warning',
      tags: { module: 'breath-data-idb' },
    });
    return null;
  }
}

/**
 * Delete a specific breath data entry from IndexedDB.
 */
async function deleteBreathData(dateStr: string): Promise<void> {
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
    Sentry.captureMessage('IndexedDB breath data delete failed', {
      level: 'warning',
      tags: { module: 'breath-data-idb' },
    });
  }
}
