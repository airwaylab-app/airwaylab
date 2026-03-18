import type { NextRequest } from 'next/server';

/**
 * Check if a request's Content-Length header exceeds the given byte limit.
 * Safely handles missing, malformed, or spoofed Content-Length values.
 * Returns false (allow) when the header is absent — the body will still
 * be validated downstream by Zod / JSON parsing.
 */
export function exceedsPayloadLimit(request: NextRequest, maxBytes: number): boolean {
  const raw = request.headers.get('content-length');
  if (!raw) return false;
  const size = Number(raw);
  return !Number.isNaN(size) && size > maxBytes;
}
