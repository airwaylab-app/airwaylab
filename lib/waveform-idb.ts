// ============================================================
// AirwayLab — IndexedDB Waveform Storage
// Stores full-resolution Float32Array data for instant reload.
// ============================================================

import type { StoredWaveform } from './waveform-types';
import { ENGINE_VERSION } from './engine-version';

const DB_NAME = 'airwaylab';
const STORE_NAME = 'waveforms';
const OXIMETRY_STORE_NAME = 'oximetry-traces';
const BREATH_DATA_STORE_NAME = 'breath-data';
const PLD_TRACES_STORE_NAME = 'pld-traces';
const DB_VERSION = 3;
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
      if (!db.objectStoreNames.contains(BREATH_DATA_STORE_NAME)) {
        db.createObjectStore(BREATH_DATA_STORE_NAME, { keyPath: 'dateStr' });
      }
      if (!db.objectStoreNames.contains(PLD_TRACES_STORE_NAME)) {
        db.createObjectStore(PLD_TRACES_STORE_NAME, { keyPath: 'dateStr' });
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
    // IndexedDB failures are non-fatal — fall back to in-memory.
    // Expected in private browsing, strict privacy modes, or quota exceeded.
    console.warn('[waveform-idb] store failed:', err);
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
    // IndexedDB unavailable (private browsing, etc.) — non-fatal
    return null;
  }
}

/**
 * Delete a specific waveform from IndexedDB.
 */
async function deleteWaveform(dateStr: string): Promise<void> {
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

/**
 * Delete expired entries from a single object store.
 * Entries are expired if they exceed the TTL or have a mismatched engine version.
 */
async function deleteExpiredFromStore(storeName: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const entry = cursor.value as { storedAt: number; engineVersion: string };
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
}

/**
 * Delete all expired entries across all object stores.
 */
export async function deleteExpired(): Promise<void> {
  try {
    await deleteExpiredFromStore(STORE_NAME);
    await deleteExpiredFromStore(OXIMETRY_STORE_NAME);
    await deleteExpiredFromStore(BREATH_DATA_STORE_NAME);
    await deleteExpiredFromStore(PLD_TRACES_STORE_NAME);
  } catch {
    // Non-fatal — best-effort cleanup
  }
}

