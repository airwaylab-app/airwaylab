import { execSync } from 'child_process';
import bundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Git short hash for build traceability (falls back to timestamp in non-git envs like Vercel)
const gitSha = (() => {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? 'unknown';
  }
})();

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      // Wave 1 duplicate-slug 301s (AIR-1609 task 3, wave 1)
      // Losers with no pending content merge — redirect immediately.
      {
        source: '/blog/oscar-cpap-software-alternatives',
        destination: '/blog/oscar-alternatives-web-cpap-2026',
        permanent: true,
      },
      {
        source: '/blog/how-to-read-cpap-data',
        destination: '/blog/how-to-read-cpap-therapy-report',
        permanent: true,
      },
      {
        source: '/blog/what-is-flow-limitation-cpap',
        destination: '/blog/understanding-flow-limitation',
        permanent: true,
      },
    ];
  },

  env: {
    NEXT_PUBLIC_BUILD_ID: new Date().toISOString(),
    NEXT_PUBLIC_GIT_SHA: gitSha,
  },

  // Enable source maps in CI when uploading to Sentry
  productionBrowserSourceMaps: Boolean(process.env.CI),

  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
    };
    return config;
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://eu-assets.i.posthog.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co https://checkout.stripe.com https://api.stripe.com https://*.ingest.de.sentry.io https://eu.i.posthog.com https://eu-assets.i.posthog.com",
              "frame-src https://checkout.stripe.com https://js.stripe.com",
              "worker-src 'self' blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

const baseConfig = withBundleAnalyzer(nextConfig);

export default (process.env.SENTRY_AUTH_TOKEN || process.env.CI)
  ? withSentryConfig(baseConfig, {
      // For all available options, see:
      // https://github.com/getsentry/sentry-webpack-plugin#options
      sentryUrl: 'https://de.sentry.io/',
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      webpack: {
        treeshake: { removeDebugLogging: true },
        autoInstrumentServerFunctions: false,
        autoInstrumentMiddleware: false,
        autoInstrumentAppDirectory: true,
      },
    })
  : baseConfig;
