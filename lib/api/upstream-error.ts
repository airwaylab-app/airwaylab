import { NextResponse } from 'next/server';

// ============================================================
// AirwayLab — Upstream error mapping
// Classifies errors thrown by upstream dependencies (Supabase
// Storage) into the right HTTP status so clients retry instead
// of treating a transient outage as a fatal 500.
// ============================================================

/**
 * Supabase Storage surfaces failures as `StorageApiError` (carries a numeric
 * `status` + `__isStorageError`) or `StorageUnknownError` (network failure, no
 * status). A 5xx from Storage — or a network-level failure — is transient and
 * upstream, NOT a bug in this service, so it maps to 503 + Retry-After and the
 * client backs off and retries. Anything else (DB constraint violations, our
 * own bugs) stays 500.
 *
 * Duck-typed on the error shape rather than `instanceof` so it stays correct
 * across @supabase/storage-js minor versions and bundler boundaries.
 */
export interface UpstreamErrorClass {
  status: 503 | 500;
  /** Seconds to advise the client to wait before retrying (503 only). */
  retryAfterSeconds?: number;
}

const RETRY_AFTER_SECONDS = 5;

export function classifyUpstreamError(err: unknown): UpstreamErrorClass {
  if (err && typeof err === 'object') {
    const e = err as {
      name?: unknown;
      status?: unknown;
      statusCode?: unknown;
      __isStorageError?: unknown;
    };
    const isStorage =
      e.__isStorageError === true ||
      (typeof e.name === 'string' && e.name.startsWith('Storage'));
    if (isStorage) {
      // Network-level / unknown storage failure has no HTTP status — transient.
      if (e.name === 'StorageUnknownError' || e.name === 'StorageVectorsUnknownError') {
        return { status: 503, retryAfterSeconds: RETRY_AFTER_SECONDS };
      }
      const status =
        typeof e.status === 'number'
          ? e.status
          : typeof e.statusCode === 'string'
            ? Number(e.statusCode)
            : NaN;
      if (Number.isFinite(status) && status >= 500 && status <= 599) {
        return { status: 503, retryAfterSeconds: RETRY_AFTER_SECONDS };
      }
    }
  }
  return { status: 500 };
}

/**
 * Build the JSON error response for an upstream failure: a transient Storage
 * 5xx becomes 503 + Retry-After, everything else 500.
 */
export function upstreamErrorResponse(
  err: unknown,
  messages: { retryable: string; fatal: string }
): NextResponse {
  const mapped = classifyUpstreamError(err);
  if (mapped.status === 503) {
    return NextResponse.json(
      { error: messages.retryable },
      {
        status: 503,
        headers: { 'Retry-After': String(mapped.retryAfterSeconds ?? RETRY_AFTER_SECONDS) },
      }
    );
  }
  return NextResponse.json({ error: messages.fatal }, { status: 500 });
}
