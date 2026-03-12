// ============================================================
// AirwayLab — Upload Orchestrator
// Manages background upload of SD card files to cloud storage.
// Handles hashing, dedup, presigned uploads, and progress.
// ============================================================

import { extractNightDate } from '@/lib/file-manifest';
import type { UploadState, UploadResult } from './types';
import type { WorkerMessage } from './hash-worker';

type UploadListener = (state: UploadState) => void;

const CONCURRENCY = 3;
const RETRY_DELAY_MS = 2000;

function getFilePath(file: File): string {
  return (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

class UploadOrchestrator {
  private state: UploadState = {
    status: 'idle',
    progress: { current: 0, total: 0, bytesUploaded: 0, bytesTotal: 0, stage: 'hashing' },
    result: null,
    error: null,
  };
  private listeners = new Set<UploadListener>();
  private abortController: AbortController | null = null;
  private hashWorker: Worker | null = null;

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
    this.setState({ status: 'idle', error: 'Upload cancelled' });
  }

  /**
   * Upload files to cloud storage. Handles hashing, dedup, and upload.
   */
  async upload(files: File[]): Promise<UploadResult> {
    if (files.length === 0) {
      return { uploaded: 0, skipped: 0, failed: 0, errors: [] };
    }

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    this.setState({
      status: 'hashing',
      progress: { current: 0, total: files.length, bytesUploaded: 0, bytesTotal: totalBytes, stage: 'hashing' },
      result: null,
      error: null,
    });

    try {
      // Step 1: Hash all files
      const fileHashes = await this.hashFiles(files, signal);
      if (signal.aborted) throw new Error('Cancelled');

      // Step 2: Check which files already exist
      this.setState({
        status: 'checking',
        progress: { ...this.state.progress, stage: 'checking' },
      });

      const existingHashes = await this.checkExisting(files, fileHashes, signal);
      if (signal.aborted) throw new Error('Cancelled');

      // Step 3: Upload new files
      const toUpload = files.filter((_, i) => !existingHashes.has(fileHashes[i]));
      const skipped = files.length - toUpload.length;

      this.setState({
        status: 'uploading',
        progress: {
          current: 0,
          total: toUpload.length,
          bytesUploaded: 0,
          bytesTotal: toUpload.reduce((sum, f) => sum + f.size, 0),
          stage: 'uploading',
        },
      });

      const result = await this.uploadFiles(toUpload, fileHashes, files, signal);
      result.skipped = skipped;

      this.setState({
        status: 'complete',
        progress: { ...this.state.progress, stage: 'complete' },
        result,
      });

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      if (error !== 'Cancelled') {
        console.error('[upload-orchestrator] Upload failed:', error);
      }
      this.setState({ status: 'error', error });
      return { uploaded: 0, skipped: 0, failed: files.length, errors: [error] };
    }
  }

  private async hashFiles(files: File[], signal: AbortSignal): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const hashes: string[] = new Array(files.length).fill('');

      // Read files into ArrayBuffers in batches
      const readAndHash = async () => {
        const BATCH_SIZE = 10;
        const allBuffers: Array<{ index: number; buffer: ArrayBuffer }> = [];

        for (let i = 0; i < files.length; i += BATCH_SIZE) {
          if (signal.aborted) { reject(new Error('Cancelled')); return; }

          const batch = files.slice(i, i + BATCH_SIZE);
          const buffers = await Promise.all(
            batch.map(async (file, j) => ({
              index: i + j,
              buffer: await file.arrayBuffer(),
            }))
          );
          allBuffers.push(...buffers);
        }

        // Start hash worker
        this.hashWorker = new Worker(
          new URL('./hash-worker.ts', import.meta.url)
        );

        let completed = 0;

        this.hashWorker.onmessage = (e: MessageEvent<WorkerMessage>) => {
          const msg = e.data;
          if (msg.type === 'HASH_RESULT') {
            hashes[msg.index] = msg.hash;
          } else if (msg.type === 'HASH_PROGRESS') {
            completed = msg.completed;
            this.setState({
              progress: { ...this.state.progress, current: completed, total: files.length },
            });
            if (completed === files.length) {
              this.hashWorker?.terminate();
              this.hashWorker = null;
              resolve(hashes);
            }
          } else if (msg.type === 'HASH_ERROR') {
            this.hashWorker?.terminate();
            this.hashWorker = null;
            reject(new Error(`Hash failed for file ${msg.index}: ${msg.error}`));
          }
        };

        this.hashWorker.onerror = (err) => {
          this.hashWorker?.terminate();
          this.hashWorker = null;
          reject(new Error(err.message || 'Hash worker failed'));
        };

        this.hashWorker.postMessage(
          { type: 'HASH_FILES', files: allBuffers },
          allBuffers.map(b => b.buffer)
        );
      };

      readAndHash().catch(reject);
    });
  }

  private async checkExisting(
    files: File[],
    hashes: string[],
    signal: AbortSignal
  ): Promise<Set<string>> {
    const hashEntries = files.map((file, i) => ({
      filePath: getFilePath(file),
      fileHash: hashes[i],
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

    // Process with concurrency limit
    const queue = [...toUpload];
    const running: Promise<void>[] = [];

    const processOne = async (file: File) => {
      const originalIndex = allFiles.indexOf(file);
      const hash = allHashes[originalIndex];
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
      } catch {
        // Retry once
        try {
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
          if (signal.aborted) throw new Error('Cancelled');
          const uploaded = await this.uploadSingleFile(file, filePath, fileName, hash, nightDate, signal);
          if (uploaded) result.uploaded++;
          else result.skipped++;
        } catch (retryErr) {
          result.failed++;
          result.errors.push(`${fileName}: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`);
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
        throw new Error('Cloud sync requires an active session. Please sign in again.');
      }
      throw new Error(err.error || `Presign failed: ${presignRes.status}`);
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
      throw new Error(`Upload failed: ${uploadRes.status}`);
    }

    // Step 3: Confirm upload
    await fetch('/api/files/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ fileId: presignData.fileId }),
      signal,
    });

    return true;
  }

  reset(): void {
    this.abort();
    this.setState({
      status: 'idle',
      progress: { current: 0, total: 0, bytesUploaded: 0, bytesTotal: 0, stage: 'hashing' },
      result: null,
      error: null,
    });
  }
}

// Singleton
export const uploadOrchestrator = new UploadOrchestrator();
