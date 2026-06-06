/**
 * Tests for codebase-audit-scope-boundary spec.
 * Covers: safeLocalStorage utility, IndexedDB Sentry captures,
 * rate limit tightening, and Stripe webhook atomicity.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
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

// ── Item 2: IndexedDB graceful degradation ───────────────────────────
// IndexedDB failures are expected in private browsing / strict privacy modes.
// Errors are logged to console.warn (Vercel logs) — NOT to Sentry, to avoid
// burning error budget on expected browser behavior.

describe('IndexedDB error handling in waveform-idb.ts', () => {
  it('catch blocks handle errors gracefully without Sentry', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'lib/waveform-idb.ts'),
      'utf-8'
    );

    // Should NOT import Sentry (graceful degradation, not actionable errors)
    expect(content).not.toContain("import * as Sentry from '@sentry/nextjs'");

    // Should have catch blocks (non-fatal handling)
    expect(content).toContain('catch');
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
  it('keeps the idempotency row on failure and re-drives it (ST1 — never deletes)', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'app/api/webhooks/stripe/route.ts'),
      'utf-8'
    );

    // ST1 replaced the old compensating-delete with a durable job-state record:
    // the row is kept and marked failed/dead so the subscription-drift cron can
    // re-drive it (Stripe already got 200 and will not retry on its own).
    // Deleting the row would silently drop the billing event — it must NOT happen.
    expect(content).not.toMatch(/\.from\('stripe_events'\)\s*\.delete\(\)/);
    // The failure path marks the row failed (or dead at the attempt cap).
    expect(content).toMatch(/status:\s*terminal\s*\?\s*'dead'\s*:\s*'failed'/);
    expect(content).toContain("eq('event_id', event.id)");
  });

  it('checkout.session.completed throws on subscription upsert failure', () => {
    const content = fs.readFileSync(
      path.resolve(process.cwd(), 'app/api/webhooks/stripe/route.ts'),
      'utf-8'
    );

    // After upsert error check, should throw
    expect(content).toMatch(/upsertResult\.error[\s\S]*?throw new Error/);
  });
});
