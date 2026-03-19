import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  tracesSampleRate: 0.01,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  // Enable Sentry structured logging (Sentry.logger.info/warn/etc.)
  _experiments: { enableLogs: true },

  beforeSend(event) {
    // Supabase storage rejects internally for duplicate uploads before our code handles it.
    // The contribute-waveforms endpoint treats duplicates as idempotent success (upsert: false by design).
    const message = event.exception?.values?.[0]?.value ?? '';
    if (message.includes('The resource already exists')) {
      return null;
    }
    return event;
  },
});
