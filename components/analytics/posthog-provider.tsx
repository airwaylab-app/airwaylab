'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

import {
  ANALYTICS_CONSENT_EVENT,
  hasAnalyticsConsent,
} from '@/lib/analytics-consent';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
// EU Cloud ingestion host — EU SaMD must keep analytics in the EU region.
// Never default to the US host (us.i.posthog.com).
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!POSTHOG_KEY) return;

    // Consent-gated, opt-out by default: do not init/capture until the user
    // has explicitly granted analytics consent.
    const init = () => {
      if (posthog.__loaded) return;
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        person_profiles: 'identified_only',
        capture_pageview: false,
        capture_pageleave: true,
        persistence: 'memory', // no cookies / no localStorage identifiers
        ip: false, // disables $ip capture — required by privacy policy claim
        respect_dnt: true, // honours browser DNT — required by privacy policy claim
        // Belt-and-suspenders: stay opted out at the SDK level until consent.
        opt_out_capturing_by_default: true,
      });
      posthog.opt_in_capturing();
    };

    if (hasAnalyticsConsent()) {
      init();
      return;
    }

    // Wait for an explicit consent grant before initialising.
    const onConsent = (e: Event) => {
      if ((e as CustomEvent<{ granted: boolean }>).detail?.granted) {
        init();
      }
    };
    window.addEventListener(ANALYTICS_CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(ANALYTICS_CONSENT_EVENT, onConsent);
  }, []);

  if (!POSTHOG_KEY) {
    return <>{children}</>;
  }

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
