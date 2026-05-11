'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileUpload } from '@/components/upload/file-upload';
import { ProgressDisplay } from '@/components/upload/progress-display';
import { ContributionNudgeDialog } from '@/components/upload/contribution-nudge-dialog';
import { ErrorDataSubmission } from '@/components/upload/error-data-submission';
import { StorageProgressBanner } from '@/components/upload/storage-progress-banner';
import { CloudSyncNudge, hasCloudSyncConsent } from '@/components/upload/cloud-sync-nudge';
import { MobileEmailCapture } from '@/components/upload/mobile-email-capture';

import { DemoCTA } from '@/components/upload/demo-cta';
import { ReturningUserNudge } from '@/components/dashboard/returning-user-nudge';
import { CommunityJoinPrompt } from '@/components/dashboard/community-join-prompt';
import { AuthModal } from '@/components/auth/auth-modal';
import { useAuth } from '@/lib/auth/auth-context';
import { getAnalysisWindowDays } from '@/lib/auth/feature-gate';
import { storeAnalysisData } from '@/lib/analysis-data-client';
import { uploadOrchestrator } from '@/lib/storage/upload-orchestrator';
import { DataContribution, type AutoSubmitStatus } from '@/components/dashboard/data-contribution';
import { NightSelector } from '@/components/common/night-selector';
import { ExportButtons } from '@/components/dashboard/export-buttons';
import { ShareButton } from '@/components/share/share-button';
import { EmailOptIn } from '@/components/common/email-opt-in';
import { EmailOptInToggle, EmailOptInNudge } from '@/components/common/email-opt-in-toggle';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { ThresholdsProvider } from '@/components/common/thresholds-provider';
import { ThresholdSettingsModal, type ThresholdSettingsModalHandle } from '@/components/dashboard/threshold-settings-modal';
import { OverviewTab } from '@/components/dashboard/overview-tab';
import { GlasgowTab } from '@/components/dashboard/glasgow-tab';
import { FlowAnalysisTab } from '@/components/dashboard/flow-analysis-tab';
import { OximetryTab } from '@/components/dashboard/oximetry-tab';
import { TrendsTab } from '@/components/dashboard/trends-tab';
import { ComparisonTab } from '@/components/dashboard/comparison-tab';
import { GraphsTab } from '@/components/dashboard/graphs-tab';
import { SettingsTab } from '@/components/dashboard/settings-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { orchestrator } from '@/lib/analysis-orchestrator';
import { SAMPLE_NIGHTS, SAMPLE_THERAPY_CHANGE_DATE } from '@/lib/sample-data';
import type { AnalysisState, NightResult } from '@/lib/types';
import { loadPersistedResults } from '@/lib/persistence';
import { events } from '@/lib/analytics';
import { contributeNights, trackContributedDates } from '@/lib/contribute';
import { contributeWaveformsBackground } from '@/lib/contribute-waveforms';
import { contributeOximetryTraceBackground } from '@/lib/contribute-oximetry-trace';
import { safeGetItem } from '@/lib/safe-local-storage';
import { isIOSDevice } from '@/lib/directory-traversal';
import { GuidedWalkthrough } from '@/components/dashboard/guided-walkthrough';
import { PostAnalysisUpgrade } from '@/components/dashboard/post-analysis-upgrade';
import { UploadAgainCta } from '@/components/dashboard/upload-again-cta';
import { HistoryExpiryWarning } from '@/components/dashboard/history-expiry-warning';
import { CommunityGateBanner } from '@/components/dashboard/community-gate-banner';
import { Disclaimer } from '@/components/common/disclaimer';
import * as Sentry from '@sentry/nextjs';
import {
  RotateCcw,
  Shield,
  AlertCircle,
  BarChart3,
  Activity,
  Waves,
  HeartPulse,
  TrendingUp,
  Upload,
  ArrowLeftRight,
  Star,
  Moon,
  CheckCircle2,
  X,
  BarChart,
  HardDrive,
  Settings2,
  RefreshCw,
} from 'lucide-react';

export default function AnalyzePage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex flex-col gap-6 animate-pulse">
          <div className="h-10 w-48 rounded-lg bg-muted/30" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[88px] rounded-xl border border-border/30 bg-muted/10" />
            ))}
          </div>
        </div>
      </div>
    }>
      <AnalyzePageInner />
    </Suspense>
  );
}

