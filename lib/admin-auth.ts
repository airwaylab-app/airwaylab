/**
 * Admin authentication helper for internal API routes.
 * Uses a shared secret (ADMIN_API_KEY) — not user auth.
 */

import crypto from 'crypto';

export function validateAdminAuth(
  providedKey: string | null | undefined,
  configuredKey: string | undefined
): { authorized: boolean; error?: string } {
  if (!configuredKey) {
    return { authorized: false, error: 'Admin API key not configured' };
  }

  if (!providedKey) {
    return { authorized: false, error: 'Missing x-admin-api-key header' };
  }

  const a = Buffer.from(providedKey);
  const b = Buffer.from(configuredKey);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { authorized: false, error: 'Invalid admin API key' };
  }

  return { authorized: true };
}
