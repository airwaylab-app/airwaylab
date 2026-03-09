// ============================================================
// AirwayLab — IndexedDB Raw Flow Store
// Persists raw flow waveforms per-night so they survive page
// reloads and are available for:
//   1. Future AI model reprocessing / metric recalculation
//   2. Live data scrolling (upcoming feature)
//
// Uses IndexedDB instead of localStorage because flow data is
// binary (Float32Array) and can be tens of MB across many nights.
// ============================================================

import type { RawNightFlowData, RawFlowSession } from './types';

const DB_NAME = 'airwaylab_flow';
const DB_VERSION = 1;
const STORE_NAME = 'raw_flow';
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

// ── Database lifecycle ────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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

// ── Serialisation helpers ─────────────────────────────────────
// IndexedDB structured clone handles ArrayBuffer but not
// Float32Array views directly in all browsers. We convert to
// plain ArrayBuffer for storage and restore on read.

interface StoredFlowSession {
  filePath: string;
  samplingRate: number;
  durationSeconds: number;
  recordingDate: string;
  flowBuffer: ArrayBuffer;
  pressureBuffer: ArrayBuffer | null;
}

interface StoredNightFlowData {
  dateStr: string;
  sessions: StoredFlowSession[];
  savedAt: number;
}

function toStorable(data: RawNightFlowData): StoredNightFlowData {
  return {
    dateStr: data.dateStr,
    savedAt: data.savedAt,
    sessions: data.sessions.map((s): StoredFlowSession => ({
      filePath: s.filePath,
      samplingRate: s.samplingRate,
      durationSeconds: s.durationSeconds,
      recordingDate: s.recordingDate,
      flowBuffer: s.flowData.buffer.slice(
        s.flowData.byteOffset,
        s.flowData.byteOffset + s.flowData.byteLength
      ) as ArrayBuffer,
      pressureBuffer: s.pressureData
        ? s.pressureData.buffer.slice(
            s.pressureData.byteOffset,
            s.pressureData.byteOffset + s.pressureData.byteLength
          ) as ArrayBuffer
        : null,
    })),
  };
}

function fromStored(stored: StoredNightFlowData): RawNightFlowData {
  return {
    dateStr: stored.dateStr,
    savedAt: stored.savedAt,
    sessions: stored.sessions.map((s): RawFlowSession => ({
      filePath: s.filePath,
      samplingRate: s.samplingRate,
      durationSeconds: s.durationSeconds,
      recordingDate: s.recordingDate,
      flowData: new Float32Array(s.flowBuffer),
      pressureData: s.pressureBuffer ? new Float32Array(s.pressureBuffer) : null,
    })),
  };
}

// ── Public API ────────────────────────────────────────────────

/**
 * Save raw flow data for one or more nights.
 * Overwrites existing data for the same dateStr.
 */
export async function saveRawFlow(nights: RawNightFlowData[]): Promise<void> {
  if (nights.length === 0) return;

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  for (const night of nights) {
    store.put(toStorable(night));
  }

  return new Promise((resolve, reject) => {
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
 * Load raw flow data for specific nights by dateStr.
 */
export async function loadRawFlow(dateStrs: string[]): Promise<RawNightFlowData[]> {
  if (dateStrs.length === 0) return [];

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const results: RawNightFlowData[] = [];

  const promises = dateStrs.map(
    (dateStr) =>
      new Promise<void>((resolve) => {
        const req = store.get(dateStr);
        req.onsuccess = () => {
          if (req.result) {
            results.push(fromStored(req.result as StoredNightFlowData));
          }
          resolve();
        };
        req.onerror = () => resolve(); // Skip failures silently
      })
  );

  await Promise.all(promises);
  db.close();
  return results;
}

/**
 * List all stored night dateStrs.
 */
export async function listStoredNights(): Promise<string[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const req = store.getAllKeys();
    req.onsuccess = () => {
      db.close();
      resolve(req.result as string[]);
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/**
 * Delete raw flow data for specific nights.
 */
export async function deleteRawFlow(dateStrs: string[]): Promise<void> {
  if (dateStrs.length === 0) return;

  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  for (const dateStr of dateStrs) {
    store.delete(dateStr);
  }

  return new Promise((resolve, reject) => {
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
 * Remove all entries older than MAX_AGE_MS.
 * Call periodically (e.g. after analysis completes) to prevent unbounded growth.
 */
export async function pruneExpiredFlow(): Promise<number> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const cutoff = Date.now() - MAX_AGE_MS;
  let pruned = 0;

  return new Promise((resolve, reject) => {
    const cursor = store.openCursor();
    cursor.onsuccess = () => {
      const c = cursor.result;
      if (c) {
        const entry = c.value as StoredNightFlowData;
        if (entry.savedAt < cutoff) {
          c.delete();
          pruned++;
        }
        c.continue();
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve(pruned);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Clear all stored flow data.
 */
export async function clearAllRawFlow(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();

  return new Promise((resolve, reject) => {
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
