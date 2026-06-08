// ============================================================
// AirwayLab — IndexedDB Core
// Single shared connection, serialized transactions, and quota
// guards for all four IDB stores (waveforms, oximetry-traces,
// breath-data, pld-traces).
//
// Why this module exists (verified failure modes it fixes):
//  - I1: store.put() request errors + tx.onabort were unwired, so a
//        QuotaExceededError aborted the txn but the promise hung or
//        swallowed silently -> PHI was not saved and nobody knew.
//  - I2: every op opened its own connection and closed it per-op, so
//        transactions across stores interleaved (stale reads / racing
//        writes). We now memoize ONE connection and never close per-op.
//  - I3: stale-expiry deletes were fire-and-forget and could delete a
//        freshly-written record for the same dateStr. All ops now run
//        through one serialized queue, so an expiry delete enqueues
//        behind any pending write.
//  - I4: OOM from oversized structured clones. assertQuota() is applied
//        uniformly to every write, including storeWaveform (the biggest
//        payload, which previously had no guard at all).
//  - I6: openDB could hang silently on the next DB_VERSION bump. We wire
//        request.onblocked and db.onversionchange so a stale connection
//        closes instead of blocking the upgrade forever.
//
// The DB name / version / schema live in waveform-idb.ts and are imported
// here unchanged — this module must NOT force a version bump.
// ============================================================

import {
  DB_NAME,
  DB_VERSION,
  WAVEFORM_STORE_NAME,
  OXIMETRY_STORE_NAME,
  BREATH_DATA_STORE_NAME,
  PLD_TRACES_STORE_NAME,
  DASHBOARD_SUMMARY_STORE_NAME,
  upgradeSchema,
} from './waveform-idb';

/**
 * Typed quota failure. Thrown/rejected when a write would exceed the
 * estimated storage headroom, or when the browser aborts a write txn
 * with QuotaExceededError. Callers can detect it with `isQuotaError()`
 * instead of silently swallowing a failed PHI write.
 */
export class QuotaError extends Error {
  readonly estimatedBytes?: number;
  readonly availableBytes?: number;
  constructor(message: string, opts?: { estimatedBytes?: number; availableBytes?: number; cause?: unknown }) {
    super(message);
    this.name = 'QuotaError';
    this.estimatedBytes = opts?.estimatedBytes;
    this.availableBytes = opts?.availableBytes;
    if (opts?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = opts.cause;
    }
  }
}

/** True for our typed QuotaError and for a native DOMException QuotaExceededError. */
export function isQuotaError(err: unknown): boolean {
  return (
    err instanceof QuotaError ||
    (err instanceof DOMException && err.name === 'QuotaExceededError')
  );
}

// ── Single memoized connection ──────────────────────────────────────
// One connection for the whole tab. We never close it per-op (I2).
// If a newer-version connection is opened elsewhere, onversionchange
// closes ours so the upgrade is not blocked (I6).

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      dbPromise = null;
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      upgradeSchema(request.result);
    };

    // I6: a prior connection in another tab is blocking the upgrade.
    // Surface it instead of hanging silently.
    request.onblocked = () => {
      console.warn('[idb-core] openDB blocked — another connection is holding an older version open');
    };

    request.onsuccess = () => {
      const db = request.result;
      // I6: if another tab requests a version upgrade, close ours so we
      // do not block it. Drop the memo so the next op re-opens cleanly.
      db.onversionchange = () => {
        db.close();
        if (dbPromise) dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error);
    };
  });

  return dbPromise;
}

// ── Serialized op queue ─────────────────────────────────────────────
// One global promise chain. Every read, write, and expiry-delete runs
// strictly after the previous op settles, so transactions never
// interleave (I2) and an expiry delete cannot race a fresh write for the
// same key (I3). A failed op does not break the chain for the next op.

let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  // Keep the chain alive regardless of this op's outcome.
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

