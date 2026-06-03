import * as Sentry from '@sentry/nextjs';

import { scrubEvent } from '@/lib/sentry-scrub';

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
    // Strip PII (ids, emails) before anything leaves for Sentry.
    return scrubEvent(event);
  },
});
