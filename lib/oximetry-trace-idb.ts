// ============================================================
// AirwayLab — IndexedDB Oximetry Trace Storage
// Persists downsampled OximetryTraceData for instant reload.
// Mirrors the waveform-idb pattern: 90-day TTL, engine version
// invalidation, non-fatal on failure.
// ============================================================

import type { OximetryTraceData } from './types';
import { openDB } from './waveform-idb';
import { ENGINE_VERSION } from './engine-version';

const STORE_NAME = 'oximetry-traces';
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

interface StoredOximetryTrace extends OximetryTraceData {
  dateStr: string;
  storedAt: number;
  engineVersion: string;
}

/**
 * Store an oximetry trace in IndexedDB.
 * Overwrites any existing entry for the same date.
 */
export async function storeOximetryTrace(
  dateStr: string,
  trace: OximetryTraceData
): Promise<void> {
  try {
    const db = await openDB();
    const stored: StoredOximetryTrace = {
      dateStr,
      ...trace,
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
  // eslint-disable-next-line airwaylab/no-silent-catch -- IDB store is non-fatal; callers fall back to in-memory. Expected in private browsing.
  } catch (err) {
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
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(dateStr);

      request.onsuccess = () => {
        db.close();
        const result = request.result as StoredOximetryTrace | undefined;

        if (!result) {
          resolve(null);
          return;
        }

        // Engine version mismatch → stale data
        if (result.engineVersion !== ENGINE_VERSION) {
          deleteOximetryTrace(dateStr).catch(() => { /* fire-and-forget stale IDB cleanup */ });
          resolve(null);
          return;
        }

        // TTL check
        if (Date.now() - result.storedAt > TTL_MS) {
          deleteOximetryTrace(dateStr).catch(() => { /* fire-and-forget expired IDB cleanup */ });
          resolve(null);
          return;
        }

        resolve({
          trace: result.trace,
          durationSeconds: result.durationSeconds,
          odi3Events: result.odi3Events,
          odi4Events: result.odi4Events,
        });
      };

      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
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
    // Non-fatal — best-effort cleanup
  }
}

