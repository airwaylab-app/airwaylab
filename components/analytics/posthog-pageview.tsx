'use client';

import { usePathname } from 'next/navigation';
import posthog from 'posthog-js';
import { useEffect } from 'react';

import { hasAnalyticsConsent } from '@/lib/analytics-consent';

export function PostHogPageview() {
  const pathname = usePathname();

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return;
    // Consent-gated, opt-out by default: PostHog only loads after consent.
    if (!posthog.__loaded || !hasAnalyticsConsent()) return;

    // Toggle session recording based on route — health data privacy
    if (pathname.startsWith('/analyze')) {
      posthog.set_config({ disable_session_recording: true });
    } else {
      posthog.set_config({ disable_session_recording: false });
    }

    // Capture path only — query params can carry auth tokens / status
    // (e.g. /auth/callback?auth=success&token=…). Never send the query string.
    posthog.capture('$pageview', {
      $current_url: window.location.origin + pathname,
    });
  }, [pathname]);

  return null;
}
