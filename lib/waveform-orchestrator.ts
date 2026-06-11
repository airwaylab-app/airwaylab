// ============================================================
// AirwayLab — Waveform Orchestrator
// Manages waveform extraction worker lifecycle.
// Stores raw Float32Array data in IndexedDB for instant reload.
// Runs independently from the main analysis orchestrator.
// ============================================================

import * as Sentry from '@sentry/nextjs';
import type {
  StoredWaveform,
  WaveformWorkerResponse,
  RawWaveformResult,
} from './waveform-types';
import { ENGINE_VERSION } from './engine-version';
import { storeWaveform, loadWaveform, deleteExpired } from './waveform-idb';

type WaveformListener = (state: WaveformState) => void;

export interface WaveformState {
  status: 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';
  waveform: StoredWaveform | null;
  error: string | null;
}

const WORKER_TIMEOUT_MS = 60_000; // 60 seconds (increased from 30 for large SD cards)

/**
 * Patient-safety input guard (orchestrator boundary).
 *
 * A malformed EDF can decode to samplingRate <= 0 / NaN, a bad recordDuration,
 * or an empty/NaN sample array. If we let those numbers reach the analyzers they
 * (a) drive the WAT engine's stepSize = floor(5 * samplingRate) to 0, which loops
 * forever and hangs the worker, and (b) NaN-propagate into Glasgow/WAT/NED so the
 * clinical numbers come out silently wrong.
 *
 * This rejects a parsed waveform result before it is cached, persisted, or shown.
 * Returns null when valid, or a human-readable reason string when it must be skipped.
 *
 * NOTE: this guards the values the parser EXPOSES. It does NOT fix the upstream
 * cause flagged for clinician/maintainer review: lib/parsers/edf-parser.ts does not
 * validate headerBytes against (256 + numSignals * 256), so an under-reported header
 * decodes header bytes AS flow samples — that produces plausible-but-wrong numbers
 * here and cannot be detected at this boundary. See PR body. (Protected module — not
 * edited here.)
 */
function validateWaveformInputs(result: {
  sampleRate: number;
  durationSeconds: number;
  flow: Float32Array | null;
}): string | null {
  if (!Number.isFinite(result.sampleRate) || result.sampleRate <= 0) {
    return `invalid sampling rate (${result.sampleRate})`;
  }
  if (!Number.isFinite(result.durationSeconds) || result.durationSeconds <= 0) {
    return `invalid record duration (${result.durationSeconds}s)`;
  }
  const sampleCount = result.flow?.length ?? 0;
  if (!Number.isInteger(sampleCount) || sampleCount <= 0) {
    return `invalid sample count (${sampleCount})`;
  }
  return null;
}

class WaveformOrchestrator {
  private worker: Worker | null = null;
  private state: WaveformState = { status: 'idle', waveform: null, error: null };
  private listeners = new Set<WaveformListener>();
  private cache = new Map<string, StoredWaveform>();

  subscribe(listener: WaveformListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): WaveformState {
    return this.state;
  }

