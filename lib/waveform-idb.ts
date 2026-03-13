// ============================================================
// AirwayLab — IndexedDB Waveform Storage
// Stores full-resolution Float32Array data for instant reload.
// ============================================================

import type { StoredWaveform } from './waveform-types';
import { ENGINE_VERSION } from './engine-version';
import * as Sentry from '@sentry/nextjs';

const DB_NAME = 'airwaylab';
const STORE_NAME = 'waveforms';
const OXIMETRY_STORE_NAME = 'oximetry-traces';
const DB_VERSION = 2;
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Open (or create) the IndexedDB database.
 * Exported so oximetry-trace-idb.ts can share the same DB connection.
 */
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'dateStr' });
      }
      if (!db.objectStoreNames.contains(OXIMETRY_STORE_NAME)) {
        db.createObjectStore(OXIMETRY_STORE_NAME, { keyPath: 'dateStr' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Store a waveform in IndexedDB.
 * Overwrites any existing entry for the same date.
 */
export async function storeWaveform(waveform: StoredWaveform): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(waveform);
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
    // IndexedDB failures are non-fatal — fall back to in-memory
    console.error('[waveform-idb] store failed:', err);
    Sentry.captureMessage('IndexedDB store failed', {
      level: 'warning',
      tags: { module: 'waveform-idb' },
      extra: { error: String(err) },
    });
  }
}

/**
 * Load a waveform from IndexedDB.
 * Returns null if not found, expired, or engine version mismatch.
 */
export async function loadWaveform(dateStr: string): Promise<StoredWaveform | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(dateStr);

      request.onsuccess = () => {
        db.close();
        const result = request.result as StoredWaveform | undefined;

        if (!result) {
          resolve(null);
          return;
        }

        // Engine version mismatch → stale data
        if (result.engineVersion !== ENGINE_VERSION) {
          deleteWaveform(dateStr).catch(() => {});
          resolve(null);
          return;
        }

        // TTL check
        if (Date.now() - result.storedAt > TTL_MS) {
          deleteWaveform(dateStr).catch(() => {});
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
    // IndexedDB unavailable (private browsing, etc.)
    Sentry.captureMessage('IndexedDB load unavailable', {
      level: 'warning',
      tags: { module: 'waveform-idb' },
    });
    return null;
  }
}

/**
 * Delete a specific waveform from IndexedDB.
 */
export async function deleteWaveform(dateStr: string): Promise<void> {
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
    // Non-fatal
    Sentry.captureMessage('IndexedDB delete failed', {
      level: 'warning',
      tags: { module: 'waveform-idb' },
    });
  }
}

/**
 * Delete all expired waveforms.
 */
export async function deleteExpired(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const entry = cursor.value as StoredWaveform;
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
    // Non-fatal
    Sentry.captureMessage('IndexedDB cleanup failed', {
      level: 'warning',
      tags: { module: 'waveform-idb' },
    });
  }
}

/**
 * Clear all stored waveforms and oximetry traces.
 */
export async function clearAll(): Promise<void> {
  try {
    const db = await openDB();
    const storeNames = [STORE_NAME, OXIMETRY_STORE_NAME].filter(
      (name) => db.objectStoreNames.contains(name)
    );
    if (storeNames.length === 0) {
      db.close();
      return;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeNames, 'readwrite');
      for (const name of storeNames) {
        tx.objectStore(name).clear();
      }
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
    // Non-fatal
    Sentry.captureMessage('IndexedDB clearAll failed', {
      level: 'warning',
      tags: { module: 'waveform-idb' },
    });
  }
}
