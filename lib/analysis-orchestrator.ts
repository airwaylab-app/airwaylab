// ============================================================
// AirwayLab — Analysis Orchestrator
// Manages web worker lifecycle and bridges UI ↔ worker.
// Supports incremental re-analysis: unchanged nights are pulled
// from cache while only new/modified data hits the worker.
// ============================================================

import * as Sentry from '@sentry/nextjs';
import type {
  AnalysisState,
  NightResult,
  OximetryResults,
  OximetryTraceData,
  WorkerResponse,
  WorkerSettingsDiagnostic,
} from './types';
import { loadPersistedResults, persistResults, persistNightsIncremental } from './persistence';
import {
  extractNightDate,
  buildManifest,
  saveManifest,
  loadManifest,
  diffAgainstManifest,
} from './file-manifest';
import { storeOximetryTrace, loadOximetryTrace } from './oximetry-trace-idb';
import { storeBreathData, loadBreathData } from './breath-data-idb';
import { loadPLDTrace } from './pld-trace-idb';
import type { CompactBreath } from './breath-data-idb';
import type { StoredPLDTrace } from './pld-trace-idb';

type StateListener = (state: AnalysisState) => void;

const initialState: AnalysisState = {
  status: 'idle',
  progress: { current: 0, total: 0, stage: '' },
  nights: [],
  error: null,
  therapyChangeDate: null,
  warning: null,
  persistenceWarning: null,
  warnings: [],
};

class AnalysisOrchestrator {
  private worker: Worker | null = null;
  private state: AnalysisState = { ...initialState };
  private listeners: Set<StateListener> = new Set();
  private incrementalNights: NightResult[] = [];
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private boundBeforeUnload: (() => void) | null = null;

