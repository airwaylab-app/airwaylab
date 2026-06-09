// ============================================================
// AirwayLab — Upload Orchestrator
// Manages background upload of SD card files to cloud storage.
// Handles hashing, dedup, presigned uploads, and progress.
//
// Hardening:
//   - Pre-flight check verifies auth + consent before bulk upload
//   - Fail-fast aborts after 3 consecutive identical errors
//   - Sentry captures systematic failures for remote diagnosis
// ============================================================

import * as Sentry from '@sentry/nextjs';
import { extractNightDate } from '@/lib/file-manifest';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import type { UploadState, UploadResult } from './types';
import type { WorkerMessage } from './hash-worker';
import { HashCache } from './hash-cache';
import { hasCloudSyncConsent } from '@/components/upload/cloud-sync-nudge';

type UploadListener = (state: UploadState) => void;

// Lowered from 10 to 4 after a single user's multi-month backlog at 10-wide
// overwhelmed Supabase Storage (502/504) and Vercel functions (5xx burst).
// 4 keeps bulk sync reliable and is the everyday governor at the source.
const CONCURRENCY = 4;
const RETRY_DELAY_MS = 2000;
/** Base delay for rate limit backoff (doubles each time) */
const RATE_LIMIT_BASE_DELAY_MS = 5000;
/** Maximum rate limit retries before giving up on a file */
const RATE_LIMIT_MAX_RETRIES = 4;
/** Maximum retries for transient 5xx errors (less aggressive than rate limits) */
const TRANSIENT_MAX_RETRIES = 3;
/** Abort after this many consecutive failures with the same error */
const FAIL_FAST_THRESHOLD = 3;
/** Hard ceiling on total wall-clock spent retrying a single file across all
 *  backoff attempts. Stops a slow-healing upstream from stalling the whole
 *  bulk sync on one file. */
const RETRY_WALL_CAP_MS = 120_000;
/** Single-wait ceiling so a large Retry-After can't park a file for minutes. */
const MAX_SINGLE_BACKOFF_MS = 60_000;
/** HTTP statuses that are transient/upstream and safe to retry with backoff. */
const TRANSIENT_RETRY_STATUSES = new Set([502, 503, 504, 520]);

/**
 * Check if an error message indicates a transient server error.
 * These are typically CDN/proxy-level failures that resolve on retry.
 * Message-based fallback used only when no typed HTTP status is available.
 */
export function isTransientServerError(errorMessage: string): boolean {
  return /\b(502|503|504|520)\b/.test(errorMessage);
}

/**
 * Parse a Retry-After header (delta-seconds or HTTP-date) into milliseconds.
 * Returns undefined when absent or unparseable.
 */
export function parseRetryAfterMs(value: string | null): number | undefined {
  if (!value) return undefined;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
  const when = Date.parse(value);
  if (!Number.isNaN(when)) return Math.max(0, when - Date.now());
  return undefined;
}

/** Read the HTTP status an upload error was tagged with, if any. */
function errorStatus(err: unknown): number | undefined {
  return err instanceof Error ? (err as Error & { httpStatus?: number }).httpStatus : undefined;
}

/** Read the Retry-After (ms) an upload error was tagged with, if any. */
function errorRetryAfterMs(err: unknown): number | undefined {
  return err instanceof Error ? (err as Error & { retryAfterMs?: number }).retryAfterMs : undefined;
}

/**
 * Whether an upload error is a transient/upstream server failure worth retrying.
 * Prefers the typed HTTP status the server set (robust); falls back to scanning
 * the message for a status code only when no status was tagged. Status-based
 * classification is the structural fix for the regex-over-free-text bug where a
 * 500-from-Storage slipped past the transient check.
 */
function isTransientServerErrorFor(err: unknown): boolean {
  const status = errorStatus(err);
  if (status !== undefined) return TRANSIENT_RETRY_STATUSES.has(status);
  const msg = err instanceof Error ? err.message : String(err);
  return isTransientServerError(msg);
}

/**
 * Error categories for top-level upload pipeline failures (cloud_upload_failed).
 * Distinct from cloud_upload_partial_failure which covers per-file failures
 * that are caught and retried within uploadFiles().
 */
