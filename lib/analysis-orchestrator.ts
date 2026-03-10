// ============================================================
// AirwayLab — Analysis Orchestrator
// Manages web worker lifecycle and bridges UI ↔ worker.
// Supports incremental re-analysis: unchanged nights are pulled
// from cache while only new/modified data hits the worker.
// ============================================================

import type {
  AnalysisState,
  NightResult,
  OximetryResults,
  WorkerResponse,
} from './types';
import { loadPersistedResults, persistResults } from './persistence';
import {
  diffAgainstManifest,
  buildManifest,
  saveManifest,
  loadManifest,
} from './file-manifest';

type StateListener = (state: AnalysisState) => void;

const initialState: AnalysisState = {
  status: 'idle',
  progress: { current: 0, total: 0, stage: '' },
  nights: [],
  error: null,
  therapyChangeDate: null,
  warning: null,
};

export class AnalysisOrchestrator {
  private worker: Worker | null = null;
  private state: AnalysisState = { ...initialState };
  private listeners: Set<StateListener> = new Set();

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  private setState(patch: Partial<AnalysisState>): void {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l(this.state));
  }

  getState(): AnalysisState {
    return this.state;
  }

  /**
   * Start analysis with uploaded SD card files and optional oximetry CSVs.
   * Automatically skips nights that haven't changed since the last upload.
   */
  async analyze(
    sdFiles: FileList | File[],
    oximetryFiles?: FileList | File[]
  ): Promise<NightResult[]> {
    this.terminate();
    const sdArr = Array.from(sdFiles);
    this.setState({
      ...initialState,
      status: 'uploading',
      progress: { current: 0, total: sdArr.length, stage: 'Checking for cached data...' },
    });

    try {
      // ── Incremental check ──
      const manifest = loadManifest();
      const cached = loadPersistedResults();
      let filesToProcess = sdArr;
      let cachedNights: NightResult[] = [];
      let skippedCount = 0;

      const hasNewOximetry = oximetryFiles && oximetryFiles.length > 0;

      if (manifest && cached && cached.nights.length > 0) {
        const diff = diffAgainstManifest(sdArr, manifest);
        skippedCount = diff.unchanged.length;

        if (diff.changedFiles.length === 0 && skippedCount > 0 && !hasNewOximetry) {
          // ALL nights unchanged and no new oximetry — instant restore
          const therapyChangeDate = detectTherapyChange(cached.nights);
          this.setState({
            status: 'complete',
            nights: cached.nights,
            therapyChangeDate,
            progress: { current: 1, total: 1, stage: `All ${skippedCount} nights cached` },
          });
          // Re-save manifest to refresh its timestamp
          saveManifest(buildManifest(sdArr));
          return cached.nights;
        }

        if (skippedCount > 0) {
          // Partial cache hit — pull cached results for unchanged nights
          const unchangedSet = new Set(diff.unchanged);
          cachedNights = cached.nights.filter((n) => unchangedSet.has(n.dateStr));
          filesToProcess = diff.changedFiles;

          this.setState({
            progress: {
              current: 0,
              total: filesToProcess.length,
              stage: `${skippedCount} night${skippedCount !== 1 ? 's' : ''} cached, reading ${diff.changedNights.size} new...`,
            },
          });
        }
      }

      // ── Read files into ArrayBuffers ──
      const totalFiles = filesToProcess.length;
      if (skippedCount === 0) {
        this.setState({
          progress: { current: 0, total: totalFiles, stage: `Reading ${totalFiles} files...` },
        });
      }

      const files = await readFileList(filesToProcess, (done) => {
        this.setState({
          progress: {
            current: done,
            total: totalFiles,
            stage: skippedCount > 0
              ? `${skippedCount} cached • Reading files (${done}/${totalFiles})...`
              : `Reading files (${done}/${totalFiles})...`,
          },
        });
      });

      // ── Read oximetry CSVs ──
      let oximetryCSVs: string[] | undefined;
      if (oximetryFiles && oximetryFiles.length > 0) {
        const oxArr = Array.from(oximetryFiles);
        this.setState({
          progress: { current: 0, total: oxArr.length, stage: `Reading ${oxArr.length} oximetry files...` },
        });
        oximetryCSVs = await readCSVFiles(oxArr);
      }

      // ── Run worker ──
      this.setState({
        status: 'processing',
        progress: {
          current: 0,
          total: 1,
          stage: skippedCount > 0
            ? `${skippedCount} cached • Analyzing new nights...`
            : 'Starting analysis...',
        },
      });

      const newNights = await this.runWorker(files, oximetryCSVs);

      // ── Merge cached + new ──
      const merged = mergeNights(cachedNights, newNights);
      const therapyChangeDate = detectTherapyChange(merged);

      // ── Check if oximetry matched any nights ──
      let warning: string | null = null;
      if (hasNewOximetry) {
        const nightsWithOx = merged.filter((n) => n.oximetry !== null);
        if (nightsWithOx.length === 0) {
          warning = 'Oximetry CSV was uploaded but could not be matched to any night. Check that the recording date in your CSV matches one of your SD card nights.';
          console.error('[orchestrator] Oximetry warning:', warning);
        }
      }

      // ── Save manifest + results ──
      saveManifest(buildManifest(sdArr));
      persistResults(merged, therapyChangeDate);

      this.setState({
        status: 'complete',
        nights: merged,
        therapyChangeDate,
        warning,
        progress: { current: 1, total: 1, stage: 'Complete' },
      });

      return merged;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.setState({ status: 'error', error });
      throw err;
    }
  }

  private runWorker(
    files: { buffer: ArrayBuffer; path: string }[],
    oximetryCSVs?: string[]
  ): Promise<NightResult[]> {
    return new Promise((resolve, reject) => {
      // Safety timeout — 10 minutes to handle multi-year SD cards (800+ files)
      const WORKER_TIMEOUT_MS = 10 * 60 * 1000;
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.terminate();
          reject(new Error('Analysis timed out after 10 minutes. Your data may be too large or in an unsupported format.'));
        }
      }, WORKER_TIMEOUT_MS);

      const settle = () => {
        settled = true;
        clearTimeout(timeout);
      };

      this.worker = new Worker(
        new URL('../workers/analysis-worker.ts', import.meta.url)
      );

      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        switch (msg.type) {
          case 'PROGRESS':
            this.setState({
              progress: {
                current: msg.current,
                total: msg.total,
                stage: msg.stage,
              },
            });
            break;
          case 'RESULTS':
            settle();
            this.terminate();
            resolve(msg.nights);
            break;
          case 'ERROR':
            settle();
            this.terminate();
            reject(new Error(msg.error));
            break;
        }
      };

      this.worker.onerror = (err) => {
        settle();
        this.terminate();
        const detail = [
          err.message,
          err.filename && `at ${err.filename}:${err.lineno}:${err.colno}`,
        ].filter(Boolean).join(' ');
        reject(new Error(
          detail || 'Analysis worker failed to load. Try refreshing the page.'
        ));
      };

      // Transfer ArrayBuffers for zero-copy
      const transferable = files.map((f) => f.buffer);
      this.worker.postMessage(
        { type: 'ANALYZE', files, oximetryCSVs },
        transferable
      );
    });
  }

  /**
   * Process oximetry CSVs only and merge into cached nights.
   * Does not re-read or re-process SD card files.
   */
  async analyzeOximetryOnly(
    oximetryFiles: FileList | File[]
  ): Promise<NightResult[]> {
    this.terminate();

    const cached = loadPersistedResults();
    if (!cached || cached.nights.length === 0) {
      const error = 'Upload your SD card first, then add oximetry data.';
      this.setState({ status: 'error', error });
      throw new Error(error);
    }

    this.setState({
      ...initialState,
      status: 'processing',
      progress: { current: 0, total: 1, stage: 'Processing oximetry data...' },
    });

    try {
      // Read CSV files as text
      const oxArr = Array.from(oximetryFiles);
      const oximetryCSVs = await readCSVFiles(oxArr);

      this.setState({
        progress: { current: 0, total: 1, stage: 'Matching oximetry to night recordings...' },
      });

      // Run worker for oximetry-only processing
      const oximetryByDate = await this.runOximetryWorker(oximetryCSVs);

      // Merge oximetry into cached nights
      const merged = cached.nights.map((night) => {
        const ox = oximetryByDate[night.dateStr];
        if (ox) {
          return { ...night, oximetry: ox };
        }
        return night;
      });

      // Check if any oximetry matched
      let warning: string | null = null;
      const matchedCount = Object.keys(oximetryByDate).filter(
        (d) => cached.nights.some((n) => n.dateStr === d)
      ).length;
      if (matchedCount === 0) {
        warning = 'Oximetry CSV was uploaded but could not be matched to any night. Check that the recording date in your CSV matches one of your SD card nights.';
        console.error('[orchestrator] Oximetry warning:', warning);
      }

      // Persist updated results
      const therapyChangeDate = detectTherapyChange(merged);
      persistResults(merged, therapyChangeDate);

      this.setState({
        status: 'complete',
        nights: merged,
        therapyChangeDate,
        warning,
        progress: { current: 1, total: 1, stage: 'Complete' },
      });

      return merged;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.setState({ status: 'error', error });
      throw err;
    }
  }

  private runOximetryWorker(
    oximetryCSVs: string[]
  ): Promise<Record<string, OximetryResults>> {
    return new Promise((resolve, reject) => {
      const WORKER_TIMEOUT_MS = 60 * 1000; // 1 minute — oximetry is fast
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.terminate();
          reject(new Error('Oximetry processing timed out. Try again or check your CSV file.'));
        }
      }, WORKER_TIMEOUT_MS);

      const settle = () => {
        settled = true;
        clearTimeout(timeout);
      };

      this.worker = new Worker(
        new URL('../workers/analysis-worker.ts', import.meta.url)
      );

      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        switch (msg.type) {
          case 'OXIMETRY_RESULTS':
            settle();
            this.terminate();
            resolve(msg.oximetryByDate);
            break;
          case 'ERROR':
            settle();
            this.terminate();
            reject(new Error(msg.error));
            break;
        }
      };

      this.worker.onerror = (err) => {
        settle();
        this.terminate();
        const detail = [
          err.message,
          err.filename && `at ${err.filename}:${err.lineno}:${err.colno}`,
        ].filter(Boolean).join(' ');
        reject(new Error(
          detail || 'Oximetry worker failed to load. Try refreshing the page.'
        ));
      };

      this.worker.postMessage({ type: 'ANALYZE_OXIMETRY', oximetryCSVs });
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
    this.setState({ ...initialState });
  }
}

