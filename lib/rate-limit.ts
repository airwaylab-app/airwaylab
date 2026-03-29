// ============================================================
// AirwayLab — Rate Limiter
// Persistent via Upstash Redis when configured, falls back to
// in-memory (resets per Vercel cold start) for local dev.
// ============================================================

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import * as Sentry from '@sentry/nextjs';
import { serverEnv } from '@/lib/env';

// ─── Upstash Redis client (singleton, created once) ─────────

let _redis: Redis | null = null;
let _upstashChecked = false;

function getRedis(): Redis | null {
  if (_upstashChecked) return _redis;
  _upstashChecked = true;

  const url = serverEnv.UPSTASH_REDIS_REST_URL;
  const token = serverEnv.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    _redis = new Redis({ url, token });
  } else {
    console.error('[rate-limit] Upstash not configured, using in-memory fallback (resets on cold start)');
  }

  return _redis;
}

// ─── In-memory fallback ─────────────────────────────────────

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  /** Window duration in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
  /** Use Upstash Redis for cross-instance persistence (default: false).
   *  Enable for abuse-sensitive routes (AI insights, Stripe, file uploads). */
  persistent?: boolean;
}

export class RateLimiter {
  private readonly map = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly max: number;
  private readonly persistent: boolean;
  private lastCleanup = Date.now();
  private upstash: Ratelimit | null = null;
  private upstashInitialised = false;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.persistent = options.persistent ?? false;
  }

  /**
   * Lazily initialise Upstash ratelimiter on first call.
   * Can't do this in constructor because env vars may not be loaded yet.
   */
  private getUpstash(): Ratelimit | null {
    if (this.upstashInitialised) return this.upstash;
    this.upstashInitialised = true;

    if (!this.persistent) return null;

    const redis = getRedis();
    if (redis) {
      this.upstash = new Ratelimit({
        redis,
        limiter: Ratelimit.fixedWindow(this.max, `${this.windowMs} ms`),
        prefix: 'airwaylab_rl',
      });
    }

    return this.upstash;
  }

  /**
   * Returns true if the key is rate-limited (exceeded max requests).
   * Uses Upstash Redis when configured, in-memory otherwise.
   * Fails open on Upstash errors (allows request, logs to Sentry).
   */
  async isLimited(key: string): Promise<boolean> {
    const upstash = this.getUpstash();

    if (upstash) {
      try {
        const { success } = await upstash.limit(key);
        return !success;
      } catch (err) {
        Sentry.captureException(err, {
          tags: { subsystem: 'rate-limit', fallback: 'fail-open' },
        });
        return false; // fail-open
      }
    }

    return this.inMemoryIsLimited(key);
  }

  /** Original in-memory implementation (fallback) */
  private inMemoryIsLimited(key: string): boolean {
    const now = Date.now();

    // Periodic cleanup of expired entries to prevent unbounded growth
    if (now - this.lastCleanup > this.windowMs) {
      this.map.forEach((v, k) => {
        if (now > v.resetAt) this.map.delete(k);
      });
      this.lastCleanup = now;
    }

    const entry = this.map.get(key);

    if (!entry || now > entry.resetAt) {
      this.map.set(key, { count: 1, resetAt: now + this.windowMs });
      return false;
    }

    entry.count++;
    return entry.count > this.max;
  }
}

/**
 * Extract a stable rate-limit key from a request.
 * Uses X-Forwarded-For (Vercel), falls back to 'unknown'.
 */
export function getRateLimitKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwarded) return forwarded;
  // Fallback: use a hash of user-agent + accept-language to differentiate unknown IPs
  const ua = request.headers.get('user-agent') ?? '';
  const lang = request.headers.get('accept-language') ?? '';
  const raw = `${ua}|${lang}`;
  // Simple FNV-1a-like hash for low-collision bucket keys
  let hash = 2166136261;
  for (let i = 0; i < raw.length; i++) {
    hash ^= raw.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `anon_${(hash >>> 0).toString(36)}`;
}

// ─── Rate limit key helpers ──────────────────────────────────

/**
 * Build a rate-limit key scoped to a specific user.
 * Authenticated routes should use this instead of IP-based keys
 * so users behind shared IPs (NAT, VPN) get their own bucket.
 */
export function getUserRateLimitKey(userId: string): string {
  return `user:${userId}`;
}

// ─── Pre-configured limiters ─────────────────────────────────

/** AI insights — community tier: 20 requests per hour per user */
export const aiRateLimiter = new RateLimiter({
  windowMs: 3_600_000,
  max: 20,
  persistent: true,
});

/** AI insights — paid tiers: 60 requests per hour per user */
export const aiPremiumRateLimiter = new RateLimiter({
  windowMs: 3_600_000,
  max: 60,
  persistent: true,
});

/** Checkout/portal: 10 requests per 15 minutes per IP */
export const stripeRateLimiter = new RateLimiter({
  windowMs: 900_000,
  max: 10,
  persistent: true,
});
