// ============================================================
// AirwayLab — Analysis Orchestrator
// Manages web worker lifecycle and bridges UI ↔ worker
// ============================================================

import type {
  AnalysisState,
  NightResult,
  WorkerResponse,
} from './types';

type StateListener = (state: AnalysisState) => void;

const initialState: AnalysisState = {
  status: 'idle',
  progress: { current: 0, total: 0, stage: '' },
  nights: [],
  error: null,
  therapyChangeDate: null,
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
   */
  async analyze(
    sdFiles: FileList | File[],
    oximetryFiles?: FileList | File[]
  ): Promise<NightResult[]> {
    this.terminate();
    const sdArr = Array.from(sdFiles);
    const totalFiles = sdArr.length;
    this.setState({
      ...initialState,
      status: 'uploading',
      progress: { current: 0, total: totalFiles, stage: `Reading ${totalFiles} files...` },
    });

    try {
      // Read SD card files into ArrayBuffers with progress
      const files = await readFileList(sdArr, (done) => {
        this.setState({
          progress: { current: done, total: totalFiles, stage: `Reading files (${done}/${totalFiles})...` },
        });
      });

      // Read oximetry CSVs as text
      let oximetryCSVs: string[] | undefined;
      if (oximetryFiles && oximetryFiles.length > 0) {
        const oxArr = Array.from(oximetryFiles);
        this.setState({
          progress: { current: 0, total: oxArr.length, stage: `Reading ${oxArr.length} oximetry files...` },
        });
        oximetryCSVs = await readCSVFiles(oxArr);
      }

      this.setState({
        status: 'processing',
        progress: { current: 0, total: 1, stage: 'Starting analysis...' },
      });

      // Launch worker
      const nights = await this.runWorker(files, oximetryCSVs);

      // Detect therapy change date
      const therapyChangeDate = detectTherapyChange(nights);

      this.setState({
        status: 'complete',
        nights,
        therapyChangeDate,
        progress: { current: 1, total: 1, stage: 'Complete' },
      });

      return nights;
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
      // Safety timeout — 5 minutes is generous for even large SD cards
      const WORKER_TIMEOUT_MS = 5 * 60 * 1000;
      let settled = false;

      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          this.terminate();
          reject(new Error('Analysis timed out after 5 minutes. Your data may be too large or in an unsupported format.'));
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
