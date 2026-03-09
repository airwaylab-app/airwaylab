import type { NextRequest } from 'next/server';

/**
 * L8: CSRF protection — validate that POST requests originate from our own domain.
 * Checks the Origin header against NEXT_PUBLIC_APP_URL.
 * Returns true if the request is safe, false if it should be rejected.
 *
 * Note: Stripe webhook route should NOT use this (Stripe sends from its own servers).
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  if (!origin) return false;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    // In development, allow localhost origins
    return origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  }

  // Compare origins (protocol + host, no trailing slash)
  const expectedOrigin = new URL(appUrl).origin;
  return origin === expectedOrigin;
}