/**
 * Run a transaction with ALL completion paths wired:
 *  - tx.oncomplete  -> resolve
 *  - tx.onerror     -> reject(tx.error)
 *  - tx.onabort     -> reject(tx.error)   (I1: was unwired)
 * For writes, also attach onerror to each IDBRequest the body returns, so
 * a QuotaExceededError on put() rejects with a typed QuotaError instead of
 * hanging (I1). Reads resolve with the request result.
 *
 * The body runs inside the serialized queue (I2/I3). Pass the request(s)
 * created in `fn` back via the return value so they get error-wired; the
 * resolved value is the last request's result (handy for get()).
 */
export function runTx<T = void>(
  storeNames: string | string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => IDBRequest | IDBRequest[] | void,
): Promise<T> {
  return enqueue(
    () =>
      new Promise<T>((resolve, reject) => {
        getDB().then((db) => {
          let settled = false;
          const fail = (err: unknown) => {
            if (settled) return;
            settled = true;
            reject(err);
          };

          let tx: IDBTransaction;
          try {
            tx = db.transaction(storeNames, mode);
          } catch (err) {
            fail(err);
            return;
          }

          let lastRequest: IDBRequest | undefined;
          try {
            const requests = fn(tx);
            const list = Array.isArray(requests) ? requests : requests ? [requests] : [];
            for (const req of list) {
              lastRequest = req;
              // I1: wire per-request errors. QuotaExceededError lands here
              // (and also aborts the txn) — translate it to a typed reject.
              req.onerror = () => {
                const err = req.error;
                if (err && err.name === 'QuotaExceededError') {
                  fail(new QuotaError('IndexedDB quota exceeded during write', { cause: err }));
                } else {
                  fail(err ?? new Error('IndexedDB request failed'));
                }
              };
            }
          } catch (err) {
            fail(err);
            return;
          }

          tx.oncomplete = () => {
            if (settled) return;
            settled = true;
            resolve((lastRequest ? lastRequest.result : undefined) as T);
          };
          // I1: onerror AND onabort both reject. A quota abort with no
          // request-level error still surfaces here as a typed QuotaError.
          tx.onerror = () => {
            const err = tx.error;
            if (err && err.name === 'QuotaExceededError') {
              fail(new QuotaError('IndexedDB quota exceeded (transaction aborted)', { cause: err }));
            } else {
              fail(err ?? new Error('IndexedDB transaction error'));
            }
          };
          tx.onabort = () => {
            const err = tx.error;
            if (err && err.name === 'QuotaExceededError') {
              fail(new QuotaError('IndexedDB quota exceeded (transaction aborted)', { cause: err }));
            } else {
              fail(err ?? new Error('IndexedDB transaction aborted'));
            }
          };
        }, reject);
      }),
  );
}

// ── Quota guard ─────────────────────────────────────────────────────
// I4: applied uniformly to EVERY write, including storeWaveform. Uses the
// real Storage Manager estimate when available; if the estimate is
// unavailable (older browsers, no permission) we do not block the write —
// the runTx quota handling above is the backstop.

/** Keep this much headroom free after the write so we never fill to the brim. */
const QUOTA_HEADROOM_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Reject (throw) with a typed QuotaError if `estimatedBytes` would not fit
 * within the available storage headroom. No-op when the estimate API is
 * unavailable — runTx's QuotaExceededError handling is the backstop there.
 */
export async function assertQuota(estimatedBytes: number): Promise<void> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== 'function'
  ) {
    return;
  }

  let estimate: StorageEstimate;
  try {
    estimate = await navigator.storage.estimate();
  } catch {
    // Estimate unavailable — let the write proceed; runTx is the backstop.
    return;
  }

  const quota = estimate.quota;
  const usage = estimate.usage;
  if (typeof quota !== 'number' || typeof usage !== 'number') return;

  const available = quota - usage;
  if (estimatedBytes + QUOTA_HEADROOM_BYTES > available) {
    throw new QuotaError(
      `IndexedDB write would exceed storage headroom (need ~${estimatedBytes} bytes, ~${available} available)`,
      { estimatedBytes, availableBytes: available },
    );
  }
}

// Re-export store names so callers can pass them to runTx without
// re-declaring the literals.
export {
  WAVEFORM_STORE_NAME,
  OXIMETRY_STORE_NAME,
  BREATH_DATA_STORE_NAME,
  PLD_TRACES_STORE_NAME,
  DASHBOARD_SUMMARY_STORE_NAME,
};
