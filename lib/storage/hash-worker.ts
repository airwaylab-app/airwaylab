// ============================================================
// AirwayLab — File Hash Worker
// Computes SHA-256 hashes of files off the main thread.
// NOT in the protected workers/ directory.
// ============================================================

interface HashRequest {
  type: 'HASH_FILES';
  files: Array<{ index: number; buffer: ArrayBuffer }>;
}

interface HashResult {
  type: 'HASH_RESULT';
  index: number;
  hash: string;
}

interface HashProgress {
  type: 'HASH_PROGRESS';
  completed: number;
  total: number;
}

interface HashError {
  type: 'HASH_ERROR';
  index: number;
  error: string;
}

type WorkerMessage = HashResult | HashProgress | HashError;

self.onmessage = async (e: MessageEvent<HashRequest>) => {
  const { files } = e.data;
  let completed = 0;

  for (const { index, buffer } of files) {
    try {
      const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const result: HashResult = { type: 'HASH_RESULT', index, hash };
      self.postMessage(result);
    } catch (err) {
      const error: HashError = {
        type: 'HASH_ERROR',
        index,
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(error);
    }

    completed++;
    const progress: HashProgress = { type: 'HASH_PROGRESS', completed, total: files.length };
    self.postMessage(progress);
  }
};

// Type export for the main thread
export type { WorkerMessage, HashRequest };
