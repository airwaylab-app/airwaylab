import * as Sentry from '@sentry/nextjs';

/**
 * Sanitize errors before sending to Sentry.
 * Supabase/Cloudflare transient errors (520, 502, etc.) return full HTML pages
 * as the error message, which creates noisy, unreadable Sentry issues.
 */
export function captureApiError(
  err: unknown,
  tags: Record<string, string | boolean>
): void {
  const errMsg = err instanceof Error ? err.message : String(err);
  const isUpstreamHtml = errMsg.includes('<!DOCTYPE') || errMsg.includes('<html');

  let sanitized: Error;
  if (isUpstreamHtml) {
    sanitized = new Error(`Supabase upstream error (HTML response) in ${tags.route ?? 'unknown'}`);
  } else if (err instanceof Error) {
    sanitized = err;
  } else {
    // Wrap non-Error objects (e.g. Supabase PostgrestError) for readable Sentry issues
    const msg = typeof (err as Record<string, unknown>)?.message === 'string'
      ? (err as Record<string, unknown>).message as string
      : errMsg;
    sanitized = new Error(`API error in ${tags.route ?? 'unknown'}: ${msg}`);
  }

  Sentry.captureException(sanitized, {
    tags: { ...tags, upstream_html: isUpstreamHtml },
  });
}