  /** Diagnostic info from settings extraction failure (null when extraction succeeded). */
  settingsDiagnostic: WorkerSettingsDiagnostic | null = null;

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
    oximetryFiles?: FileList | File[],
    deviceType?: string,
    bmcSerial?: string
  ): Promise<NightResult[]> {
    this.terminate();
    const sdArr = Array.from(sdFiles);
    this.setState({
      ...initialState,
      status: 'uploading',
      progress: { current: 0, total: sdArr.length, stage: 'Checking for cached data...' },
    });

    try {
      Sentry.addBreadcrumb({ message: 'Analysis started', category: 'analysis', data: { fileCount: sdArr.length } });

      // ── Incremental check: use manifest diffing for smarter dedup ──
      const cached = loadPersistedResults();
      const cachedNights = cached?.nights ?? [];
      const cachedDateSet = new Set(cachedNights.map((n) => n.dateStr));
      const hasNewOximetry = oximetryFiles && oximetryFiles.length > 0;

      // Try manifest-based diffing first; fall back to date-based dedup
      const manifest = loadManifest();
      let unchangedDates: string[] = [];
      let filesToProcess: File[];

      if (manifest) {
        const diff = diffAgainstManifest(sdArr, manifest);
        // Only trust "unchanged" if we actually have cached results for them
        unchangedDates = diff.unchanged.filter((d) => cachedDateSet.has(d));
        const changedNights = diff.changedNights;

        if (unchangedDates.length > 0 && changedNights.size === 0) {
          // Everything unchanged — instant restore or oximetry-only
          if (hasNewOximetry) {
            return this.analyzeOximetryOnly(oximetryFiles!);
          }
          await restoreOximetryTraces(cachedNights);
          await restoreBreathData(cachedNights);
          await restorePLDTraces(cachedNights);
          const therapyChangeDate = detectTherapyChange(cachedNights);
          this.setState({
            status: 'complete',
            nights: cachedNights,
            therapyChangeDate,
            progress: { current: 1, total: 1, stage: `All ${unchangedDates.length} nights cached` },
          });
          return cachedNights;
        }

        filesToProcess = changedNights.size > 0 ? diff.changedFiles : sdArr;
      } else {
        // No manifest — fall back to date-based dedup
        const uploadDates = new Set<string>();
        for (const file of sdArr) {
          const path =
            (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
          const date = extractNightDate(path);
          if (date) uploadDates.add(date);
        }

        const newDates = new Set(
          Array.from(uploadDates).filter((d) => !cachedDateSet.has(d))
        );
        unchangedDates = Array.from(uploadDates).filter((d) => cachedDateSet.has(d));

        if (newDates.size === 0 && cachedNights.length > 0) {
          if (hasNewOximetry) {
            return this.analyzeOximetryOnly(oximetryFiles!);
          }
          await restoreOximetryTraces(cachedNights);
          await restoreBreathData(cachedNights);
          await restorePLDTraces(cachedNights);
          const therapyChangeDate = detectTherapyChange(cachedNights);
          this.setState({
            status: 'complete',
            nights: cachedNights,
            therapyChangeDate,
            progress: { current: 1, total: 1, stage: `All ${unchangedDates.length} nights cached` },
          });
          return cachedNights;
        }

        if (newDates.size > 0 && unchangedDates.length > 0) {
          filesToProcess = sdArr.filter((file) => {
            const path =
              (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
            const date = extractNightDate(path);
            return date === null || newDates.has(date);
          });
        } else {
          filesToProcess = sdArr;
        }
      }

      const skippedCount = unchangedDates.length;

      if (skippedCount > 0) {
        this.setState({
          progress: {
            current: 0,
            total: filesToProcess.length,
            stage: `${skippedCount} night${skippedCount !== 1 ? 's' : ''} cached, processing new...`,
          },
        });
      }

      // ── Save manifest early so mid-analysis refresh can diff on re-upload ──
      saveManifest(buildManifest(sdArr));

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

      // ── Set up incremental persistence ──
      this.incrementalNights = [];
      this.installBeforeUnload();

      const newNights = await this.runWorker(files, oximetryCSVs, (night) => {
        this.incrementalNights.push(night);
        this.debouncedPersist();
      }, deviceType, bmcSerial);

      // ── Clean up incremental state ──
      this.clearIncrementalState();

      // ── Merge cached + new ──
      const merged = mergeNights(cachedNights, newNights);
      await restoreOximetryTraces(merged);
      await restoreBreathData(merged);
      await restorePLDTraces(merged);
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

      // ── Authoritative save of final results ──
      const persistResult = persistResults(merged, therapyChangeDate);
      persistOximetryTraces(merged);
      persistBreathData(merged);
      persistPLDTraces(merged);

      Sentry.addBreadcrumb({ message: 'Analysis complete', category: 'analysis', data: { nightCount: merged.length } });

      this.setState({
        status: 'complete',
        nights: merged,
        therapyChangeDate,
        warning,
        persistenceWarning: persistResult.reason ?? null,
        progress: { current: 1, total: 1, stage: 'Complete' },
      });

      return merged;
    } catch (err) {
      // Best-effort persist of whatever we have so far
      if (this.incrementalNights.length > 0) {
        try {
          persistNightsIncremental(this.incrementalNights);
        } catch {
          // Non-critical — don't mask the original error
        }
      }
      this.clearIncrementalState();
      const error = err instanceof Error ? err.message : String(err);
      Sentry.captureException(err, { extra: { context: 'analysis-worker' } });
      this.setState({ status: 'error', error });
      throw err;
    }
  }

  private runWorker(
    files: { buffer: ArrayBuffer; path: string }[],
    oximetryCSVs?: string[],
    onNightComplete?: (night: NightResult) => void,
    deviceType?: string,
    bmcSerial?: string
  ): Promise<NightResult[]> {
    return new Promise((resolve, reject) => {
      // Progress-aware timeout: resets on any worker message.
      // If the worker goes silent for 5 minutes, it's stuck.
      // No hard cap — large SD cards (800+ files) can take a long time
      // but the worker sends PROGRESS messages throughout.
      const IDLE_TIMEOUT_MS = 5 * 60 * 1000;
      let settled = false;
      let idleTimer: ReturnType<typeof setTimeout>;

      const startIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            this.terminate();
            reject(new Error('Analysis appears stuck — no progress for 5 minutes. Try refreshing the page or uploading fewer files.'));
          }
        }, IDLE_TIMEOUT_MS);
      };

      startIdleTimer();

      const settle = () => {
        settled = true;
        clearTimeout(idleTimer);
      };

      this.worker = new Worker(
        new URL('../workers/analysis-worker.ts', import.meta.url)
      );

      this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const msg = e.data;
        // Any message from the worker proves it's alive — reset idle timer
        startIdleTimer();
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
          case 'NIGHT_RESULT':
            onNightComplete?.(msg.night);
            break;
          case 'RESULTS':
            settle();
            this.terminate();
            resolve(msg.nights);
            break;
          case 'WARNING': {
            const isTruncated = msg.detail.includes('Truncated');
            // Truncated EDFs are common on SD cards (power loss, incomplete writes).
            // Non-truncated warnings are actual parsing issues worth tracking.
            if (!isTruncated) {
              Sentry.captureMessage(msg.detail, {
                level: 'warning',
                tags: {
                  checkpoint: msg.checkpoint,
                  ...msg.tags,
                },
              });
            }
            // Accumulate warnings on state for UI display
            this.setState({
              warnings: [...this.state.warnings, msg.detail],
            });
            break;
          }
          case 'SETTINGS_DIAGNOSTIC':
            this.settingsDiagnostic = msg;
            // Device data is saved to Supabase via /api/device-diagnostic below.
            // No Sentry capture needed — the API endpoint handles error tracking.
            // Save unknown device data to Supabase for future support
            fetch('/api/device-diagnostic', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                deviceModel: msg.deviceModel,
                signalLabels: msg.signalLabels,
                identificationText: msg.identificationText,
                hasStrFile: msg.hasStrFile,
              }),
            }).catch(() => { /* fire-and-forget */ });
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
        { type: 'ANALYZE', files, oximetryCSVs, deviceType, bmcSerial },
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
      status: 'processing',
      error: null,
      warning: null,
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
      const { oximetryByDate, oximetryTraceByDate } = await this.runOximetryWorker(oximetryCSVs);

      // Merge oximetry into cached nights
      const merged = cached.nights.map((night) => {
        const ox = oximetryByDate[night.dateStr];
        const trace = oximetryTraceByDate[night.dateStr];
        if (ox) {
          return { ...night, oximetry: ox, oximetryTrace: trace ?? null };
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
      const persistResult = persistResults(merged, therapyChangeDate);
      persistOximetryTraces(merged);

      this.setState({
        status: 'complete',
        nights: merged,
        therapyChangeDate,
        warning,
        persistenceWarning: persistResult.reason ?? null,
        progress: { current: 1, total: 1, stage: 'Complete' },
      });

      return merged;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      Sentry.captureException(err, { extra: { context: 'analysis-reanalysis' } });
      this.setState({ status: 'error', error });
      throw err;
    }
  }

  private runOximetryWorker(
    oximetryCSVs: string[]
  ): Promise<{ oximetryByDate: Record<string, OximetryResults>; oximetryTraceByDate: Record<string, OximetryTraceData> }> {
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
            resolve({ oximetryByDate: msg.oximetryByDate, oximetryTraceByDate: msg.oximetryTraceByDate });
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

  private debouncedPersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      if (this.incrementalNights.length > 0) {
        persistNightsIncremental(this.incrementalNights);
      }
    }, 2000);
  }

  private clearIncrementalState(): void {
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = null;
    }
    this.incrementalNights = [];
    this.removeBeforeUnload();
  }

  private installBeforeUnload(): void {
    this.removeBeforeUnload();
    this.boundBeforeUnload = () => {
      if (this.incrementalNights.length > 0) {
        try {
          persistNightsIncremental(this.incrementalNights);
        } catch {
          // Best effort — page is closing
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', this.boundBeforeUnload);
    }
  }

  private removeBeforeUnload(): void {
    if (this.boundBeforeUnload && typeof window !== 'undefined') {
      window.removeEventListener('beforeunload', this.boundBeforeUnload);
      this.boundBeforeUnload = null;
    }
  }

  terminate(): void {
    this.clearIncrementalState();
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
 * Restore oximetry traces from IndexedDB for nights that have
 * metrics but no trace (stripped during localStorage persistence).
 * Mutates the array in place for efficiency.
 */
async function restoreOximetryTraces(nights: NightResult[]): Promise<void> {
  const nightsNeedingTrace = nights.filter(
    (n) => n.oximetry !== null && n.oximetryTrace === null
  );
  if (nightsNeedingTrace.length === 0) return;

  const results = await Promise.allSettled(
    nightsNeedingTrace.map(async (night) => {
      const trace = await loadOximetryTrace(night.dateStr);
      if (trace) {
        night.oximetryTrace = trace;
      }
    })
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`[orchestrator] Failed to restore ${failed.length} oximetry trace(s) from IDB`);
  }
}

/**
 * Fire-and-forget store of oximetry traces to IndexedDB.
 */
function persistOximetryTraces(nights: NightResult[]): void {
  const nightsWithTrace = nights.filter((n) => n.oximetryTrace !== null);
  if (nightsWithTrace.length === 0) return;

  Promise.allSettled(
    nightsWithTrace.map((n) => storeOximetryTrace(n.dateStr, n.oximetryTrace!))
  ).catch(() => {
    // Non-critical — IDB errors are logged inside storeOximetryTrace
  });
}

/**
 * Restore per-breath data from IndexedDB for nights that have
 * NED results but no breaths array (stripped during localStorage persistence).
 * Attaches compact breath data as a _compactBreaths property for dashboard use.
 * Mutates the array in place for efficiency.
 */
async function restoreBreathData(nights: NightResult[]): Promise<void> {
  const nightsNeedingBreaths = nights.filter(
    (n) => n.ned.breathCount > 0 && (!n.ned.breaths || n.ned.breaths.length === 0)
  );
  if (nightsNeedingBreaths.length === 0) return;

  const results = await Promise.allSettled(
    nightsNeedingBreaths.map(async (night) => {
      const compactBreaths = await loadBreathData(night.dateStr);
      if (compactBreaths) {
        // Store compact breaths on the night for dashboard access
        (night as NightResult & { _compactBreaths?: CompactBreath[] })._compactBreaths = compactBreaths;
      }
    })
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`[orchestrator] Failed to restore ${failed.length} breath data set(s) from IDB`);
  }
}

/**
 * Fire-and-forget store of per-breath data to IndexedDB.
 * Uses the sampling rate from session data; defaults to 25 Hz if unavailable.
 */
function persistBreathData(nights: NightResult[]): void {
  const nightsWithBreaths = nights.filter(
    (n) => n.ned.breaths && n.ned.breaths.length > 0
  );
  if (nightsWithBreaths.length === 0) return;

  // Default sampling rate — actual rate varies by device but 25 Hz is
  // the most common (AirSense 10). The sampling rate is used to convert
  // sample indices to seconds in the compact representation.
  const DEFAULT_SAMPLING_RATE = 25;

  Promise.allSettled(
    nightsWithBreaths.map((n) =>
      storeBreathData(n.dateStr, n.ned.breaths!, DEFAULT_SAMPLING_RATE)
    )
  ).catch(() => {
    // Non-critical — IDB errors are logged inside storeBreathData
  });
}

/**
 * Restore PLD traces from IndexedDB for nights.
 * Attaches as _pldTrace property for dashboard access.
 * Mutates the array in place for efficiency.
 */
async function restorePLDTraces(nights: NightResult[]): Promise<void> {
  const results = await Promise.allSettled(
    nights.map(async (night) => {
      const pldTrace = await loadPLDTrace(night.dateStr);
      if (pldTrace) {
        (night as NightResult & { _pldTrace?: StoredPLDTrace })._pldTrace = pldTrace;
      }
    })
  );

  const failed = results.filter((r) => r.status === 'rejected');
  if (failed.length > 0) {
    console.error(`[orchestrator] Failed to restore ${failed.length} PLD trace(s) from IDB`);
  }
}

/**
 * Fire-and-forget store of PLD traces to IndexedDB.
 * Currently a no-op: PLD channel data is not yet extracted from the
 * analysis pipeline. When PLD extraction is added (e.g., from PLD.edf
 * or STR.edf detail channels), this function will persist the traces.
 */
function persistPLDTraces(_nights: NightResult[]): void {
  // PLD channel extraction is not yet implemented in the analysis worker.
  // This function is a forward-compatible stub — when PLD timeseries data
  // becomes available on NightResult (e.g., via a pldTrace field), it will
  // be persisted here using storePLDTrace().
}

/**
 * Merge cached nights with freshly-analyzed nights.
 * Cached wins for duplicate dates — fresh only fills gaps.
 * Exception: if cached night has no oximetry but fresh does, the
 * oximetry data is merged in (fills empty data).
 * Returns sorted most-recent-first.
 */
function mergeNights(
  cached: NightResult[],
  fresh: NightResult[]
): NightResult[] {
  const map = new Map<string, NightResult>();

  // Add fresh first
  for (const n of fresh) map.set(n.dateStr, n);

  // Cached overwrites fresh (cached wins), but preserve fresh oximetry
  // if cached is missing it (fills empty data)
  for (const n of cached) {
    const freshVersion = map.get(n.dateStr);
    if (freshVersion && !n.oximetry && freshVersion.oximetry) {
      map.set(n.dateStr, { ...n, oximetry: freshVersion.oximetry, oximetryTrace: freshVersion.oximetryTrace });
    } else {
      map.set(n.dateStr, n);
    }
  }

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
    const curr = nights[i]!.settings;
    const prev = nights[i + 1]!.settings;

    if (
      curr.epap !== prev.epap ||
      curr.ipap !== prev.ipap ||
      curr.papMode !== prev.papMode ||
      curr.pressureSupport !== prev.pressureSupport
    ) {
      return nights[i]!.dateStr;
    }
  }

  return null;
}

// Singleton
export const orchestrator = new AnalysisOrchestrator();
