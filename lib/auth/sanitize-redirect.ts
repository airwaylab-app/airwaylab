/**
 * Validate the `next` redirect parameter to prevent open redirect attacks.
 * Only allows relative paths starting with `/` and no protocol/host tricks.
 */
export function sanitizeRedirectPath(raw: string | null): string {
  const fallback = '/analyze';
  if (!raw) return fallback;

  // Must start with `/` and NOT `//` (protocol-relative URL)
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback;

  // Block any URL with protocol schemes
  if (/^\/[a-z]+:/i.test(raw)) return fallback;

  // Block backslash tricks (some browsers normalize `\/` to `//`)
  if (raw.includes('\\')) return fallback;

  return raw;
}