// ── Helpers ──────────────────────────────────────────────────

async function readFileList(
  files: File[],
  onProgress?: (done: number) => void
): Promise<{ buffer: ArrayBuffer; path: string }[]> {
  const results: { buffer: ArrayBuffer; path: string }[] = [];
  let done = 0;

  // Read in batches of 20 to avoid overwhelming the browser with
  // hundreds of concurrent file reads from a large SD card
  const BATCH_SIZE = 20;
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
    done += batchResults.length;
    onProgress?.(done);
  }

  return results;
}

async function readCSVFiles(
  files: FileList | File[]
): Promise<string[]> {
  const arr = Array.from(files);

  // Read all CSV files in parallel
  return Promise.all(arr.map((file) => file.text()));
}

/**
 * Merge cached nights with freshly-analyzed nights.
 * Dedupes by dateStr (fresh wins). Returns sorted most-recent-first.
 */
function mergeNights(
  cached: NightResult[],
  fresh: NightResult[]
): NightResult[] {
  const map = new Map<string, NightResult>();

  // Add cached first
  for (const n of cached) map.set(n.dateStr, n);
  // Fresh overwrites cached
  for (const n of fresh) map.set(n.dateStr, n);

  const merged = Array.from(map.values());
  // Sort most-recent-first
  merged.sort((a, b) => b.dateStr.localeCompare(a.dateStr));
  return merged;
}

/**
 * Detect the most recent date where machine settings changed.
 */
function detectTherapyChange(nights: NightResult[]): string | null {
  if (nights.length < 2) return null;

  // Nights are sorted most-recent-first
  for (let i = 0; i < nights.length - 1; i++) {
    const curr = nights[i].settings;
    const prev = nights[i + 1].settings;

    if (
      curr.epap !== prev.epap ||
      curr.ipap !== prev.ipap ||
      curr.papMode !== prev.papMode ||
      curr.pressureSupport !== prev.pressureSupport
    ) {
      return nights[i].dateStr;
    }
  }

  return null;
}

// Singleton
export const orchestrator = new AnalysisOrchestrator();
