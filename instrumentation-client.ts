import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // We recommend adjusting this in production, or using tracesSampler.
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0,

  // Only capture events from the production domain and Vercel previews.
  // Filters out errors from locally saved pages opened via file:// protocol,
  // which produce spurious promise rejections from failed chunk loads.
  allowUrls: [/https?:\/\/(.*\.)?airwaylab\.app/, /https?:\/\/.*\.vercel\.app/],

  // You can remove this option if you're not planning to use the Sentry Session Replay feature
  integrations: [
    Sentry.replayIntegration({
      // Unmask by default so we can debug upload flows, errors, and navigation.
      // Health data in analysis results is masked via data-sentry-mask on the container.
      maskAllText: false,
      blockAllMedia: false,
      mask: ['[data-sentry-mask]'],
      // Detect dead clicks (no DOM mutation within 7s) and rage clicks (3+ rapid clicks)
      slowClickTimeout: 7000,
      // Capture request/response bodies for API routes in replays (metrics only, never raw waveforms)
      networkDetailAllowUrls: [/\/api\//],
    }),
  ],

  beforeSend(event) {
    // Belt-and-suspenders: also drop file:// events in case allowUrls
    // doesn't cover all code paths (e.g. missing request URL).
    const url = event.request?.url ?? '';
    if (url.startsWith('file:')) {
      return null;
    }

    // Filter out browser extension noise (password managers, ad blockers, etc.)
    const message = event.exception?.values?.[0]?.value ?? event.message ?? '';
    if (/Object Not Found Matching Id:\d+, MethodName:\w+, ParamCount:\d+/.test(message)) {
      return null;
    }

    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