function AnalyzePageInner() {
  const searchParams = useSearchParams();
  const checkoutParam = searchParams.get('checkout');
  const [showCheckoutBanner, setShowCheckoutBanner] = useState(checkoutParam === 'success');
  const [state, setState] = useState<AnalysisState>(orchestrator.getState());
  const [selectedNight, setSelectedNight] = useState<number>(0);
  const [isDemo, setIsDemo] = useState(false);
  const [showPurchaseBanner, setShowPurchaseBanner] = useState(false);
  const [persistedData, setPersistedData] = useState<{
    nights: NightResult[];
    therapyChangeDate: string | null;
  } | null>(null);
  const sdFilesRef = useRef<File[]>([]);
  const oxFilesRef = useRef<File[]>([]);
  const oxInputRef = useRef<HTMLInputElement>(null);
  const contributeOptInRef = useRef(
    typeof window !== 'undefined' && (() => { try { return localStorage.getItem('airwaylab_contribute_optin') === '1'; } catch { return false; } })()
  );
  const [oximetryJustAdded, setOximetryJustAdded] = useState(false);
  const hadOximetryRef = useRef(false);
  const [showContributeNudge, setShowContributeNudge] = useState(false);
  const [autoSubmitStatus, setAutoSubmitStatus] = useState<AutoSubmitStatus>('idle');
  const [autoSubmitCount, setAutoSubmitCount] = useState(0);
  const pendingNightsRef = useRef<NightResult[]>([]);
  const [showDemoStar, setShowDemoStar] = useState(false);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lifetimeNights, setLifetimeNights] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(false);
  const [_isFirstSession, setIsFirstSession] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [_isIOS, setIsIOS] = useState(false);
  const [analyzeAuthModalOpen, setAnalyzeAuthModalOpen] = useState(false);
  const [engineUpgraded, setEngineUpgraded] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const tabScrollRef = useRef<HTMLDivElement>(null);
  const { user, tier, refreshProfile } = useAuth();
  const userRef = useRef(user);
  useEffect(() => { userRef.current = user; }, [user]);
  const tierRef = useRef(tier);
  useEffect(() => { tierRef.current = tier; }, [tier]);
  const [bannerActivated, setBannerActivated] = useState(false);
  const hasTriggeredAutoUpload = useRef(false);
  const thresholdModalRef = useRef<ThresholdSettingsModalHandle>(null);

  // Warn before closing/refreshing while analysis is in progress
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (state.status === 'uploading' || state.status === 'processing') {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [state.status]);

  // Track session count for new-user UX (beginner vs returning user)
  useEffect(() => {
    try {
      const count = parseInt(localStorage.getItem('airwaylab_session_count') || '0', 10);
      const next = count + 1;
      localStorage.setItem('airwaylab_session_count', String(next));
      setIsNewUser(next <= 5);
      setIsFirstSession(next === 1);
      setSessionCount(next);
    } catch {
      setIsNewUser(true); // Default to beginner if localStorage unavailable
    }
  }, []);

  useEffect(() => {
    setIsIOS(isIOSDevice());
  }, []);

  // Handle auth error from callback redirect
  useEffect(() => {
    const error = searchParams.get('auth_error');
    if (!error) return;

    if (error === 'pkce_expired') {
      setAuthError('Your sign-in link opened in a different browser or app. Please try signing in again from this browser.');
    } else {
      setAuthError('Sign-in failed. Please try again.');
    }

    // Clean up URL param
    const params = new URLSearchParams(searchParams.toString());
    params.delete('auth_error');
    const cleanUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, '', cleanUrl);
  }, [searchParams]);

  // Post-purchase activation banner — run when searchParams include checkout=success
  useEffect(() => {
    if (searchParams.get('checkout') !== 'success') return;

    setShowPurchaseBanner(true);
    setBannerActivated(false);
    events.subscriptionStarted('unknown', 'unknown', 'checkout_redirect');

    let attempts = 0;
    const poll = setInterval(async () => {
      attempts++;
      await refreshProfile();
      if (tierRef.current !== 'community' || attempts >= 15) {
        clearInterval(poll);
        if (tierRef.current !== 'community') {
          setBannerActivated(true);
        }
      }
    }, 2000);

    const params = new URLSearchParams(searchParams.toString());
    params.delete('checkout');
    window.history.replaceState({}, '', params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname);

    return () => clearInterval(poll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // refreshProfile omitted: stable post-login (user doesn't change mid-flow)

  // Load lifetime night count from localStorage
  useEffect(() => {
    try {
      const stored = parseInt(localStorage.getItem('airwaylab_nights_analyzed') || '0', 10);
      if (stored > 0) setLifetimeNights(stored);
    } catch { /* noop */ }
  }, []);

  // Auto-upload + store analysis data when user authenticates with loaded results
  useEffect(() => {
    if (!user || hasTriggeredAutoUpload.current || isDemo) return;
    const currentNights = state.nights.length > 0 ? state.nights : persistedData?.nights ?? [];
    if (currentNights.length === 0) return;

    hasTriggeredAutoUpload.current = true;

    // Auto-upload EDF files if cloud sync is enabled
    if (sdFilesRef.current.length > 0 && hasCloudSyncConsent()) {
      events.cloudSyncUsed();
      const filesToUpload = [...sdFilesRef.current, ...oxFilesRef.current];
      uploadOrchestrator.upload(filesToUpload).catch(() => { /* handled by orchestrator */ });
    }

    // Store aggregate analysis data
    storeAnalysisData(currentNights).catch(() => { /* logged in client */ });
  }, [user, isDemo, state.nights, persistedData?.nights]);

  // Show GitHub star prompt after 30s in demo mode (once per session)
  useEffect(() => {
    if (isDemo && !showDemoStar) {
      try {
        if (sessionStorage.getItem('airwaylab_demo_star_shown') === '1') return;
      } catch { /* noop */ }
      demoTimerRef.current = setTimeout(() => {
        setShowDemoStar(true);
        try { sessionStorage.setItem('airwaylab_demo_star_shown', '1'); } catch { /* noop */ }
      }, 30000);
      return () => {
        if (demoTimerRef.current) clearTimeout(demoTimerRef.current);
      };
    }
  }, [isDemo, showDemoStar]);

  // Auto-load demo or persisted results on mount
  useEffect(() => {
    if (searchParams.get('demo') !== null && state.status === 'idle') {
      loadDemo();
    } else if (state.status === 'idle') {
      const saved = loadPersistedResults();
      if (saved) {
        if (saved.engineUpgraded) {
          // Engine version changed — old results cleared, prompt re-upload (FB-22)
          setEngineUpgraded(true);
        } else if (saved.nights.length === 0) {
          // Persisted data existed but contained 0 nights — data loss
          console.error('[persistence] Restored session has 0 nights — serving empty dashboard');
          Sentry.captureMessage('Persistence: restored session has 0 nights', {
            level: 'warning',
            extra: { therapyChangeDate: saved.therapyChangeDate },
          });
        }
        if (saved.nights.length > 0) {
          setPersistedData(saved);
          hadOximetryRef.current = saved.nights.some((n) => !!n.oximetry);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return orchestrator.subscribe((newState) => {
      setState(newState);
      // Persist results when analysis completes
      if (newState.status === 'complete' && newState.nights.length > 0) {
        events.analysisComplete(newState.nights.length);
        // Orchestrator already calls persistResults internally — don't double-persist.
        // The persistenceWarning from the orchestrator state will surface any issues.
        setPersistedData(null);

        // Detect oximetry just added (show confirmation banner)
        const hasOximetry = newState.nights.some((n) => !!n.oximetry);
        if (hasOximetry && !hadOximetryRef.current) {
          setOximetryJustAdded(true);
          setTimeout(() => setOximetryJustAdded(false), 6000);
        }
        hadOximetryRef.current = hasOximetry;

        // Track analysis session (fire-and-forget, non-blocking)
        const glasgowSum = newState.nights.reduce((s, n) => s + n.glasgow.overall, 0);
        fetch('/api/track-analysis', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nightCount: newState.nights.length,
            hasOximetry,
            isDemo: false,
            glasgowAvg: Math.round((glasgowSum / newState.nights.length) * 100) / 100,
          }),
        }).catch(() => { /* non-critical */ });

        // Contribute data: auto if opted in, show nudge if first time
        const contributedDates: string[] = JSON.parse(
          safeGetItem('airwaylab_contributed_dates') || '[]'
        );
        const contributedSet = new Set(contributedDates);
        const newNights = newState.nights.filter((n) => !contributedSet.has(n.dateStr));

        if (contributeOptInRef.current && newNights.length > 0) {
          setAutoSubmitCount(newNights.length);
          submitContribution(newNights);
        } else if (!contributeOptInRef.current && contributedDates.length === 0) {
          // Only show nudge if user has never contributed before
          pendingNightsRef.current = newState.nights;
          setShowContributeNudge(true);
        }

        // Cloud storage: auto-upload raw files if cloud sync enabled
        if (userRef.current && sdFilesRef.current.length > 0 && hasCloudSyncConsent()) {
          events.cloudSyncUsed();
          const filesToUpload = [...sdFilesRef.current, ...oxFilesRef.current];
          uploadOrchestrator.upload(filesToUpload).catch(() => { /* handled by orchestrator */ });
        }
        // Store aggregate analysis data (always, not gated by cloud sync)
        if (userRef.current) {
          storeAnalysisData(newState.nights).catch(() => { /* logged in client */ });
        }

        // Trigger email drip: post-upload sequence (fire-and-forget)
        if (userRef.current) {
          fetch('/api/email/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ sequence: 'post_upload' }),
          }).catch(() => { /* non-critical */ });
        }

        // Update local lifetime night count (deduplicate by date)
        try {
          const storedDates: string[] = JSON.parse(localStorage.getItem('airwaylab_analyzed_dates') || '[]');
          const dateSet = new Set(storedDates);
          for (const n of newState.nights) dateSet.add(n.dateStr);
          const updated = Array.from(dateSet);
          localStorage.setItem('airwaylab_analyzed_dates', JSON.stringify(updated));
          localStorage.setItem('airwaylab_nights_analyzed', String(updated.length));
          setLifetimeNights(updated.length);
        } catch { /* noop */ }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiles = useCallback(
    (sdFiles: File[], oxFiles: File[], deviceType?: string, bmcSerial?: string) => {
      setIsDemo(false);
      sdFilesRef.current = sdFiles;
      if (lifetimeNights > 0) {
        events.returningUserUpload(lifetimeNights);
      }
      orchestrator.analyze(sdFiles, oxFiles.length > 0 ? oxFiles : undefined, deviceType, bmcSerial, tier);
    },
    [lifetimeNights, tier]
  );

  const handleOximetryUpload = useCallback(() => {
    oxInputRef.current?.click();
  }, []);

  const handleOximetryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) {
        if (oxInputRef.current) oxInputRef.current.value = '';
        return;
      }

      oxFilesRef.current = files;
      hadOximetryRef.current = false;

      // Use oximetry-only path: merges into cached nights without re-processing SD card
      orchestrator.analyzeOximetryOnly(files, tier);

      // Reset input so same file can be re-selected
      if (oxInputRef.current) oxInputRef.current.value = '';
    },
    [tier]
  );

  const submitContribution = useCallback((nightsToSubmit: NightResult[]) => {
    setAutoSubmitStatus('sending');
    const contributionId = crypto.randomUUID();
    contributeNights(nightsToSubmit, undefined, contributionId)
      .then(() => {
        trackContributedDates(nightsToSubmit);
        setAutoSubmitStatus('success');
        // Background waveform contribution — fire-and-forget, no UI
        if (sdFilesRef.current.length > 0) {
          contributeWaveformsBackground(
            nightsToSubmit,
            sdFilesRef.current,
            contributionId
          ).catch(() => { /* logged in contributeWaveformsBackground */ });
        }
        // Background oximetry trace contribution — fire-and-forget, no UI
        contributeOximetryTraceBackground(
          nightsToSubmit,
          contributionId
        ).catch(() => { /* logged in contributeOximetryTraceBackground */ });
      })
      .catch((err) => {
        Sentry.captureException(err, { tags: { action: 'auto-contribution' } });
        setAutoSubmitStatus('error');
      });
  }, []);

  const handleNudgeContribute = useCallback(() => {
    // Store opt-in so future analyses auto-contribute without re-prompting
    contributeOptInRef.current = true;
    try { localStorage.setItem('airwaylab_contribute_optin', '1'); } catch { /* noop */ }
    submitContribution(pendingNightsRef.current);
    setShowContributeNudge(false);
    pendingNightsRef.current = [];
  }, [submitContribution]);

  const handleNudgeDismiss = useCallback(() => {
    setShowContributeNudge(false);
    pendingNightsRef.current = [];
  }, []);

  const loadDemo = useCallback(() => {
    setIsDemo(true);
    setSelectedNight(0);
    hadOximetryRef.current = SAMPLE_NIGHTS.some((n) => !!n.oximetry);
    events.demoLoaded();
    // Bypass the orchestrator — inject sample data directly
    orchestrator.reset();
  }, []);

  const handleReset = useCallback(() => {
    // Show demo star prompt when exiting demo (if not already shown)
    if (isDemo) {
      try {
        if (sessionStorage.getItem('airwaylab_demo_star_shown') !== '1') {
          setShowDemoStar(true);
          sessionStorage.setItem('airwaylab_demo_star_shown', '1');
        }
      } catch { /* noop */ }
    }

    const wasDemo = isDemo;
    setIsDemo(false);
    orchestrator.reset();
    setSelectedNight(0);

    if (wasDemo) {
      // Exiting demo: restore previously persisted data if it exists
      const saved = loadPersistedResults();
      setPersistedData(saved);
    } else {
      // Resetting real analysis: clear React state so upload form shows,
      // but keep localStorage cache + manifest so the orchestrator can
      // skip unchanged nights on the next upload (incremental processing).
      setPersistedData(null);
    }
  }, [isDemo]);

  // Scroll active tab into view on change and initial mount
  useEffect(() => {
    const container = tabScrollRef.current;
    if (!container) return;
    const activeEl = container.querySelector('[data-active]') as HTMLElement | null;
    activeEl?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, [activeTab]);

  const { status, progress, error, warning, persistenceWarning, warnings } = state;

  // Memoize derived data to stabilize references across renders
  const nights = useMemo<NightResult[]>(() => {
    const raw = isDemo
      ? SAMPLE_NIGHTS
      : state.nights.length > 0
        ? state.nights
        : persistedData?.nights ?? [];

    const windowDays = getAnalysisWindowDays(tier);
    if (isDemo || !isFinite(windowDays) || windowDays <= 0) return raw;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - windowDays);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return raw.filter((n) => n.dateStr >= cutoffStr);
  }, [isDemo, state.nights, persistedData?.nights, tier]);

  const hiddenNightCount = useMemo<number>(() => {
    if (isDemo) return 0;
    const windowDays = getAnalysisWindowDays(tier);
    if (!isFinite(windowDays) || windowDays <= 0) return 0;
    const raw = state.nights.length > 0 ? state.nights : persistedData?.nights ?? [];
    return Math.max(0, raw.length - nights.length);
  }, [isDemo, tier, state.nights, persistedData?.nights, nights]);
  const therapyChangeDate = useMemo<string | null>(() =>
    isDemo
      ? SAMPLE_THERAPY_CHANGE_DATE
      : state.therapyChangeDate ?? persistedData?.therapyChangeDate ?? null,
    [isDemo, state.therapyChangeDate, persistedData?.therapyChangeDate]
  );

  // Tier-gated history slice: community sees at most 7 most recent nights.
  // Export, contribute, and session-level analytics still use the full `nights` array.
  const visibleNights = useMemo(() => {
    const windowDays = getAnalysisWindowDays(tier);
    if (windowDays === Infinity || !windowDays) return nights;
    const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;
    const filtered = nights.filter((n) => new Date(n.dateStr).getTime() >= cutoff);
    return filtered.slice(-windowDays);
  }, [nights, tier]);

  const isComplete =
    isDemo || status === 'complete' || (persistedData !== null && persistedData.nights.length > 0);
  const currentNight = visibleNights[selectedNight] ?? null;
  const previousNight = visibleNights[selectedNight + 1] ?? null;

  // Memoize date strings to avoid new array allocation on every render
  const nightDates = useMemo(() => visibleNights.map((n) => n.dateStr), [visibleNights]);

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Auth error banner */}
      {authError && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span className="flex-1">{authError}</span>
          <button
            onClick={() => setAuthError(null)}
            className="shrink-0 rounded p-0.5 text-amber-400 hover:text-amber-200"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Post-purchase activation banner */}
      {showPurchaseBanner && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
          <span className="flex-1">
            {bannerActivated
              ? 'Subscription activated! Your premium access is now live — discuss any questions about your data with your clinician.'
              : 'Your subscription is activating. AI insights will appear automatically — discuss any questions about your data with your clinician.'}
          </span>
          <button
            onClick={() => setShowPurchaseBanner(false)}
            className="shrink-0 rounded p-0.5 text-emerald-400 hover:text-emerald-200"
            aria-label="Dismiss subscription banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {isDemo ? 'Demo Dashboard' : 'Analyze Sleep Data'}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {isDemo
                ? 'Exploring sample data — upload your own SD card to see your results'
                : 'Upload your SD card folder to begin analysis'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lifetimeNights > 0 && !isDemo && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Moon className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span>{lifetimeNights} night{lifetimeNights !== 1 ? 's' : ''} analyzed</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-xs text-emerald-500">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>Analysing locally on your device</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Star Prompt */}
      {showDemoStar && status === 'idle' && !isDemo && (
        <div className="mx-auto mb-6 max-w-lg animate-fade-in-up">
          <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-4 text-center sm:px-6">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Like what you see?</span>{' '}
              Star us on GitHub to follow development.
            </p>
            <div className="flex items-center justify-center gap-3">
              <a
                href="https://github.com/airwaylab-app/airwaylab"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Star className="h-3.5 w-3.5" /> Star on GitHub
                </Button>
              </a>
              <button
                onClick={() => setShowDemoStar(false)}
                className="text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Returning user nudge — anonymous users with past results */}
      {!user && lifetimeNights > 0 && status === 'idle' && !isDemo && (
        <div className="mx-auto max-w-lg mb-4">
          <ReturningUserNudge
            previousNights={lifetimeNights}
            onRegister={() => setAnalyzeAuthModalOpen(true)}
          />
        </div>
      )}

      {/* Engine upgrade banner — shown when cached results were from an older version */}
      {engineUpgraded && status === 'idle' && !isDemo && (
        <div className="mx-auto mb-4 max-w-lg">
          <div className="flex items-start gap-2.5 rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3">
            <RefreshCw className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-blue-400">Analysis engine updated</p>
              <p className="mt-0.5">
                Your previous results were analyzed with an older engine version.
                Re-upload your SD card to get improved analysis with the latest algorithms.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload State — hidden when persisted results are loaded */}
      {status === 'idle' && !isDemo && (
        !persistedData ? (
          <div className="mx-auto max-w-lg">
            <FileUpload onFilesSelected={handleFiles} />
            {/* Mobile reminder — secondary, shown below file picker */}
            <MobileEmailCapture className="mt-4 sm:hidden" />

            {/* Contextual help link */}
            <p className="mt-3 text-center text-xs text-muted-foreground/70">
              Not sure how to get your data?{' '}
              <Link href="/blog/resmed-airsense-10-sd-card" className="text-primary hover:text-primary/80">
                How to get your ResMed data
              </Link>
            </p>

            <DemoCTA onLoadDemo={loadDemo} />
          </div>
        ) : (
          <div className="mx-auto max-w-lg">
            <FileUpload onFilesSelected={handleFiles} />
            {/* Mobile reminder — secondary, shown below file picker */}
            <MobileEmailCapture className="mt-4 sm:hidden" />
            <DemoCTA onLoadDemo={loadDemo} />
          </div>
        )
      )}

      {/* Medical disclaimer — below upload/welcome zone (MDR compliance) */}
      <div className="-mx-4 mt-4 mb-4">
        <Disclaimer persistent />
      </div>

      {/* Processing State with Skeleton Preview */}
      {(status === 'uploading' || status === 'processing') && !isDemo && (
        <div className="flex flex-col gap-6">
          <div className="mx-auto w-full max-w-lg">
            <ProgressDisplay
              current={progress.current}
              total={progress.total}
              stage={progress.stage}
              isAuthenticated={!!user}
            />
          </div>
          {/* Skeleton dashboard preview */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[88px] rounded-xl border border-border/30 skeleton-shimmer" />
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3" aria-hidden="true">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-[72px] rounded-xl border border-border/30 skeleton-shimmer" />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {status === 'error' && !isDemo && (
        <div className="mx-auto max-w-lg flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm text-red-400">{error}</p>
              </div>
              <p className="pl-[26px] text-xs text-muted-foreground">
                Make sure you selected the DATALOG folder from your SD card. Need help?{' '}
                <a href="/getting-started" className="text-primary hover:underline">See the guide</a>.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} className="self-start sm:self-auto">
              <RotateCcw className="mr-2 h-3 w-3" /> Try Again
            </Button>
          </div>
          <ErrorDataSubmission error={error ?? 'Unknown error'} files={sdFilesRef.current} />
        </div>
      )}

      {/* Results Dashboard */}
      {isComplete && nights.length > 0 && currentNight && (
        <ThresholdsProvider>
        <div className="flex flex-col gap-4 animate-fade-in-up" data-sentry-mask>
          {/* Demo Banner */}
          {isDemo && (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Demo mode</span>{' '}
                  — viewing sample data. Upload your own SD card to analyze your therapy.
                </p>
                <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 self-start sm:self-auto">
                  <Upload className="h-3 w-3" /> Upload Your Data
                </Button>
              </div>
              {/* Sample data context — update if lib/sample-data.ts changes */}
              <p className="text-xs text-muted-foreground/70">
                Sample scenario: BiPAP ST user with moderate flow limitation across 7 nights.
                Settings were adjusted (EPAP 8&rarr;10, IPAP 14&rarr;16) on Jan 15 &mdash; compare nights before and after to see the effect.
              </p>
            </div>
          )}

          {/* Community Join Prompt — shown to new users after first analysis */}
          <CommunityJoinPrompt sessionCount={sessionCount} isDemo={isDemo} />

          {/* Restored Session Banner */}
          {!isDemo && persistedData && (
            <div className="flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Previous session restored</span>{' '}
                — {persistedData.nights.length} night{persistedData.nights.length !== 1 ? 's' : ''}
                {persistedData.nights.length >= 2 && (() => {
                  const sorted = [...persistedData.nights].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
                  const first = sorted[0]!.dateStr.slice(5); // MM-DD
                  const last = sorted[sorted.length - 1]!.dateStr.slice(5);
                  return ` (${first} – ${last})`;
                })()}
                . Upload new data to update.
              </p>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 self-start sm:self-auto">
                <Upload className="h-3 w-3" /> New Analysis
              </Button>
            </div>
          )}

          {/* Fresh analysis summary — night count + date range */}
          {!isDemo && !persistedData && status === 'complete' && nights.length > 0 && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 animate-fade-in-up">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Analysis complete</span>
                {' '}&mdash; {nights.length} night{nights.length !== 1 ? 's' : ''} analyzed
                {nights.length >= 2 && (() => {
                  const sorted = [...nights].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
                  return ` (${sorted[0]!.dateStr} to ${sorted[sorted.length - 1]!.dateStr})`;
                })()}
                .
              </p>
            </div>
          )}

          {/* Persistence warning — nights dropped or save failed */}
          {!isDemo && persistenceWarning && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 animate-fade-in-up">
              <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Storage limit reached</span>
                {' '}&mdash; {persistenceWarning}
              </p>
            </div>
          )}

          {/* Oximetry upload confirmation */}
          {oximetryJustAdded && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 animate-fade-in-up">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Oximetry data added</span>
                {' '}&mdash; SpO&#8322; and heart rate analysis is now included in your results. Check the Oximetry tab for details.
              </p>
            </div>
          )}

          {/* Oximetry warning (no nights matched) */}
          {warning && !isDemo && (
            <div className="flex items-center gap-2.5 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 animate-fade-in-up">
              <AlertCircle className="h-4 w-4 shrink-0 text-yellow-500" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Warning</span>
                {' '}&mdash; {warning}
              </p>
            </div>
          )}

          {/* Truncated EDF warning — files had incomplete data */}
          {!isDemo && warnings.length > 0 && warnings.some((w) => w.includes('Truncated')) && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 animate-fade-in-up">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {warnings.filter((w) => w.includes('Truncated')).length} file{warnings.filter((w) => w.includes('Truncated')).length !== 1 ? 's' : ''} had incomplete data
                </span>
                {' '}&mdash; Analysis used available data from complete sections. For full results, re-copy the SD card ensuring the copy completes.
              </p>
            </div>
          )}

          {/* Cloud sync progress (non-dismissible, transient) */}
          <StorageProgressBanner />

          {/* Controls Bar — immediately after status banners, before any nudges */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div data-walkthrough="night-selector">
              <NightSelector
                dates={nightDates}
                selectedIndex={selectedNight}
                onChange={(idx) => {
                  setSelectedNight(idx);
                  events.nightSwitched(visibleNights.length);
                }}
              />
              </div>
              {therapyChangeDate && (
                <span className="hidden text-xs text-amber-500 sm:inline">
                  Settings changed on {therapyChangeDate}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Full controls for returning users; simplified for new users */}
              {!isNewUser && (
                <div className="hidden sm:block">
                  {user ? (
                    <EmailOptInToggle />
                  ) : (
                    <EmailOptIn variant="inline" source={isDemo ? 'demo-dashboard' : 'analyze-dashboard'} />
                  )}
                </div>
              )}
              {!isDemo && <ShareButton nights={nights} selectedNight={nights[selectedNight]!} sdFiles={sdFilesRef.current} />}
              {!isNewUser && !isDemo && <ExportButtons nights={nights} selectedNight={nights[selectedNight]!} />}
              <ThresholdSettingsModal ref={thresholdModalRef} />
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-3 w-3" /> {isDemo ? 'Exit Demo' : 'New'}
              </Button>
            </div>
          </div>

          {/* Post-purchase activation banner — shown once per checkout redirect */}
          {showCheckoutBanner && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Your subscription is activating
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      AI insights will appear automatically on your next upload.
                      Manage your subscription in{' '}
                      <Link href="/account" className="underline hover:text-foreground">account settings</Link>.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCheckoutBanner(false)}
                  className="shrink-0 rounded p-0.5 text-muted-foreground/50 hover:text-muted-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* Tabbed Views — right after controls, above nudge banners */}
          <Tabs defaultValue="overview" onValueChange={(tab) => { events.tabViewed(tab); setActiveTab(tab); }}>
            {/* Tab bar: sticky wrapper with scroll container + mobile fade gradients */}
            <div className="relative sticky top-14 z-40 -mx-4 w-[calc(100%+2rem)] bg-card border-b border-border/50 sm:top-16 sm:mx-0 sm:w-full sm:rounded-lg sm:border sm:bg-card/30">
              {/* Left fade — signals scroll on mobile */}
              <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-card to-transparent z-10 sm:hidden" aria-hidden="true" />
              {/* Scrollable container */}
              <div ref={tabScrollRef} className="overflow-x-auto scrollbar-hide px-4 sm:px-1">
                <TabsList
                  variant="line"
                  data-walkthrough="tab-bar"
                  className="inline-flex w-max justify-start rounded-none sm:rounded-lg"
                >
                  {/* Primary tabs */}
                  <TabsTrigger value="overview" className="gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="graphs" className="gap-1.5">
                    <BarChart className="h-3.5 w-3.5" />
                    Graphs
                  </TabsTrigger>
                  <TabsTrigger value="trends" className="gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Trends
                  </TabsTrigger>

                  {/* Separator between primary and secondary tabs */}
                  <div className="mx-1 h-4 w-px shrink-0 bg-border/50 sm:mx-2" aria-hidden="true" />

                  {/* Secondary tabs — abbreviated on mobile */}
                  <TabsTrigger value="glasgow" className="gap-1.5">
                    <Activity className="h-3.5 w-3.5" />
                    Glasgow
                    <span className="sm:hidden text-[11px]">Glasgow</span>
                    <span className="hidden sm:inline">Glasgow</span>
                  </TabsTrigger>
                  <TabsTrigger value="flow" className="gap-1.5">
                    <Waves className="h-3.5 w-3.5" />
                    <span className="sm:hidden text-[11px]">Flow</span>
                    <span className="hidden sm:inline">Flow Analysis</span>
                  </TabsTrigger>
                  {currentNight?.settingsMetrics && (
                    <TabsTrigger value="settings" className="gap-1.5">
                      <Settings2 className="h-3.5 w-3.5" />
                      Settings
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="oximetry" className="gap-1.5">
                    <HeartPulse className="h-3.5 w-3.5" />
                    <span className="sm:hidden text-[11px]">Oxy</span>
                    <span className="hidden sm:inline">Oximetry</span>
                  </TabsTrigger>
                  <TabsTrigger value="compare" className="gap-1.5">
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    Compare
                    <span className="sm:hidden text-[11px]">Compare</span>
                    <span className="hidden sm:inline">Comparison</span>
                  </TabsTrigger>
                </TabsList>
              </div>
              {/* Right fade — signals scroll on mobile */}
              <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-card to-transparent z-10 sm:hidden" aria-hidden="true" />
            </div>

            <TabsContent value="overview" className="mt-4">
              <ErrorBoundary context="Overview">
                <OverviewTab
                  nights={visibleNights}
                  selectedNight={currentNight}
                  previousNight={previousNight}
                  therapyChangeDate={therapyChangeDate}
                  isDemo={isDemo}
                  isNewUser={isNewUser}
                  onOpenAuth={() => setAnalyzeAuthModalOpen(true)}
                  onAdjustThreshold={(key) => thresholdModalRef.current?.openTo(key)}
                  onUploadOximetry={
                    !isDemo && !currentNight.oximetry
                      ? handleOximetryUpload
                      : undefined
                  }
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="graphs" className="mt-6">
              <ErrorBoundary context="Graphs">
                <GraphsTab
                  selectedNight={currentNight}
                  nights={visibleNights}
                  therapyChangeDate={therapyChangeDate}
                  isDemo={isDemo}
                  sdFiles={sdFilesRef.current}
                  onReUpload={handleReset}
                  onUploadOximetry={
                    !isDemo && !currentNight.oximetry
                      ? handleOximetryUpload
                      : undefined
                  }
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="glasgow" className="mt-6">
              <ErrorBoundary context="Glasgow Index">
                <GlasgowTab
                  nights={visibleNights}
                  selectedNight={currentNight}
                  previousNight={previousNight}
                  therapyChangeDate={therapyChangeDate}
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="flow" className="mt-6">
              <ErrorBoundary context="Flow Analysis">
                <FlowAnalysisTab
                  selectedNight={currentNight}
                  previousNight={previousNight}
                  nights={visibleNights}
                />
              </ErrorBoundary>
            </TabsContent>

            {currentNight?.settingsMetrics && (
              <TabsContent value="settings" className="mt-6">
                <ErrorBoundary context="Settings">
                  <SettingsTab
                    selectedNight={currentNight}
                    previousNight={previousNight}
                    nights={visibleNights}
                  />
                </ErrorBoundary>
              </TabsContent>
            )}

            <TabsContent value="oximetry" className="mt-6">
              <ErrorBoundary context="Oximetry">
                <OximetryTab
                  selectedNight={currentNight}
                  previousNight={previousNight}
                  nights={visibleNights}
                  onUploadOximetry={
                    !isDemo && !currentNight.oximetry
                      ? handleOximetryUpload
                      : undefined
                  }
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="trends" className="mt-6">
              <ErrorBoundary context="Trends">
                <TrendsTab
                  nights={visibleNights}
                  therapyChangeDate={therapyChangeDate}
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="compare" className="mt-6">
              <ErrorBoundary context="Comparison">
                <ComparisonTab
                  nights={visibleNights}
                  nightA={currentNight}
                  nightAIndex={selectedNight}
                />
              </ErrorBoundary>
            </TabsContent>
          </Tabs>

          {/* Nudge banners — below dashboard content so data is always visible first */}
          <div className="flex flex-col gap-4">
            <CloudSyncNudge onEnable={() => {
              if (sdFilesRef.current.length > 0) {
                events.cloudSyncUsed();
                const filesToUpload = [...sdFilesRef.current, ...oxFilesRef.current];
                uploadOrchestrator.upload(filesToUpload).catch(() => { /* handled by orchestrator */ });
              }
            }} />
            <GuidedWalkthrough isComplete={isComplete} />
            {!isDemo && <PostAnalysisUpgrade isComplete={isComplete} />}
            {!isDemo && (
              <UploadAgainCta
                isComplete={isComplete}
                sessionCount={sessionCount}
                onUploadAnother={handleReset}
              />
            )}
            {!isDemo && <HistoryExpiryWarning nights={nights} hiddenNightCount={hiddenNightCount} />}
            {!isDemo && <CommunityGateBanner nights={nights} />}
            {!isDemo && <EmailOptInNudge />}
            <DataContribution
              nights={nights}
              isDemo={isDemo}
              autoSubmitStatus={autoSubmitStatus}
              autoSubmitCount={autoSubmitCount}
            />
          </div>

        </div>
        </ThresholdsProvider>
      )}

      {/* Contribution nudge dialog — shown after analysis if user didn't opt in */}
      {showContributeNudge && (
        <ContributionNudgeDialog
          nightCount={pendingNightsRef.current.length}
          onContribute={handleNudgeContribute}
          onDismiss={handleNudgeDismiss}
        />
      )}

      {/* Hidden oximetry file input — triggered by clickable "No Oximetry Data" card */}
      <input
        ref={oxInputRef}
        type="file"
        className="hidden"
        accept=".csv"
        multiple
        onChange={handleOximetryChange}
      />

      {/* Auth modal for registration CTAs within the analyze page */}
      <AuthModal
        open={analyzeAuthModalOpen}
        onClose={() => setAnalyzeAuthModalOpen(false)}
      />
    </div>
  );
}
