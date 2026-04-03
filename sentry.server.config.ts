import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Track which deploy introduced each error
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'dev',

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  tracesSampleRate: 0.01,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  beforeSend(event) {
    // Supabase storage rejects internally for duplicate uploads before our code handles it.
    // The contribute-waveforms endpoint treats duplicates as idempotent success (upsert: false by design).
    const message = event.exception?.values?.[0]?.value ?? '';
    if (message.includes('The resource already exists')) {
      return null;
    }

    // Anthropic transient errors (rate limits, timeouts, connection, server errors)
    // are not AirwayLab bugs. Sample at 10% to track volume trends without burning budget.
    const errorType = (event.tags as Record<string, string> | undefined)?.error_type;
    if (
      errorType === 'rate_limit' ||
      errorType === 'connection_timeout' ||
      errorType === 'connection' ||
      errorType === 'server_error'
    ) {
      return Math.random() < 0.1 ? event : null;
    }

    return event;
  },
});
