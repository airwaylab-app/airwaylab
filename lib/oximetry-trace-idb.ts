// ============================================================
// AirwayLab — IndexedDB Oximetry Trace Storage
// Persists downsampled OximetryTraceData for instant reload.
// Mirrors the waveform-idb pattern: 90-day TTL, engine version
// invalidation, non-fatal on failure.
// ============================================================

import type { OximetryTraceData } from './types';
import { openDB } from './waveform-idb';
import { ENGINE_VERSION } from './engine-version';
import * as Sentry from '@sentry/nextjs';

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
  } catch (err) {
    console.error('[oximetry-trace-idb] store failed:', err);
    Sentry.captureMessage('IndexedDB oximetry trace store failed', {
      level: 'warning',
      tags: { module: 'oximetry-trace-idb' },
      extra: { error: String(err) },
    });
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
          deleteOximetryTrace(dateStr).catch(() => {});
          resolve(null);
          return;
        }

        // TTL check
        if (Date.now() - result.storedAt > TTL_MS) {
          deleteOximetryTrace(dateStr).catch(() => {});
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
    Sentry.captureMessage('IndexedDB oximetry trace load unavailable', {
      level: 'warning',
      tags: { module: 'oximetry-trace-idb' },
    });
    return null;
  }
}

/**
 * Delete a specific oximetry trace from IndexedDB.
 */
export async function deleteOximetryTrace(dateStr: string): Promise<void> {
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
    Sentry.captureMessage('IndexedDB oximetry trace delete failed', {
      level: 'warning',
      tags: { module: 'oximetry-trace-idb' },
    });
  }
}

/**
 * Delete all expired or stale oximetry traces.
 */
export async function deleteExpiredOximetryTraces(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const entry = cursor.value as StoredOximetryTrace;
          if (
            Date.now() - entry.storedAt > TTL_MS ||
            entry.engineVersion !== ENGINE_VERSION
          ) {
            cursor.delete();
          }
          cursor.continue();
        }
      };

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
    Sentry.captureMessage('IndexedDB oximetry trace cleanup failed', {
      level: 'warning',
      tags: { module: 'oximetry-trace-idb' },
    });
  }
}
