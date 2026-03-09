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
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
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
