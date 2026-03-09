// ============================================================
// AirwayLab — In-Memory Rate Limiter
// Shared rate limiter for API routes. Resets per Vercel cold start.
// ============================================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimiterOptions {
  /** Window duration in milliseconds */
  windowMs: number;
  /** Maximum requests per window */
  max: number;
}

export class RateLimiter {
  private readonly map = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly max: number;
  private lastCleanup = Date.now();

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
  }

  /**
   * Returns true if the key is rate-limited (exceeded max requests).
   * Automatically resets after the window expires.
   */
  isLimited(key: string): boolean {
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

// ─── Pre-configured limiters ─────────────────────────────────

/** AI insights: 20 requests per hour per IP */
export const aiRateLimiter = new RateLimiter({
  windowMs: 3_600_000,
  max: 20,
});

/** Checkout/portal: 10 requests per 15 minutes per IP */
export const stripeRateLimiter = new RateLimiter({
  windowMs: 900_000,
  max: 10,
});