export type UploadErrorCategory = 'auth' | 'consent' | 'hash_worker' | 'network' | 'unknown';

/**
 * Classify a top-level upload pipeline error for Sentry fingerprinting.
 * Enables grouping cloud_upload_failed events by failure type rather than
 * by raw error message, so each category surfaces as one actionable issue.
 */
export function classifyUploadError(error: string): UploadErrorCategory {
  if (/sign in again/i.test(error)) return 'auth';
  if (/not enabled|not available/i.test(error)) return 'consent';
  if (/hash (failed|worker)/i.test(error)) return 'hash_worker';
  if (/failed to fetch|networkerror|network timeout/i.test(error)) return 'network';
  return 'unknown';
}

/**
 * Determine Sentry severity level for partial upload failures.
 * Escalates to 'error' when all files failed OR more than 5 files failed,
 * so that Sentry alerts trigger before floods accumulate unnoticed.
 */
export function getPartialFailureLevel(uploaded: number, failed: number): 'error' | 'warning' {
  if (uploaded === 0 || failed > 5) return 'error';
  return 'warning';
}

/**
 * Split files into uploadable (size > 0) and empty.
 * 0-byte files are AirSense SD card placeholders (CSL.edf, sometimes STR.edf)
 * that have no upload value and would fail presign validation.
 */
export function filterUploadableFiles(files: File[]): { uploadable: File[]; emptyCount: number } {
  const uploadable = files.filter(f => f.size > 0);
  return { uploadable, emptyCount: files.length - uploadable.length };
}

