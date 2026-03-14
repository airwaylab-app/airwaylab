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
   */
  async extract(files: File[], targetDate: string): Promise<StoredWaveform | null> {
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
      const result = await this.runWorker(fileBuffers, targetDate);

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
        };

        this.cache.set(targetDate, stored);
        this.setState({ status: 'ready', waveform: stored, error: null });

        // Store in IndexedDB (non-blocking, non-fatal)
        storeWaveform(stored).catch((err) => {
          console.error('[waveform] IDB store failed:', err);
        });

        // Clean up expired entries (non-blocking)
        deleteExpired().catch(() => {});

        return stored;
      } else {
        this.setState({ status: 'error', waveform: null, error: 'No flow data found for this night' });
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
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
    targetDate: string
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
        reject(new Error(err.message || 'Waveform worker failed'));
      };

      // Transfer ArrayBuffers for zero-copy
      const transferable = files.map((f) => f.buffer);
      this.worker.postMessage(
        { type: 'EXTRACT_WAVEFORM', files, targetDate },
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