  private setState(patch: Partial<WaveformState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  /**
   * Check if we have cached waveform data for a given date.
   */
  hasCached(dateStr: string): boolean {
    return this.cache.has(dateStr);
  }

  /**
   * Try to load from IndexedDB first.
   * Returns the StoredWaveform if found, null otherwise.
   */
  async loadFromIDB(dateStr: string): Promise<StoredWaveform | null> {
    // Check in-memory cache first
    const cached = this.cache.get(dateStr);
    if (cached) {
      this.setState({ status: 'ready', waveform: cached, error: null });
      return cached;
    }

    // Try IndexedDB
    const stored = await loadWaveform(dateStr);
    if (stored) {
      this.cache.set(dateStr, stored);
      this.setState({ status: 'ready', waveform: stored, error: null });
      return stored;
    }

    return null;
  }

  /**
   * Extract waveform data for a specific night from SD card files.
   * Stores raw Float32Array in IndexedDB after extraction.
   * Pass reraTimestamps from the NED engine to align graph RERA markers with the analysis count.
   */
  async extract(files: File[], targetDate: string, reraTimestamps?: import('./types').RERATimestamp[]): Promise<StoredWaveform | null> {
    // Check in-memory cache first
    const cached = this.cache.get(targetDate);
    if (cached) {
      this.setState({ status: 'ready', waveform: cached, error: null });
      return cached;
    }

    if (files.length === 0) {
      this.setState({ status: 'unavailable', waveform: null, error: null });
      return null;
    }

    this.terminate();
    this.setState({ status: 'loading', waveform: null, error: null });

    try {
      // Pre-filter to BRP + EVE files — avoids reading non-relevant files into memory
      const brpFiles = files.filter((f) => {
        const path =
          (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name;
        const name = (path.split('/').pop() || '').toLowerCase();
        return (name.endsWith('brp.edf') || name.endsWith('_brp.edf')) && f.size > 50 * 1024;
      });

      if (brpFiles.length === 0) {
        this.setState({ status: 'error', waveform: null, error: 'No flow data files found' });
        return null;
      }

      // Also find EVE.edf files (machine-recorded events, tiny ~1KB)
      const eveFiles = files.filter((f) => {
        const path =
          (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name;
        const name = (path.split('/').pop() || '').toLowerCase();
        return name.endsWith('eve.edf') || name.endsWith('_eve.edf');
      });

      // Further filter to only files matching the target date's DATALOG folder.
      const dateCompact = targetDate.replace(/-/g, '');
      const filterByDate = (f: File) => {
        const path =
          (f as unknown as { webkitRelativePath?: string }).webkitRelativePath || f.name;
        return path.includes(`DATALOG/${dateCompact}/`) || path.includes(`/${dateCompact}_`);
      };

      const dateFilteredBRP = brpFiles.filter(filterByDate);
      const dateFilteredEVE = eveFiles.filter(filterByDate);

      const brpToRead = dateFilteredBRP.length > 0 ? dateFilteredBRP : brpFiles;
      const eveToRead = dateFilteredEVE.length > 0 ? dateFilteredEVE : eveFiles;

      // Read BRP + EVE files into ArrayBuffers
      const filesToRead = [...brpToRead, ...eveToRead];
      const fileBuffers = await readFiles(filesToRead);

      // Run worker — now returns raw Float32Arrays
      const result = await this.runWorker(fileBuffers, targetDate, reraTimestamps);

      // ── Patient-safety input guard ──
      // Reject non-finite / non-positive parser outputs before they are cached,
      // persisted, or shown. A bad samplingRate would hang the WAT engine and
      // NaN-propagate into the clinical metrics. Surface, do not silently drop.
      if (result) {
        const invalidReason = validateWaveformInputs(result);
        if (invalidReason) {
          const error = `Flow data for this night could not be analysed: ${invalidReason}. The file may be corrupt or incomplete.`;
          console.error('[waveform] rejected invalid parser output:', error);
          Sentry.captureMessage(error, {
            level: 'warning',
            tags: { context: 'waveform-input-guard' },
          });
          this.setState({ status: 'error', waveform: null, error });
          return null;
        }
      }

      if (result && result.flow) {
        const stored: StoredWaveform = {
          dateStr: targetDate,
          flow: result.flow,
          pressure: result.pressure,
          sampleRate: result.sampleRate,
          durationSeconds: result.durationSeconds,
          events: result.events,
          stats: result.stats,
          tidalVolume: result.tidalVolume,
          respiratoryRate: result.respiratoryRate,
          leak: result.leak,
          storedAt: Date.now(),
          engineVersion: ENGINE_VERSION,
          sessions: result.sessions ?? [],
        };

        this.cache.set(targetDate, stored);
        this.setState({ status: 'ready', waveform: stored, error: null });

        // Store in IndexedDB (non-blocking, non-fatal)
        // eslint-disable-next-line airwaylab/no-silent-catch -- IDB store is best-effort; failure is logged and non-fatal to the user flow.
        storeWaveform(stored).catch((err) => {
          console.error('[waveform] IDB store failed:', err);
        });

        // Clean up expired entries (non-blocking)
        deleteExpired().catch(() => { /* fire-and-forget IDB expiry cleanup */ });

        return stored;
      } else {
        this.setState({ status: 'error', waveform: null, error: 'No flow data found for this night' });
        return null;
      }
    } catch (err) {
      let error = err instanceof Error ? err.message : String(err);

      // User-friendly message for SD card / file read failures
      if (err instanceof DOMException && err.name === 'NotFoundError') {
        error = 'The SD card was removed or became unavailable. Please reconnect and try again.';
      } else if (err instanceof DOMException && err.name === 'NotReadableError') {
        error = 'Could not read your SD card files. Please check the card is still connected and try again.';
      }

      console.error('[waveform] extraction failed:', error);
      Sentry.captureException(err, { extra: { context: 'waveform-extraction' } });
      this.setState({ status: 'error', waveform: null, error });
      return null;
    }
  }

  /**
   * Set synthetic/demo waveform data directly (bypasses worker).
   */
  setDemoWaveform(waveform: StoredWaveform): void {
    this.cache.set(waveform.dateStr, waveform);
    this.setState({ status: 'ready', waveform, error: null });
  }

  private runWorker(
    files: { buffer: ArrayBuffer; path: string }[],
    targetDate: string,
    reraTimestamps?: import('./types').RERATimestamp[]
  ): Promise<RawWaveformResult | null> {
    return new Promise((resolve, reject) => {
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.terminate();
          reject(new Error('Waveform extraction timed out'));
        }
      }, WORKER_TIMEOUT_MS);

      const settle = () => {
        settled = true;
        clearTimeout(timeout);
      };

      try {
        this.worker = new Worker(
          new URL('./waveform-worker.ts', import.meta.url)
        );
      } catch (err) {
        settle();
        reject(new Error(err instanceof Error ? err.message : 'Failed to create waveform worker'));
        return;
      }

      this.worker.onmessage = (e: MessageEvent<WaveformWorkerResponse>) => {
        const msg = e.data;
        if (msg.type === 'RAW_WAVEFORM_RESULT') {
          settle();
          this.terminate();
          if (msg.error) {
            reject(new Error(msg.error));
          } else if (msg.flow) {
            resolve(msg);
          } else {
            resolve(null);
          }
        }
      };

      this.worker.onerror = (err) => {
        settle();
        this.terminate();
        // Capture ErrorEvent details before they are lost — onerror fires for
        // uncaught worker exceptions (including OOM kills) and often carries an
        // empty message. The captureMessage gives future triage filename/lineno.
        Sentry.captureMessage('Waveform worker crashed', {
          level: 'error',
          extra: {
            workerErrorMessage: err.message,
            filename: err.filename,
            lineno: err.lineno,
            colno: err.colno,
          },
        });
        reject(new Error(err.message || 'Waveform worker failed'));
      };

      // Transfer ArrayBuffers for zero-copy
      const transferable = files.map((f) => f.buffer);
      this.worker.postMessage(
        { type: 'EXTRACT_WAVEFORM', files, targetDate, reraTimestamps },
        transferable
      );
    });
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }

  reset(): void {
    this.terminate();
    this.cache.clear();
    this.setState({ status: 'idle', waveform: null, error: null });
  }
}

async function readFiles(files: File[]): Promise<{ buffer: ArrayBuffer; path: string }[]> {
  const BATCH_SIZE = 20;
  const results: { buffer: ArrayBuffer; path: string }[] = [];

  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    const batch = files.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (file) => {
        const path =
          (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
        const buffer = await file.arrayBuffer();
        return { buffer, path };
      })
    );
    results.push(...batchResults);
  }

  return results;
}

// Singleton
export const waveformOrchestrator = new WaveformOrchestrator();
