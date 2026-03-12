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

  // ── Share link events ──────────────────────────────────────
  /** Share opt-in modal shown */
  shareOptinShown: () => trackEvent('share_optin_shown'),

  /** User opted in to share single night */
  shareOptinSingle: () => trackEvent('share_optin_single'),

  /** User opted in to share all nights */
  shareOptinAll: () => trackEvent('share_optin_all'),

  /** User checked "remember my choice" */
  shareOptinRemembered: () => trackEvent('share_optin_remembered'),

  /** Share link created */
  shareCreated: (nightsCount: number, shareScope: string) =>
    trackEvent('share_created', { nightsCount, shareScope }),

  /** Shared analysis viewed */
  shareViewed: () => trackEvent('share_viewed'),

  /** Share link copied */
  shareCopied: () => trackEvent('share_copied'),

  /** Expired share link visited */
  shareExpiredView: () => trackEvent('share_expired_view'),

  /** Share EDF files uploaded successfully */
  shareFilesUploaded: (fileCount: number, totalBytes: number) =>
    trackEvent('share_files_uploaded', { file_count: fileCount, total_bytes: totalBytes }),

  /** Share EDF file upload failed */
  shareFilesUploadFailed: (errorType: string) =>
    trackEvent('share_files_upload_failed', { error_type: errorType }),

  /** Shared waveform loaded and rendered in shared view */
  shareWaveformLoaded: () => trackEvent('share_waveform_loaded'),

  // ── Providers page events ──────────────────────────────────
  /** Providers page viewed */
  providersPageView: () => trackEvent('providers_page_view'),

  /** "Try the Demo" clicked on providers page */
  providersDemoClick: () => trackEvent('providers_demo_click'),

  /** "Get in Touch" clicked on providers page */
  providersContactClick: () => trackEvent('providers_contact_click'),

  /** Provider interest form submitted */
  providersContactSubmit: () => trackEvent('providers_contact_submit'),

  // ── AI Insights Conversion Funnel ──────────────────────────
  /** Locked AI insight cards rendered for anonymous user */
  aiTeaserShown: (nightCount: number, isReturning: boolean) =>
    trackEvent('AI Teaser Shown', { night_count: nightCount, is_returning: isReturning }),

  /** Anonymous user clicks "Create account" on AI teaser */
  aiTeaserCtaClicked: () =>
    trackEvent('AI Teaser CTA Clicked', { source: 'ai_teaser' }),

  /** Return-visit banner shown above upload */
  returningUserNudgeShown: (previousNights: number) =>
    trackEvent('Returning User Nudge Shown', { previous_nights: previousNights }),

  /** Return-visit banner CTA clicked */
  returningUserNudgeClicked: () =>
    trackEvent('Returning User Nudge Clicked'),

  /** User checks consent checkbox in AuthModal */
  authConsentChecked: () =>
    trackEvent('Auth Consent Checked'),

  /** Background EDF upload begins after analysis */
  edfAutoUploadStarted: (fileCount: number, totalMb: number) =>
    trackEvent('EDF Auto Upload Started', { file_count: fileCount, total_mb: totalMb }),

  /** Background EDF upload finished */
  edfAutoUploadCompleted: (fileCount: number, totalMb: number, durationMs: number) =>
    trackEvent('EDF Auto Upload Completed', { file_count: fileCount, total_mb: totalMb, duration_ms: durationMs }),

  /** Background EDF upload failed */
  edfAutoUploadFailed: (errorType: string) =>
    trackEvent('EDF Auto Upload Failed', { error_type: errorType }),

  /** Per-breath + aggregate data stored to analysis_data */
  analysisDataStored: (nightCount: number, breathCount: number) =>
    trackEvent('Analysis Data Stored', { night_count: nightCount, breath_count: breathCount }),

  /** User clicks "Generate AI Insights" button */
  aiInsightsButtonClicked: (tier: string, creditsRemaining: number) =>
    trackEvent('AI Insights Button Clicked', { tier, credits_remaining: creditsRemaining }),

  /** AI insights successfully returned and displayed */
  aiInsightsGenerated: (tier: string, insightCount: number, isDeep: boolean) =>
    trackEvent('AI Insights Generated', { tier, insight_count: insightCount, is_deep: isDeep }),

  /** AI insight request failed */
  aiInsightsFailed: (tier: string, errorType: string) =>
    trackEvent('AI Insights Failed', { tier, error_type: errorType }),

  /** Free user hits 3/month limit */
  aiCreditsExhausted: () =>
    trackEvent('AI Credits Exhausted'),

  /** Upgrade teaser cards shown to free user after AI insights */
  deepTeaserShown: () =>
    trackEvent('Deep Teaser Shown'),

  /** Free user clicks upgrade CTA on deep teaser */
  deepTeaserCtaClicked: () =>
    trackEvent('Deep Teaser CTA Clicked'),

  /** User clicks "Delete my data" in account settings */
  dataDeletionRequested: (fileCount: number, nightCount: number) =>
    trackEvent('Data Deletion Requested', { file_count: fileCount, night_count: nightCount }),

  /** Server-side data deletion successful */
  dataDeletionCompleted: () =>
    trackEvent('Data Deletion Completed'),
} as const;
