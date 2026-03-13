// ============================================================
// AirwayLab — Hash Cache
// Caches SHA-256 hashes in localStorage to avoid re-hashing
// files on upload resume. Uses file fingerprint (path + size +
// lastModified) as the cache key.
// ============================================================

const STORAGE_KEY = 'airwaylab_hash_cache';
const MAX_SIZE_BYTES = 500 * 1024; // 500KB
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CacheEntry {
  hash: string;
  ts: number;
}

interface CacheData {
  entries: Record<string, CacheEntry>;
}

function makeKey(filePath: string, fileSize: number, lastModified: number): string {
  return `${filePath}|${fileSize}|${lastModified}`;
}

export class HashCache {
  private entries: Map<string, CacheEntry>;

  constructor() {
    this.entries = new Map();
    this.load();
  }

  private load(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;

      const data: CacheData = JSON.parse(raw);
      if (!data.entries || typeof data.entries !== 'object') {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const now = Date.now();
      for (const [key, entry] of Object.entries(data.entries)) {
        // Skip expired entries
        if (now - entry.ts > TTL_MS) continue;
        this.entries.set(key, entry);
      }
    } catch {
      // Corrupted data — clear and start fresh
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  get(filePath: string, fileSize: number, lastModified: number): string | undefined {
    const key = makeKey(filePath, fileSize, lastModified);
    const entry = this.entries.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.ts > TTL_MS) {
      this.entries.delete(key);
      return undefined;
    }

    return entry.hash;
  }

  set(filePath: string, fileSize: number, lastModified: number, hash: string): void {
    const key = makeKey(filePath, fileSize, lastModified);
    this.entries.set(key, { hash, ts: Date.now() });
  }

  flush(): void {
    if (typeof window === 'undefined') return;

    // Prune to stay under size cap
    this.pruneToSizeCap();

    try {
      const data: CacheData = {
        entries: Object.fromEntries(this.entries),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // localStorage full or unavailable — ignore
    }
  }

  private pruneToSizeCap(): void {
    // Check actual serialised size
    const serialise = (): string =>
      JSON.stringify({ entries: Object.fromEntries(this.entries) });

    let json = serialise();
    if (json.length <= MAX_SIZE_BYTES) return;

    // Sort entries by timestamp ascending (oldest first)
    const sorted = Array.from(this.entries.entries()).sort((a, b) => a[1].ts - b[1].ts);

    // Remove oldest entries until under cap
    for (const [key] of sorted) {
      this.entries.delete(key);
      json = serialise();
      if (json.length <= MAX_SIZE_BYTES) break;
    }
  }
}
