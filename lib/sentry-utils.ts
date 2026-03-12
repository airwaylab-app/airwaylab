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

  const sanitized = isUpstreamHtml
    ? new Error(`Supabase upstream error (HTML response) in ${tags.route ?? 'unknown'}`)
    : err;

  Sentry.captureException(sanitized, {
    tags: { ...tags, upstream_html: isUpstreamHtml },
  });
}
