// ============================================================
// AirwayLab — IndexedDB Waveform Storage
// Stores full-resolution Float32Array data for instant reload.
// ============================================================

import type { StoredWaveform } from './waveform-types';
import { ENGINE_VERSION } from './engine-version';

const DB_NAME = 'airwaylab';
const STORE_NAME = 'waveforms';
const DB_VERSION = 1;
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

/**
 * Open (or create) the IndexedDB database.
 */
function openDB(): Promise<IDBDatabase> {
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
  }
}

/**
 * Clear all stored waveforms.
 */
export async function clearAll(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.clear();
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
  }
}
