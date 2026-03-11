// ============================================================
// AirwayLab — Privacy-First Analytics (Plausible)
// No cookies, no fingerprinting, GDPR/CCPA compliant.
// ============================================================

/**
 * Fire a custom Plausible event. No-ops if Plausible isn't loaded.
 * @see https://plausible.io/docs/custom-event-goals
 */
export function trackEvent(
  eventName: string,
  props?: Record<string, string | number | boolean>
) {
  if (typeof window !== 'undefined' && 'plausible' in window) {
    (window as unknown as { plausible: (name: string, opts?: { props: Record<string, string | number | boolean> }) => void })
      .plausible(eventName, props ? { props } : undefined);
  }
}

// ── Existing events ──────────────────────────────────────────
export const events = {
  /** User uploaded SD card files */
  uploadStart: () => trackEvent('Upload Start'),

  /** Analysis completed successfully */
  analysisComplete: (nightCount: number) =>
    trackEvent('Analysis Complete', { nights: nightCount }),

  /** User loaded demo mode */
  demoLoaded: () => trackEvent('Demo Loaded'),

  /** User exported data */
  export: (format: 'csv' | 'json' | 'forum' | 'pdf' | 'chart_image') =>
    trackEvent('Export', { format }),

  /** User subscribed to email list */
  emailSubscribe: (source: string) =>
    trackEvent('Email Subscribe', { source }),

  // ── Conversion funnel ────────────────────────────────────
  /** User viewed the pricing page */
  pricingViewed: () => trackEvent('Pricing Viewed'),

  /** User clicked checkout (before Stripe redirect) */
  checkoutStarted: (tier: string, interval: string) =>
    trackEvent('Checkout Started', { tier, interval }),

  /** Auth modal opened */
  authStarted: (source: string) =>
    trackEvent('Auth Started', { source }),

  /** Magic link sent successfully */
  authMagicLinkSent: () => trackEvent('Auth Magic Link Sent'),

  /** AI insight requested */
  aiInsightRequested: (tier: string) =>
    trackEvent('AI Insight Requested', { tier }),

  /** AI upsell CTA shown to free user */
  aiUpsellShown: () => trackEvent('AI Upsell Shown'),

  // ── Product engagement ───────────────────────────────────
  /** User switched dashboard tab */
  tabViewed: (tab: string) => trackEvent('Tab Viewed', { tab }),

  /** User switched to a different night */
  nightSwitched: (nightCount: number) =>
    trackEvent('Night Switched', { nights: nightCount }),

  /** User customised a threshold value */
  thresholdCustomized: (metric: string) =>
    trackEvent('Threshold Customized', { metric }),

  /** User contributed data */
  contributionOptedIn: () => trackEvent('Contribution Opted In'),

  /** User dismissed contribution banner */
  contributionDismissed: () => trackEvent('Contribution Dismissed'),

  /** User submitted feedback */
  feedbackSubmitted: (type: string, page: string) =>
    trackEvent('Feedback Submitted', { type, page }),

  // ── Retention signals ────────────────────────────────────
  /** Returning user uploaded new data */
  returningUserUpload: (lifetimeNights: number) =>
    trackEvent('Returning User Upload', { lifetime_nights: lifetimeNights }),

  /** User enabled cloud sync */
  cloudSyncUsed: () => trackEvent('Cloud Sync Used'),
} as const;
