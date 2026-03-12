/**
 * Tests for codebase-audit-scope-boundary spec.
 * Covers: safeLocalStorage utility, IndexedDB Sentry captures,
 * rate limit tightening, and Stripe webhook atomicity.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Item 1: safeLocalStorage utility ────────────────────────────

describe('safeLocalStorage utility', () => {
  const original = globalThis.localStorage;

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      value: original,
      writable: true,
      configurable: true,
    });
  });

  function mockThrowingStorage() {
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: () => { throw new DOMException('SecurityError'); },
        setItem: () => { throw new DOMException('QuotaExceededError'); },
        removeItem: () => { throw new DOMException('SecurityError'); },
        clear: () => { throw new DOMException('SecurityError'); },
        length: 0,
        key: () => null,
      },
      writable: true,
      configurable: true,
    });
  }

  it('safeGetItem returns null when localStorage throws SecurityError', async () => {
    mockThrowingStorage();
    vi.resetModules();
    const { safeGetItem } = await import('@/lib/safe-local-storage');
    expect(safeGetItem('test-key')).toBeNull();
  });

  it('safeSetItem returns false when localStorage throws QuotaExceededError', async () => {
    mockThrowingStorage();
    vi.resetModules();
    const { safeSetItem } = await import('@/lib/safe-local-storage');
    expect(safeSetItem('test-key', 'value')).toBe(false);
  });

  it('safeRemoveItem does not throw when localStorage throws', async () => {
    mockThrowingStorage();
    vi.resetModules();
    const { safeRemoveItem } = await import('@/lib/safe-local-storage');
    expect(() => safeRemoveItem('test-key')).not.toThrow();
  });

  it('safeGetItem/safeSetItem/safeRemoveItem work normally when localStorage is available', async () => {
    // Provide a working in-memory localStorage mock
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, 'localStorage', {
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => { store.set(key, value); },
        removeItem: (key: string) => { store.delete(key); },
        clear: () => { store.clear(); },
        length: 0,
        key: () => null,
      },
      writable: true,
      configurable: true,
    });
    vi.resetModules();
    const { safeGetItem, safeSetItem, safeRemoveItem } = await import('@/lib/safe-local-storage');

    expect(safeSetItem('test-safe-ls', 'hello')).toBe(true);
    expect(safeGetItem('test-safe-ls')).toBe('hello');
    safeRemoveItem('test-safe-ls');
    expect(safeGetItem('test-safe-ls')).toBeNull();
  });
});

// ── Item 2: IndexedDB Sentry captures ───────────────────────────

describe('IndexedDB Sentry captures in waveform-idb.ts', () => {
  it('all catch blocks call Sentry.captureMessage', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'lib/waveform-idb.ts'),
      'utf-8'
    );

    // Should import Sentry
    expect(content).toContain("import * as Sentry from '@sentry/nextjs'");

    // Should have captureMessage calls for each operation
    expect(content).toContain('IndexedDB store failed');
    expect(content).toContain('IndexedDB load unavailable');
    expect(content).toContain('IndexedDB delete failed');
    expect(content).toContain('IndexedDB cleanup failed');
    expect(content).toContain('IndexedDB clearAll failed');
  });

  it('Sentry messages include module: waveform-idb tag', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'lib/waveform-idb.ts'),
      'utf-8'
    );

    // Count occurrences of the tag pattern
    const tagMatches = content.match(/module:\s*'waveform-idb'/g);
    expect(tagMatches).not.toBeNull();
    expect(tagMatches!.length).toBeGreaterThanOrEqual(5);
  });
});

// ── Item 4: Rate limit tightening ───────────────────────────────

describe('Rate limit tightening', () => {
  it('community-insights rate limit is 10 req/min', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'app/api/community-insights/route.ts'),
      'utf-8'
    );
    // Should contain max: 10 (not max: 30)
    expect(content).toMatch(/max:\s*10/);
    expect(content).not.toMatch(/max:\s*30/);
  });

  it('health route imports and uses RateLimiter', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'app/api/health/route.ts'),
      'utf-8'
    );
    expect(content).toContain('RateLimiter');
    expect(content).toContain('getRateLimitKey');
    expect(content).toContain('429');
  });

  it('version route imports and uses RateLimiter', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'app/api/version/route.ts'),
      'utf-8'
    );
    expect(content).toContain('RateLimiter');
    expect(content).toContain('getRateLimitKey');
    expect(content).toContain('429');
  });
});

// ── Item 5: Stripe webhook atomicity ────────────────────────────

describe('Stripe webhook transaction atomicity', () => {
  it('outer catch deletes idempotency row before returning 500', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'app/api/webhooks/stripe/route.ts'),
      'utf-8'
    );

    // The catch block should delete from stripe_events before returning 500
    // Look for the compensating delete pattern
    expect(content).toMatch(/\.from\('stripe_events'\)\s*\.delete\(\)/);
    expect(content).toContain("eq('event_id', event.id)");
  });

  it('checkout.session.completed throws on subscription upsert failure', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'app/api/webhooks/stripe/route.ts'),
      'utf-8'
    );

    // After upsertErr check, should throw
    expect(content).toMatch(/upsertErr[\s\S]*?throw new Error/);
  });
});