function getFilePath(file: File): string {
  return (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

class UploadOrchestrator {
  private state: UploadState = {
    status: 'idle',
    progress: { current: 0, total: 0, bytesUploaded: 0, bytesTotal: 0, stage: 'hashing', skippedExisting: 0 },
    result: null,
    error: null,
  };
  private listeners = new Set<UploadListener>();
  private abortController: AbortController | null = null;
  private hashWorker: Worker | null = null;
  private beforeUnloadHandler: ((e: BeforeUnloadEvent) => void) | null = null;

  private guardPageExit(): void {
    if (typeof window === 'undefined' || this.beforeUnloadHandler) return;
    this.beforeUnloadHandler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  }

  private releasePageExit(): void {
    if (typeof window === 'undefined' || !this.beforeUnloadHandler) return;
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
    this.beforeUnloadHandler = null;
  }

  subscribe(listener: UploadListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): UploadState {
    return this.state;
  }

  private setState(patch: Partial<UploadState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach(l => l(this.state));
  }

  abort(): void {
    this.abortController?.abort();
    this.hashWorker?.terminate();
    this.hashWorker = null;
    this.releasePageExit();
    this.setState({ status: 'idle', error: 'Upload cancelled' });
  }

  /**
   * Pre-flight check: verify auth and storage consent before starting bulk upload.
   * Returns null if OK, or an error message if the pipeline will fail.
   */
  private async preflight(signal: AbortSignal): Promise<string | null> {
    try {
      const res = await fetch('/api/files/consent', {
        credentials: 'same-origin',
        signal,
      });

      if (res.status === 401) {
        return 'Cloud sync requires an active session. Please sign in again.';
      }
      if (res.status === 403) {
        return 'Cloud sync is not available. Please sign in again.';
      }
      if (!res.ok) {
        // Server error — don't block upload, the presign endpoint might still work
        console.error('[upload-orchestrator] preflight: consent check returned', res.status);
        return null;
      }

      const data = await res.json();
      if (!data.consent) {
        // Only auto-fix if user previously opted in via the UI (localStorage)
        // This covers the known bug where CloudSyncNudge set localStorage but not the DB
        if (hasCloudSyncConsent()) {
          const fixRes = await fetch('/api/files/consent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ consent: true }),
            signal,
          });
          if (!fixRes.ok) {
            return 'Could not enable cloud storage. Please try again or check Account Settings.';
          }
        } else {
          return 'Cloud sync is not enabled. Enable it from your dashboard to back up your files.';
        }
      }

      return null;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
      // Network error — don't block, let the upload attempt proceed
      console.error('[upload-orchestrator] preflight failed:', err);
      return null;
    }
  }

  /**
   * Upload files to cloud storage. Handles hashing, dedup, and upload.
   */
  async upload(files: File[]): Promise<UploadResult> {
    // Filter empty files before presigning — 0-byte SD card placeholder files (empty CSL.edf etc.) have no upload value
    const nonEmptyFiles = files.filter(f => f.size > 0);
    const emptyFileCount = files.length - nonEmptyFiles.length;

    if (nonEmptyFiles.length === 0) {
      return { uploaded: 0, skipped: emptyFileCount, failed: 0, errors: [] };
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;
    this.guardPageExit();

    const totalBytes = nonEmptyFiles.reduce((sum, f) => sum + f.size, 0);
    this.setState({
      status: 'hashing',
      progress: { current: 0, total: nonEmptyFiles.length, bytesUploaded: 0, bytesTotal: totalBytes, stage: 'hashing', skippedExisting: 0 },
      result: null,
      error: null,
    });

    try {
      // Step 0: Pre-flight check — verify auth + consent before hashing 900+ files
      const preflightError = await this.preflight(signal);
      if (preflightError) {
        throw new Error(preflightError);
      }
      if (signal.aborted) throw new Error('Cancelled');

      // Refresh session so auth token doesn't expire mid-batch
      const supabase = getSupabaseBrowser();
      if (supabase) {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          throw new Error('Cloud sync requires an active session. Please sign in again.');
        }
      }
      if (signal.aborted) throw new Error('Cancelled');

      // Step 1: Hash all files
      const fileHashes = await this.hashFiles(nonEmptyFiles, signal);
      if (signal.aborted) throw new Error('Cancelled');

      // Step 2: Check which files already exist
      this.setState({
        status: 'checking',
        progress: { ...this.state.progress, stage: 'checking' },
      });

      const existingHashes = await this.checkExisting(nonEmptyFiles, fileHashes, signal);
      if (signal.aborted) throw new Error('Cancelled');

      // Step 3: Upload new files
      const toUpload = nonEmptyFiles.filter((_, i) => !existingHashes.has(fileHashes[i]!));
      const skipped = nonEmptyFiles.length - toUpload.length;

      this.setState({
        status: 'uploading',
        progress: {
          current: 0,
          total: toUpload.length,
          bytesUploaded: 0,
          bytesTotal: toUpload.reduce((sum, f) => sum + f.size, 0),
          stage: 'uploading',
          skippedExisting: skipped,
        },
      });

      const result = await this.uploadFiles(toUpload, fileHashes, nonEmptyFiles, signal);
      result.skipped = skipped + emptyFileCount;

      // Report systematic failures to Sentry
      if (result.failed > 0) {
        this.reportFailures(result, nonEmptyFiles.length);
      }

      this.releasePageExit();
      this.setState({
        status: 'complete',
        progress: { ...this.state.progress, stage: 'complete' },
        result,
      });

      return result;
    } catch (err) {
      this.releasePageExit();
      const error = err instanceof Error ? err.message : String(err);
      if (error !== 'Cancelled') {
        const errorCategory = classifyUploadError(error);
        console.error('[upload-orchestrator] Upload failed:', error);
        Sentry.captureMessage('cloud_upload_failed', {
          level: 'error',
          fingerprint: ['cloud_upload_failed', errorCategory],
          tags: { stage: this.state.status, errorCategory },
          extra: { error, fileCount: nonEmptyFiles.length },
        });
      }
      this.setState({ status: 'error', error });
      return { uploaded: 0, skipped: emptyFileCount, failed: nonEmptyFiles.length, errors: [error] };
    }
  }

  /**
   * Report upload failures to Sentry with error breakdown.
   */
  private reportFailures(result: UploadResult, totalFiles: number): void {
    // Deduplicate errors to find patterns
    const errorCounts = new Map<string, number>();
    for (const err of result.errors) {
      // Strip file-specific prefix to group by error type
      const normalized = err.replace(/^[^:]+:\s*/, '');
      errorCounts.set(normalized, (errorCounts.get(normalized) ?? 0) + 1);
    }

    const topErrors = Array.from(errorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Tag as transient if ALL failures were 5xx server errors
    const allTransient = result.errors.length > 0 && result.errors.every(
      (err) => /\b(500|502|503|504|520)\b/.test(err)
    );

    // Identify the dominant failing step so each Sentry event pinpoints the root cause
    const normalizedErrors = result.errors.map(e => e.replace(/^[^:]+:\s*/, ''));
    const stepCounts: Record<string, number> = {
      confirm_missing: normalizedErrors.filter(e => e.includes('file missing from storage')).length,
      put_failed: normalizedErrors.filter(e => /^Upload failed:/.test(e)).length,
      presign_failed: normalizedErrors.filter(e => /^Presign failed:/.test(e)).length,
      rate_limited: normalizedErrors.filter(e => /Rate limited after retries/.test(e)).length,
      transient_exhausted: normalizedErrors.filter(e => /Transient server error/.test(e)).length,
    };
    const dominantStep = Object.entries(stepCounts)
      .sort((a, b) => b[1] - a[1])
      .find(([, count]) => count > 0);
    const failureStep = dominantStep ? dominantStep[0] : 'unknown';

    const userId = String(Sentry.getCurrentScope().getUser()?.id ?? 'anonymous');

    Sentry.captureMessage('cloud_upload_partial_failure', {
      level: getPartialFailureLevel(result.uploaded, result.failed),
      fingerprint: ['cloud_upload_partial_failure', userId],
      tags: {
        allFailed: String(result.uploaded === 0),
        failedCount: String(result.failed),
        transient: String(allTransient),
        failureStep,
      },
      extra: {
        uploaded: result.uploaded,
        skipped: result.skipped,
        failed: result.failed,
        totalFiles,
        topErrors: Object.fromEntries(topErrors),
        ...(result.presignErrors?.length ? { presignErrors: result.presignErrors.slice(0, 10) } : {}),
      },
    });
  }

  private async hashFiles(files: File[], signal: AbortSignal): Promise<string[]> {
    const hashCache = new HashCache();
    const hashes: string[] = new Array(files.length).fill('');

    // Check cache first — files with matching fingerprint skip the worker
    const uncachedFiles: Array<{ index: number; file: File }> = [];
    let cacheHits = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i]!;
      const filePath = getFilePath(file);
      const cached = hashCache.get(filePath, file.size, file.lastModified);
      if (cached) {
        hashes[i] = cached;
        cacheHits++;
      } else {
        uncachedFiles.push({ index: i, file });
      }
    }

    // Update progress with cache hits
    this.setState({
      progress: { ...this.state.progress, current: cacheHits, total: files.length },
    });

    // If all files hit cache, we're done
    if (uncachedFiles.length === 0) {
      return hashes;
    }

    // Hash uncached files via Web Worker
    await new Promise<void>((resolve, reject) => {
      const readAndHash = async () => {
        const BATCH_SIZE = 10;
        const allBuffers: Array<{ index: number; buffer: ArrayBuffer }> = [];

        for (let i = 0; i < uncachedFiles.length; i += BATCH_SIZE) {
          if (signal.aborted) { reject(new Error('Cancelled')); return; }

          const batch = uncachedFiles.slice(i, i + BATCH_SIZE);
          const buffers = await Promise.all(
            batch.map(async (item) => ({
              index: item.index,
              buffer: await item.file.arrayBuffer(),
            }))
          );
          allBuffers.push(...buffers);
        }

        // Start hash worker
        this.hashWorker = new Worker(
          new URL('./hash-worker.ts', import.meta.url)
        );

        // Remap worker indices to original file indices
        const workerIndexToOriginal = new Map<number, number>();
        allBuffers.forEach((buf, workerIdx) => {
          workerIndexToOriginal.set(workerIdx, buf.index);
        });

        // Reindex buffers for the worker (sequential 0..N)
        const workerBuffers = allBuffers.map((buf, workerIdx) => ({
          index: workerIdx,
          buffer: buf.buffer,
        }));

        let completed = 0;

        this.hashWorker.onmessage = (e: MessageEvent<WorkerMessage>) => {
          const msg = e.data;
          if (msg.type === 'HASH_RESULT') {
            const originalIndex = workerIndexToOriginal.get(msg.index) ?? msg.index;
            hashes[originalIndex] = msg.hash;

            // Cache the newly computed hash
            const file = files[originalIndex]!;
            const filePath = getFilePath(file);
            hashCache.set(filePath, file.size, file.lastModified, msg.hash);
          } else if (msg.type === 'HASH_PROGRESS') {
            completed = msg.completed;
            this.setState({
              progress: { ...this.state.progress, current: cacheHits + completed, total: files.length },
            });
            if (completed === uncachedFiles.length) {
              this.hashWorker?.terminate();
              this.hashWorker = null;
              hashCache.flush();
              resolve();
            }
          } else if (msg.type === 'HASH_ERROR') {
            this.hashWorker?.terminate();
            this.hashWorker = null;
            const originalIndex = workerIndexToOriginal.get(msg.index) ?? msg.index;
            reject(new Error(`Hash failed for file ${originalIndex}: ${msg.error}`));
          }
        };

        this.hashWorker.onerror = (err) => {
          this.hashWorker?.terminate();
          this.hashWorker = null;
          reject(new Error(err.message || 'Hash worker failed'));
        };

        this.hashWorker.postMessage(
          { type: 'HASH_FILES', files: workerBuffers },
          workerBuffers.map(b => b.buffer)
        );
      };

      readAndHash().catch(reject);
    });

    return hashes;
  }

  private async checkExisting(
    files: File[],
    hashes: string[],
    signal: AbortSignal
  ): Promise<Set<string>> {
    const hashEntries = files.map((file, i) => ({
      filePath: getFilePath(file),
      fileHash: hashes[i]!,
    }));

    const res = await fetch('/api/files/check-hashes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ hashes: hashEntries }),
      signal,
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: 'Unknown error' }));
      if (res.status === 401 || res.status === 403) {
        throw new Error('Cloud sync requires an active session. Please sign in again.');
      }
      console.error('[upload-orchestrator] check-hashes failed:', res.status, body.error);
      // For server errors (500/503), skip dedup and attempt upload anyway
      return new Set<string>();
    }

    const data = await res.json();
    return new Set<string>(data.existing ?? []);
  }

  private async uploadFiles(
    toUpload: File[],
    allHashes: string[],
    allFiles: File[],
    signal: AbortSignal
  ): Promise<UploadResult> {
    const result: UploadResult = { uploaded: 0, skipped: 0, failed: 0, errors: [] };
    let bytesUploaded = 0;

    // Fail-fast tracking: abort if we see the same error repeatedly.
    // Safe under concurrency because JS is single-threaded — the catch block
    // (where mutation happens) runs synchronously between await points.
    let consecutiveErrors = 0;
    let lastErrorMessage = '';

    // Process with concurrency limit
    const queue = [...toUpload];
    const running: Promise<void>[] = [];

    const processOne = async (file: File) => {
      const originalIndex = allFiles.indexOf(file);
      const hash = allHashes[originalIndex]!;
      const filePath = getFilePath(file);
      const nightDate = extractNightDate(filePath);
      const fileName = file.name;

      try {
        const uploaded = await this.uploadSingleFile(file, filePath, fileName, hash, nightDate, signal);
        if (uploaded) {
          result.uploaded++;
        } else {
          result.skipped++;
        }
        // Reset consecutive error counter on success
        consecutiveErrors = 0;
        lastErrorMessage = '';
      } catch (firstErr) {
        // Rate limit: exponential backoff with multiple retries
        const isRateLimit = firstErr instanceof Error && (firstErr as Error & { isRateLimit?: boolean }).isRateLimit === true;
        // Transient 5xx (502, 503, 504, 520): classify on the typed HTTP status
        // the server set, not a regex over the message text.
        const isTransient = !isRateLimit && isTransientServerErrorFor(firstErr);
        if (isRateLimit || isTransient) {
          const maxRetries = isRateLimit ? RATE_LIMIT_MAX_RETRIES : TRANSIENT_MAX_RETRIES;
          const retryLabel = isRateLimit ? 'Rate limited' : 'Transient server error';
          const retryStart = Date.now();
          // Honor a server Retry-After when present, else exponential backoff.
          let nextRetryAfterMs = errorRetryAfterMs(firstErr);
          let uploaded = false;
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            const backoff = RATE_LIMIT_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 1000;
            const delay = Math.min(nextRetryAfterMs ?? backoff, MAX_SINGLE_BACKOFF_MS);
            await new Promise(r => setTimeout(r, delay));
            if (signal.aborted) break;
            // Stop retrying this file once the total retry budget is spent, so one
            // slow-healing file can't stall the whole bulk sync.
            if (Date.now() - retryStart > RETRY_WALL_CAP_MS) break;
            try {
              const ok = await this.uploadSingleFile(file, filePath, fileName, hash, nightDate, signal);
              if (ok) result.uploaded++;
              else result.skipped++;
              uploaded = true;
              consecutiveErrors = 0;
              lastErrorMessage = '';
              break;
            } catch (retryErr) {
              const retryErrMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
              const stillRetryable = isRateLimit
                ? retryErr instanceof Error && (retryErr as Error & { isRateLimit?: boolean }).isRateLimit === true
                : isTransientServerErrorFor(retryErr);
              if (!stillRetryable) {
                // Different error — record and stop retrying this file
                result.failed++;
                result.errors.push(`${fileName}: ${retryErrMsg}`);
                uploaded = true; // prevent double-counting
                break;
              }
              // Still retryable — refresh Retry-After for the next backoff iteration
              nextRetryAfterMs = errorRetryAfterMs(retryErr);
            }
          }
          if (!uploaded) {
            result.failed++;
            result.errors.push(`${fileName}: ${retryLabel} after retries`);
          }
          // Transient 5xx errors do NOT count toward consecutiveErrors —
          // they are infrastructure-level and typically self-heal
        } else {
          // Non-rate-limit, non-transient error: retry once with flat delay + jitter
          try {
            await new Promise(r => setTimeout(r, RETRY_DELAY_MS + Math.random() * 500));
            if (signal.aborted) throw new Error('Cancelled');
            const uploaded = await this.uploadSingleFile(file, filePath, fileName, hash, nightDate, signal);
            if (uploaded) result.uploaded++;
            else result.skipped++;
            consecutiveErrors = 0;
            lastErrorMessage = '';
          } catch (retryErr) {
            const errMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
            result.failed++;
            result.errors.push(`${fileName}: ${errMsg}`);

            // Collect presign error body for Sentry context in reportFailures
            const presignBody = retryErr instanceof Error ? (retryErr as Error & { presignBody?: unknown }).presignBody : undefined;
            if (presignBody !== undefined) {
              result.presignErrors = result.presignErrors ?? [];
              result.presignErrors.push(presignBody);
            }

            // Fail-fast: only count systemic errors (auth, network, server),
            // not per-file validation errors (400) which are expected for some files
            const isValidation = retryErr instanceof Error && (retryErr as Error & { isValidation?: boolean }).isValidation === true;
            if (!isValidation) {
              const normalized = errMsg.replace(/^[^:]+:\s*/, '');
              if (normalized === lastErrorMessage) {
                consecutiveErrors++;
              } else {
                consecutiveErrors = 1;
                lastErrorMessage = normalized;
              }

              // Abort if we've seen the same systemic error too many times in a row
              if (consecutiveErrors >= FAIL_FAST_THRESHOLD) {
                this.abortController?.abort();
              }
            }
          }
        }
      }

      bytesUploaded += file.size;
      this.setState({
        progress: {
          ...this.state.progress,
          current: result.uploaded + result.skipped + result.failed,
          bytesUploaded,
        },
      });
    };

    for (const file of queue) {
      if (signal.aborted) break;

      if (running.length >= CONCURRENCY) {
        await Promise.race(running);
      }

      const promise = processOne(file).then(() => {
        const idx = running.indexOf(promise);
        if (idx >= 0) running.splice(idx, 1);
      });
      running.push(promise);
    }

    await Promise.all(running);
    return result;
  }

  private async uploadSingleFile(
    file: File,
    filePath: string,
    fileName: string,
    hash: string,
    nightDate: string | null,
    signal: AbortSignal
  ): Promise<boolean> {
    // Step 1: Get presigned URL
    const presignRes = await fetch('/api/files/presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        filePath,
        fileName,
        fileSize: file.size,
        fileHash: hash,
        nightDate,
        mimeType: file.type || null,
      }),
      signal,
    });

    if (!presignRes.ok) {
      const err = await presignRes.json().catch(() => ({ error: 'Presign failed' }));
      if (presignRes.status === 401 || presignRes.status === 403) {
        throw new Error(err.error || 'Cloud sync requires an active session. Please sign in again.');
      }
      const error = new Error(err.error || `Presign failed: ${presignRes.status}`);
      // Tag rate limit errors so retry logic uses exponential backoff
      (error as Error & { isRateLimit?: boolean }).isRateLimit = presignRes.status === 429;
      // Tag validation errors (400) so fail-fast can distinguish them from systemic failures
      (error as Error & { isValidation?: boolean }).isValidation = presignRes.status === 400;
      // Tag the HTTP status so retry classification keys on it, not a message regex
      (error as Error & { httpStatus?: number }).httpStatus = presignRes.status;
      const retryAfterMs = parseRetryAfterMs(presignRes.headers.get('retry-after'));
      if (retryAfterMs !== undefined) (error as Error & { retryAfterMs?: number }).retryAfterMs = retryAfterMs;
      // Attach parsed response body for Sentry context in reportFailures
      (error as Error & { presignBody?: unknown }).presignBody = { status: presignRes.status, body: err };
      throw error;
    }

    const presignData = await presignRes.json();

    // Already exists
    if (presignData.skipped) return false;

    // Step 2: Upload directly to Supabase Storage
    const uploadRes = await fetch(presignData.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: file,
      signal,
    });

    if (!uploadRes.ok) {
      // Clean up metadata on failed upload
      await fetch('/api/files/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ fileId: presignData.fileId }),
      }).catch(() => { /* best effort cleanup */ });
      const uploadErr = new Error(`Upload failed: ${uploadRes.status}`);
      // Tag the HTTP status + Retry-After so a transient Storage PUT 5xx retries
      // with backoff instead of being misread as a non-transient failure.
      (uploadErr as Error & { httpStatus?: number }).httpStatus = uploadRes.status;
      const putRetryAfterMs = parseRetryAfterMs(uploadRes.headers.get('retry-after'));
      if (putRetryAfterMs !== undefined) (uploadErr as Error & { retryAfterMs?: number }).retryAfterMs = putRetryAfterMs;
      throw uploadErr;
    }

    // Step 3: Confirm upload — marks the file as upload_confirmed in the DB.
    // Retry up to 2 times for transient 5xx failures before treating as non-fatal.
    const CONFIRM_RETRIES = 2;
    const CONFIRM_RETRY_BASE_MS = 300;
    let confirmRes: Response | null = null;
    let confirmAttempts = 0;

    for (let attempt = 0; attempt <= CONFIRM_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, CONFIRM_RETRY_BASE_MS * attempt));
      }
      confirmAttempts = attempt + 1;
      confirmRes = await fetch('/api/files/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ fileId: presignData.fileId }),
        signal,
      });
      // Stop retrying on success, 404 (definitive), or non-5xx client errors
      if (confirmRes.ok || confirmRes.status === 404 || confirmRes.status < 500) break;
    }

    if (!confirmRes!.ok) {
      if (confirmRes!.status === 404) {
        // File is not in storage despite the PUT appearing to succeed.
        // Treat as a failed upload — the metadata row was already cleaned up by the confirm route.
        throw new Error(`Upload not confirmed: file missing from storage (${confirmRes!.status})`);
      }
      // Other errors (5xx) after retries: file may be in storage but unconfirmed.
      // The stale orphan detection in presign will clean it up on the next attempt.
      Sentry.captureMessage('cloud_upload_confirm_nonfatal_error', {
        level: 'warning',
        tags: { httpStatus: String(confirmRes!.status) },
        extra: { fileId: presignData.fileId, status: confirmRes!.status, attempts: confirmAttempts },
      });
      console.error('[upload-orchestrator] confirm failed after retries:', confirmRes!.status);
    }

    return true;
  }

  reset(): void {
    this.abort();
    this.setState({
      status: 'idle',
      progress: { current: 0, total: 0, bytesUploaded: 0, bytesTotal: 0, stage: 'hashing', skippedExisting: 0 },
      result: null,
      error: null,
    });
  }
}

// Singleton
export const uploadOrchestrator = new UploadOrchestrator();
