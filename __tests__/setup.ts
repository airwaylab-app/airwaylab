import '@testing-library/jest-dom';

// jsdom 28 ships a non-functional `localStorage` (its methods are undefined, see the
// "--localstorage-file" warning), so tests that use the GLOBAL localStorage rather than
// their own mock fail with "localStorage.clear is not a function". Install a working
// in-memory Storage per test file. Tests that define their own mock still override this.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

const memoryStorage = new MemoryStorage();
const sessionMemoryStorage = new MemoryStorage();
for (const target of [globalThis, typeof window !== 'undefined' ? window : undefined]) {
  if (!target) continue;
  Object.defineProperty(target, 'localStorage', {
    value: memoryStorage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(target, 'sessionStorage', {
    value: sessionMemoryStorage,
    configurable: true,
    writable: true,
  });
}
