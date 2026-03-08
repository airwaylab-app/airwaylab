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
    this.setState({
      ...initialState,
      status: 'uploading',
      progress: { current: 0, total: 1, stage: 'Reading files...' },
    });

    try {
      // Read SD card files into ArrayBuffers
      const files = await readFileList(sdFiles);
      this.setState({
        progress: { current: 0, total: 1, stage: 'Reading oximetry files...' },
      });

      // Read oximetry CSVs as text
      let oximetryCSVs: string[] | undefined;
      if (oximetryFiles && oximetryFiles.length > 0) {
        oximetryCSVs = await readCSVFiles(oximetryFiles);
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
        reject(new Error(err.message || 'Worker error'));
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
  files: FileList | File[]
): Promise<{ buffer: ArrayBuffer; path: string }[]> {
  const arr = Array.from(files);

  // Read all files in parallel for faster uploads
  return Promise.all(
    arr.map(async (file) => {
      const path =
        (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
      const buffer = await file.arrayBuffer();
      return { buffer, path };
    })
  );
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
