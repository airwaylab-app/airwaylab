// ============================================================
// AirwayLab — Privacy-First Analytics (PostHog)
// No cookies, no fingerprinting, GDPR/CCPA compliant.
// ============================================================

/**
 * Fire a PostHog capture event. No-ops when PostHog isn't initialised
 * (e.g. missing NEXT_PUBLIC_POSTHOG_KEY or SSR context).
 *
 * When PostHog has not yet called init() (e.g. on the auth-callback redirect
 * where AuthProvider useEffect runs before PostHogProvider useEffect), retries
 * every 100 ms for up to 3 s instead of silently dropping the event.
 */
export function capturePostHog(
  event: string,
  props?: Record<string, string | number | boolean>
) {
  if (typeof window === 'undefined') return;
  // Dynamic import avoids posthog-js running during SSR/edge contexts.
  import('posthog-js').then(({ default: posthog }) => {
    if (posthog.__loaded) {
      posthog.capture(event, props);
      return;
    }
    // PostHog init (PostHogProvider useEffect) may not have fired yet on fresh
    // page loads. Retry up to 3 s to bridge the SDK init race on auth callback.
    let attempts = 0;
    const retry = () => {
      if (posthog.__loaded) { posthog.capture(event, props); return; }
      if (++attempts < 30) setTimeout(retry, 100);
    };
    setTimeout(retry, 100);
  }).catch(() => { /* analytics failure is non-critical — never block user flow */ });
}

export function setPostHogPersonProps(props: Record<string, string | number | boolean>) {
  if (typeof window === 'undefined') return;
  import('posthog-js').then(({ default: posthog }) => {
    if (posthog.__loaded) {
      posthog.setPersonProperties(props);
      return;
    }
    let attempts = 0;
    const retry = () => {
      if (posthog.__loaded) { posthog.setPersonProperties(props); return; }
      if (++attempts < 30) setTimeout(retry, 100);
    };
    setTimeout(retry, 100);
  }).catch(() => { /* analytics failure is non-critical */ });
}

