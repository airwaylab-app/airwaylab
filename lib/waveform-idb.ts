// ============================================================
// AirwayLab — IndexedDB Waveform Storage
// Stores full-resolution Float32Array data for instant reload.
//
// Owns the canonical DB name / version / schema for ALL four stores.
// Transaction wiring, the single shared connection, the serialized op
// queue, and quota guards live in ./idb-core (see that file for the
// failure modes this split fixes: I1 abort/quota, I2 serialization,
// I3 expiry-vs-write race, I4 OOM, I6 blocked-upgrade).
// ============================================================

import type { StoredWaveform } from './waveform-types';
import { ENGINE_VERSION } from './engine-version';
import {
  getDB,
  runTx,
  assertQuota,
  isQuotaError,
} from './idb-core';

export const DB_NAME = 'airwaylab';
export const WAVEFORM_STORE_NAME = 'waveforms';
export const OXIMETRY_STORE_NAME = 'oximetry-traces';
export const BREATH_DATA_STORE_NAME = 'breath-data';
export const PLD_TRACES_STORE_NAME = 'pld-traces';
export const DB_VERSION = 3;

// Local alias kept for readability in this file's store ops.
const STORE_NAME = WAVEFORM_STORE_NAME;
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// I4: storeWaveform is the biggest payload and previously had NO size
// guard. Estimate bytes from the raw Float32Arrays (4 bytes/sample) plus a
// small fixed overhead for events/stats/metadata, then assertQuota() it
// like every other store.
const WAVEFORM_METADATA_OVERHEAD_BYTES = 64 * 1024; // 64 KB slack for events/stats/arrays

function estimateWaveformBytes(waveform: StoredWaveform): number {
  const flowBytes = waveform.flow.length * 4;
  const pressureBytes = waveform.pressure ? waveform.pressure.length * 4 : 0;
  return flowBytes + pressureBytes + WAVEFORM_METADATA_OVERHEAD_BYTES;
}

/**
 * Apply the DB schema during onupgradeneeded.
 * Called by idb-core's getDB(). Keeping the schema here (not in idb-core)
 * preserves the single source of truth for store names + DB_VERSION.
 * Do NOT change store names or bump DB_VERSION without a migration.
 */
export function upgradeSchema(db: IDBDatabase): void {
  if (!db.objectStoreNames.contains(WAVEFORM_STORE_NAME)) {
    db.createObjectStore(WAVEFORM_STORE_NAME, { keyPath: 'dateStr' });
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
}

/**
 * Open (or get) the shared IndexedDB connection.
 * Backward-compatible re-export of idb-core's getDB() so older imports keep
 * working. Connection is memoized; do NOT close it per-op.
 */
export function openDB(): Promise<IDBDatabase> {
  return getDB();
}

/**
 * Store a waveform in IndexedDB.
 * Overwrites any existing entry for the same date.
 * Quota failures reject with a typed QuotaError (see idb-core) so the caller
 * knows the PHI was not persisted instead of it being silently swallowed.
 */
export async function storeWaveform(waveform: StoredWaveform): Promise<void> {
  try {
    await assertQuota(estimateWaveformBytes(waveform)); // I4
    await runTx(STORE_NAME, 'readwrite', (tx) =>
      tx.objectStore(STORE_NAME).put(waveform),
    );
  } catch (err) {
    // I1: surface quota failures to the caller (PHI was not saved).
    if (isQuotaError(err)) throw err;
    // Other failures (private browsing, IDB unavailable) stay non-fatal;
    // callers fall back to in-memory.
    console.warn('[waveform-idb] store failed:', err);
  }
}

/**
 * Load a waveform from IndexedDB.
 * Returns null if not found, expired, or engine version mismatch.
 */
export async function loadWaveform(dateStr: string): Promise<StoredWaveform | null> {
  try {
    const result = await runTx<StoredWaveform | undefined>(
      STORE_NAME,
      'readonly',
      (tx) => tx.objectStore(STORE_NAME).get(dateStr),
    );

    if (!result) {
      return null;
    }

    // Engine version mismatch → stale data
    if (result.engineVersion !== ENGINE_VERSION) {
      deleteWaveform(dateStr).catch(() => { /* fire-and-forget stale IDB cleanup */ });
      return null;
    }

    // TTL check
    if (Date.now() - result.storedAt > TTL_MS) {
      deleteWaveform(dateStr).catch(() => { /* fire-and-forget expired IDB cleanup */ });
      return null;
    }

    return result;
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
    await runTx(STORE_NAME, 'readwrite', (tx) =>
      tx.objectStore(STORE_NAME).delete(dateStr),
    );
  } catch {
    // Non-fatal — best-effort cleanup
  }
}

/**
 * Delete expired entries from a single object store.
 * Entries are expired if they exceed the TTL or have a mismatched engine version.
 * Runs through the serialized queue, so it enqueues behind any pending write
 * for the same key (I3 — no longer deletes a freshly-written record).
 */
async function deleteExpiredFromStore(storeName: string): Promise<void> {
  await runTx(storeName, 'readwrite', (tx) => {
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
    // runTx wires this request's onerror and the txn completion paths;
    // the cursor walk drives itself via onsuccess above.
    return request;
  });
}

/**
 * Delete all expired entries across all object stores.
 */
export async function deleteExpired(): Promise<void> {
  try {
    await deleteExpiredFromStore(WAVEFORM_STORE_NAME);
    await deleteExpiredFromStore(OXIMETRY_STORE_NAME);
    await deleteExpiredFromStore(BREATH_DATA_STORE_NAME);
    await deleteExpiredFromStore(PLD_TRACES_STORE_NAME);
  } catch {
    // Non-fatal — best-effort cleanup
  }
}
