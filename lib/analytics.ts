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

// Predefined events for consistency
export const events = {
  /** User uploaded SD card files */
  uploadStart: () => trackEvent('Upload Start'),

  /** Analysis completed successfully */
  analysisComplete: (nightCount: number) =>
    trackEvent('Analysis Complete', { nights: nightCount }),

  /** User loaded demo mode */
  demoLoaded: () => trackEvent('Demo Loaded'),

  /** User exported data */
  export: (format: 'csv' | 'json' | 'forum') =>
    trackEvent('Export', { format }),

  /** User subscribed to email list */
  emailSubscribe: (source: string) =>
    trackEvent('Email Subscribe', { source }),
} as const;
