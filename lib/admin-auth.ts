/**
 * Admin authentication helper for internal API routes.
 * Uses a shared secret (ADMIN_API_KEY) — not user auth.
 */

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

  if (providedKey !== configuredKey) {
    return { authorized: false, error: 'Invalid admin API key' };
  }

  return { authorized: true };
}