// ── Existing events ──────────────────────────────────────────
export const events = {
  /** User uploaded SD card files */
  uploadStart: () => {
    capturePostHog('Upload Start');
  },

  /** Analysis completed successfully */
  analysisComplete: (nightCount: number) => {
    capturePostHog('Analysis Complete', { nights: nightCount });
  },

  /** User loaded demo mode */
  demoLoaded: () => capturePostHog('Demo Loaded'),

  /** User tapped the mobile file picker (iOS/Android) */
  mobileFilePickerTapped: () => capturePostHog('Mobile File Picker Tapped'),

  /** User exported data */
  export: (format: 'csv' | 'json' | 'forum' | 'pdf' | 'chart_image') =>
    capturePostHog('Export', { format }),

  /** User subscribed to email list */
  emailSubscribe: (source: string) =>
    capturePostHog('Email Subscribe', { source }),

  // ── Conversion funnel ────────────────────────────────────
  /** User viewed the pricing page */
  pricingViewed: () => capturePostHog('Pricing Viewed'),

  /** User clicked checkout (before Stripe redirect) */
  checkoutStarted: (tier: string, interval: string, source: string) => {
    capturePostHog('Checkout Started', { tier, interval, source });
  },

  /** Auth modal opened */
  authStarted: (source: string) =>
    capturePostHog('Auth Started', { source }),

  /** Magic link sent successfully */
  authMagicLinkSent: () => capturePostHog('Auth Magic Link Sent'),

  /** AI insight requested */
  aiInsightRequested: (tier: string) =>
    capturePostHog('AI Insight Requested', { tier }),

  /** AI upsell CTA shown to free user */
  aiUpsellShown: (source: string) => {
    capturePostHog('AI Upsell Shown', { source });
  },

  // ── Product engagement ───────────────────────────────────
  /** User switched dashboard tab */
  tabViewed: (tab: string) => capturePostHog('Tab Viewed', { tab }),

  /** User switched to a different night */
  nightSwitched: (nightCount: number) =>
    capturePostHog('Night Switched', { nights: nightCount }),

  /** User customised a threshold value */
  thresholdCustomized: (metric: string) =>
    capturePostHog('Threshold Customized', { metric }),

  /** User contributed data */
  contributionOptedIn: () => capturePostHog('Contribution Opted In'),

  /** User dismissed contribution banner */
  contributionDismissed: () => capturePostHog('Contribution Dismissed'),

  /** User submitted feedback */
  feedbackSubmitted: (type: string, page: string) =>
    capturePostHog('Feedback Submitted', { type, page }),

  // ── Retention signals ────────────────────────────────────
  /** Returning user uploaded new data */
  returningUserUpload: (lifetimeNights: number) =>
    capturePostHog('Returning User Upload', { lifetime_nights: lifetimeNights }),

  /** User enabled cloud sync */
  cloudSyncUsed: () => capturePostHog('Cloud Sync Used'),

  // ── Share link events ──────────────────────────────────────
  /** Share opt-in modal shown */
  shareOptinShown: () => capturePostHog('share_optin_shown'),

  /** User opted in to share single night */
  shareOptinSingle: () => capturePostHog('share_optin_single'),

  /** User opted in to share all nights */
  shareOptinAll: () => capturePostHog('share_optin_all'),

  /** User checked "remember my choice" */
  shareOptinRemembered: () => capturePostHog('share_optin_remembered'),

  /** Share link created */
  shareCreated: (nightsCount: number, shareScope: string) =>
    capturePostHog('share_created', { nightsCount, shareScope }),

  /** Shared analysis viewed */
  shareViewed: () => capturePostHog('share_viewed'),

  /** Share link copied */
  shareCopied: () => capturePostHog('share_copied'),

  /** Expired share link visited */
  shareExpiredView: () => capturePostHog('share_expired_view'),

  /** Share EDF files uploaded successfully */
  shareFilesUploaded: (fileCount: number, totalBytes: number) =>
    capturePostHog('share_files_uploaded', { file_count: fileCount, total_bytes: totalBytes }),

  /** Share EDF file upload failed */
  shareFilesUploadFailed: (errorType: string) =>
    capturePostHog('share_files_upload_failed', { error_type: errorType }),

  /** Shared waveform loaded and rendered in shared view */
  shareWaveformLoaded: () => capturePostHog('share_waveform_loaded'),

  // ── Providers page events ──────────────────────────────────
  /** Providers page viewed */
  providersPageView: () => capturePostHog('providers_page_view'),

  /** "Try the Demo" clicked on providers page */
  providersDemoClick: () => capturePostHog('providers_demo_click'),

  /** "Get in Touch" clicked on providers page */
  providersContactClick: () => capturePostHog('providers_contact_click'),

  /** Provider interest form submitted */
  providersContactSubmit: () => capturePostHog('providers_contact_submit'),

  // ── AI Insights Conversion Funnel ──────────────────────────
  /** Locked AI insight cards rendered for anonymous user */
  aiTeaserShown: (nightCount: number, isReturning: boolean) =>
    capturePostHog('AI Teaser Shown', { night_count: nightCount, is_returning: isReturning }),

  /** Anonymous user clicks "Create account" on AI teaser */
  aiTeaserCtaClicked: () =>
    capturePostHog('AI Teaser CTA Clicked', { source: 'ai_teaser' }),

  /** Return-visit banner shown above upload */
  returningUserNudgeShown: (previousNights: number) =>
    capturePostHog('Returning User Nudge Shown', { previous_nights: previousNights }),

  /** Return-visit banner CTA clicked */
  returningUserNudgeClicked: () =>
    capturePostHog('Returning User Nudge Clicked'),

  /** User checks consent checkbox in AuthModal */
  authConsentChecked: () =>
    capturePostHog('Auth Consent Checked'),

  /** Background EDF upload begins after analysis */
  edfAutoUploadStarted: (fileCount: number, totalMb: number) =>
    capturePostHog('EDF Auto Upload Started', { file_count: fileCount, total_mb: totalMb }),

  /** Background EDF upload finished */
  edfAutoUploadCompleted: (fileCount: number, totalMb: number, durationMs: number) =>
    capturePostHog('EDF Auto Upload Completed', { file_count: fileCount, total_mb: totalMb, duration_ms: durationMs }),

  /** Background EDF upload failed */
  edfAutoUploadFailed: (errorType: string) =>
    capturePostHog('EDF Auto Upload Failed', { error_type: errorType }),

  /** Per-breath + aggregate data stored to analysis_data */
  analysisDataStored: (nightCount: number, breathCount: number) =>
    capturePostHog('Analysis Data Stored', { night_count: nightCount, breath_count: breathCount }),

  /** User clicks "Generate AI Insights" button */
  aiInsightsButtonClicked: (tier: string, creditsRemaining: number) =>
    capturePostHog('AI Insights Button Clicked', { tier, credits_remaining: creditsRemaining }),

  /** AI insights successfully returned and displayed */
  aiInsightsGenerated: (tier: string, insightCount: number, isDeep: boolean) => {
    capturePostHog('AI Insights Generated', { tier, insight_count: insightCount, is_deep: isDeep });
  },

  /** AI insight request failed */
  aiInsightsFailed: (tier: string, errorType: string) =>
    capturePostHog('AI Insights Failed', { tier, error_type: errorType }),

  /** Free user hits 3/month limit */
  aiCreditsExhausted: () =>
    capturePostHog('AI Credits Exhausted'),

  /** Upgrade teaser cards shown to free user after AI insights */
  deepTeaserShown: (source: string) => {
    capturePostHog('Deep Teaser Shown', { source });
  },

  /** Free user clicks upgrade CTA on deep teaser */
  deepTeaserCtaClicked: (source: string) => {
    capturePostHog('Deep Teaser CTA Clicked', { source });
  },

  /** User clicks "Delete my data" in account settings */
  dataDeletionRequested: (fileCount: number, nightCount: number) =>
    capturePostHog('Data Deletion Requested', { file_count: fileCount, night_count: nightCount }),

  /** Server-side data deletion successful */
  dataDeletionCompleted: () =>
    capturePostHog('Data Deletion Completed'),

  // ── Conversion & revenue ─────────────────────────────────────
  /** User completed signup (auth callback verified) */
  signupCompleted: (source: string) => {
    capturePostHog('Signup Completed', { source });
  },

  /** Subscription created via Stripe */
  subscriptionStarted: (tier: string, interval: string, source: string) => {
    capturePostHog('Subscription Started', { tier, interval, source });
  },

  /** Subscription cancelled */
  subscriptionCancelled: (tier: string, monthsActive: number) =>
    capturePostHog('Subscription Cancelled', { tier, months_active: monthsActive }),

  // ── UX quality ───────────────────────────────────────────────
  /** Error occurred and user recovered (or not) */
  errorRecovery: (errorType: string, recovered: boolean) =>
    capturePostHog('Error Recovery', { error_type: errorType, recovered }),

  // ── Onboarding & walkthrough ──────────────────────────────────
  /** Getting Started page viewed */
  gettingStartedViewed: () => capturePostHog('Getting Started Viewed'),

  /** Walkthrough tour started (user clicked "Show me around") */
  walkthroughStarted: (source: 'prompt' | 'restart') =>
    capturePostHog('Walkthrough Started', { source }),

  /** Individual walkthrough step viewed */
  walkthroughStepViewed: (step: number, stepName: string) =>
    capturePostHog('Walkthrough Step Viewed', { step, step_name: stepName }),

  /** Walkthrough completed (user reached final step) */
  walkthroughCompleted: () => capturePostHog('Walkthrough Completed'),

  /** Walkthrough skipped (user clicked "Skip" or "I'll explore on my own") */
  walkthroughSkipped: (atStep: number) =>
    capturePostHog('Walkthrough Skipped', { at_step: atStep }),

  // ── Community benchmarks ──────────────────────────────────────
  /** Community benchmarks loaded and viewed */
  communityBenchmarksViewed: () => capturePostHog('Community Benchmarks Viewed'),

  // ── Post-analysis upgrade nudge ──────────────────────────────
  /** Post-analysis upgrade nudge dismissed */
  upgradeNudgeDismissed: (source: string) =>
    capturePostHog('Upgrade Nudge Dismissed', { source }),

  /** Post-analysis upgrade nudge CTA clicked */
  upgradeNudgeClicked: (source: string) =>
    capturePostHog('Upgrade Nudge Clicked', { source }),

  // ── Mobile reminder capture ───────────────────────────────────
  /** Mobile reminder email capture component shown */
  mobileReminderShown: () => capturePostHog('mobile_reminder_shown'),

  /** User submitted the mobile reminder email form */
  mobileReminderSubmitted: () => capturePostHog('mobile_reminder_submitted'),

  /** Mobile reminder email sent successfully */
  mobileReminderSuccess: () => capturePostHog('mobile_reminder_success'),

  /** Mobile reminder email submission failed */
  mobileReminderError: () => capturePostHog('mobile_reminder_error'),

  // ── Community join prompt ─────────────────────────────────────
  /** Community join prompt shown after analysis */
  communityPromptShown: () => capturePostHog('community_prompt_shown'),

  /** Community join prompt dismissed */
  communityPromptDismissed: () => capturePostHog('community_prompt_dismissed'),

  /** GitHub Discussions link clicked from community prompt */
  communityPromptGitHubClicked: () => capturePostHog('community_prompt_github_clicked'),

  /** Discord link clicked from community prompt */
  communityPromptDiscordClicked: () => capturePostHog('community_prompt_discord_clicked'),

  // ── Champion tier features ────────────────────────────────────
  /** Champion user viewed the historical machine-metrics trend chart */
  championTrendViewed: (nightCount: number) => {
    capturePostHog('Champion Trend Chart Viewed', { night_count: nightCount });
  },

  /** Non-Champion user saw the historical-trend upsell card */
  championTrendUpsellViewed: () => {
    capturePostHog('Champion Trend Upsell Viewed');
  },
} as const;
