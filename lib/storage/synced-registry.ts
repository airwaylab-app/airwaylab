// ============================================================
// AirwayLab — Synced Files Registry
// Tracks which files have been successfully synced to cloud
// storage, so subsequent uploads can skip them entirely
// without hashing or checking the server.
// ============================================================

const STORAGE_KEY = 'airwaylab_synced_files';
const MAX_ENTRIES = 5000;
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

interface SyncedEntry {
  ts: number; // timestamp when synced
}

interface SyncedData {
  entries: Record<string, SyncedEntry>;
}

function makeKey(filePath: string, fileSize: number, lastModified: number): string {
  return `${filePath}|${fileSize}|${lastModified}`;
}

function getFilePath(file: File): string {
  return (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

export class SyncedRegistry {
  private entries: Map<string, SyncedEntry>;

  constructor() {
    this.entries = new Map();
    this.load();
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const data: SyncedData = JSON.parse(raw);
      if (!data.entries || typeof data.entries !== 'object') {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const now = Date.now();
      for (const [key, entry] of Object.entries(data.entries)) {
        if (now - entry.ts > TTL_MS) continue;
        this.entries.set(key, entry);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Check if a file is already known to be synced.
   */
  isSynced(file: File): boolean {
    const key = makeKey(getFilePath(file), file.size, file.lastModified);
    const entry = this.entries.get(key);
    if (!entry) return false;
    if (Date.now() - entry.ts > TTL_MS) {
      this.entries.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Mark a file as synced (after upload or server-confirmed duplicate).
   */
  markSynced(file: File): void {
    const key = makeKey(getFilePath(file), file.size, file.lastModified);
    this.entries.set(key, { ts: Date.now() });
  }

  /**
   * Filter a file list, returning only files not yet synced.
   */
  filterNew(files: File[]): { newFiles: File[]; alreadySynced: number } {
    const newFiles: File[] = [];
    let alreadySynced = 0;
    for (const file of files) {
      if (this.isSynced(file)) {
        alreadySynced++;
      } else {
        newFiles.push(file);
      }
    }
    return { newFiles, alreadySynced };
  }

  /**
   * Persist to localStorage.
   */
  flush(): void {
    if (typeof window === 'undefined') return;
    this.prune();
    try {
      const data: SyncedData = {
        entries: Object.fromEntries(this.entries),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage full — non-critical
    }
  }

  private prune(): void {
    if (this.entries.size <= MAX_ENTRIES) return;
    const sorted = Array.from(this.entries.entries()).sort((a, b) => a[1].ts - b[1].ts);
    while (this.entries.size > MAX_ENTRIES) {
      const oldest = sorted.shift();
      if (!oldest) break;
      this.entries.delete(oldest[0]);
    }
  }
}
