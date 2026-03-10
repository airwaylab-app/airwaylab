'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileUpload } from '@/components/upload/file-upload';
import { ProgressDisplay } from '@/components/upload/progress-display';
import { ContributionOptIn } from '@/components/upload/contribution-opt-in';
import { ContributionNudgeDialog } from '@/components/upload/contribution-nudge-dialog';
import { ErrorDataSubmission } from '@/components/upload/error-data-submission';
import { StorageConsent } from '@/components/upload/storage-consent';
import { StorageProgressBanner } from '@/components/upload/storage-progress-banner';
import { uploadOrchestrator } from '@/lib/storage/upload-orchestrator';
import { DataContribution } from '@/components/dashboard/data-contribution';
import { NightSelector } from '@/components/common/night-selector';
import { ExportButtons } from '@/components/dashboard/export-buttons';
import { EmailOptIn } from '@/components/common/email-opt-in';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { ThresholdsProvider } from '@/components/common/thresholds-provider';
import { ThresholdSettingsModal } from '@/components/dashboard/threshold-settings-modal';
import { OverviewTab } from '@/components/dashboard/overview-tab';
import { GlasgowTab } from '@/components/dashboard/glasgow-tab';
import { FlowAnalysisTab } from '@/components/dashboard/flow-analysis-tab';
import { OximetryTab } from '@/components/dashboard/oximetry-tab';
import { TrendsTab } from '@/components/dashboard/trends-tab';
import { ComparisonTab } from '@/components/dashboard/comparison-tab';
import { WaveformTab } from '@/components/dashboard/waveform-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { orchestrator } from '@/lib/analysis-orchestrator';
import { SAMPLE_NIGHTS, SAMPLE_THERAPY_CHANGE_DATE } from '@/lib/sample-data';
import type { AnalysisState, NightResult } from '@/lib/types';
import { loadPersistedResults, persistResults, clearPersistedResults } from '@/lib/persistence';
import { events } from '@/lib/analytics';
import { contributeNights, trackContributedDates } from '@/lib/contribute';
import { clearManifest } from '@/lib/file-manifest';
import {
  RotateCcw,
  Shield,
  AlertCircle,
  BarChart3,
  Activity,
  Waves,
  HeartPulse,
  TrendingUp,
  Play,
  Upload,
  ArrowLeftRight,
  Star,
  Moon,
  CheckCircle2,
  X,
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
  const [state, setState] = useState<AnalysisState>(orchestrator.getState());
  const [selectedNight, setSelectedNight] = useState<number>(0);
  const [isDemo, setIsDemo] = useState(false);
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
  const storageConsentRef = useRef(
    typeof window !== 'undefined' && (() => { try { return localStorage.getItem('airwaylab_storage_consent') === '1'; } catch { return false; } })()
  );
  const [oximetryJustAdded, setOximetryJustAdded] = useState(false);
  const hadOximetryRef = useRef(false);
  const [showContributeNudge, setShowContributeNudge] = useState(false);
  const pendingNightsRef = useRef<NightResult[]>([]);
  const [showDemoStar, setShowDemoStar] = useState(false);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lifetimeNights, setLifetimeNights] = useState(0);
  const [authError, setAuthError] = useState<string | null>(null);

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

  // Load lifetime night count from localStorage
  useEffect(() => {
    try {
      const stored = parseInt(localStorage.getItem('airwaylab_nights_analyzed') || '0', 10);
      if (stored > 0) setLifetimeNights(stored);
    } catch { /* noop */ }
  }, []);

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
        setPersistedData(saved);
        hadOximetryRef.current = saved.nights.some((n) => !!n.oximetry);
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
        persistResults(newState.nights, newState.therapyChangeDate);
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
          localStorage.getItem('airwaylab_contributed_dates') || '[]'
        );
        const contributedSet = new Set(contributedDates);
        const hasNewData = newState.nights.some((n) => !contributedSet.has(n.dateStr));

        if (contributeOptInRef.current && hasNewData) {
          submitContribution(newState.nights);
        } else if (!contributeOptInRef.current && contributedDates.length === 0) {
          // Only show nudge if user has never contributed before
          pendingNightsRef.current = newState.nights;
          setShowContributeNudge(true);
        }
        // If user already opted in and no new data, or already contributed,
        // the DataContribution banner handles re-contribution offers

        // Cloud storage: auto-upload raw files if consented
        if (storageConsentRef.current && sdFilesRef.current.length > 0) {
          events.cloudSyncUsed();
          const filesToUpload = [...sdFilesRef.current, ...oxFilesRef.current];
          uploadOrchestrator.upload(filesToUpload).catch(() => { /* handled by orchestrator */ });
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
    (sdFiles: File[], oxFiles: File[]) => {
      setIsDemo(false);
      sdFilesRef.current = sdFiles;
      if (lifetimeNights > 0) {
        events.returningUserUpload(lifetimeNights);
      }
      orchestrator.analyze(sdFiles, oxFiles.length > 0 ? oxFiles : undefined);
    },
    [lifetimeNights]
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
      orchestrator.analyzeOximetryOnly(files);

      // Reset input so same file can be re-selected
      if (oxInputRef.current) oxInputRef.current.value = '';
    },
    []
  );

  const submitContribution = useCallback((nightsToSubmit: NightResult[]) => {
    contributeNights(nightsToSubmit)
      .then(() => trackContributedDates(nightsToSubmit))
      .catch(() => { /* non-critical */ });
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
    setIsDemo(false);
    orchestrator.reset();
    setSelectedNight(0);
    setPersistedData(null);
    clearPersistedResults();
    clearManifest();
  }, [isDemo]);

  const { status, progress, error, warning } = state;

  // Memoize derived data to stabilize references across renders
  const nights = useMemo<NightResult[]>(() =>
    isDemo
      ? SAMPLE_NIGHTS
      : state.nights.length > 0
        ? state.nights
        : persistedData?.nights ?? [],
    [isDemo, state.nights, persistedData?.nights]
  );
  const therapyChangeDate = useMemo<string | null>(() =>
    isDemo
      ? SAMPLE_THERAPY_CHANGE_DATE
      : state.therapyChangeDate ?? persistedData?.therapyChangeDate ?? null,
    [isDemo, state.therapyChangeDate, persistedData?.therapyChangeDate]
  );

  const isComplete =
    isDemo || status === 'complete' || (persistedData !== null && persistedData.nights.length > 0);
  const currentNight = nights[selectedNight] ?? null;
  const previousNight = nights[selectedNight + 1] ?? null;

  // Memoize date strings to avoid new array allocation on every render
  const nightDates = useMemo(() => nights.map((n) => n.dateStr), [nights]);

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

      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {isDemo ? 'Demo Dashboard' : 'Analyze Sleep Data'}
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              {isDemo
                ? 'Exploring sample data — upload your own SD card to see your results'
                : 'Upload your ResMed SD card folder to begin analysis'}
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
              <span>All data stays on your device</span>
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

      {/* Upload State */}
      {status === 'idle' && !isDemo && (
        <div className="mx-auto max-w-lg">
          <FileUpload onFilesSelected={handleFiles} />

          {/* Demo CTA — shown immediately after upload for discoverability */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground/50">
              <div className="h-px flex-1 bg-border/50" />
              <span>or</span>
              <div className="h-px flex-1 bg-border/50" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={loadDemo}
              className="gap-2 text-muted-foreground hover:text-foreground"
            >
              <Play className="h-3.5 w-3.5" />
              See sample data
            </Button>
            <p className="text-[11px] text-muted-foreground/50">
              See what AirwayLab looks like with 5 nights of example data
            </p>
          </div>

          {/* Cloud storage consent — shown for eligible users */}
          <div className="mt-4">
            <StorageConsent onChange={(v) => { storageConsentRef.current = v; }} />
          </div>

          {/* Data contribution opt-in — shown during upload for higher conversion */}
          <div className="mt-4">
            <ContributionOptIn onChange={(v) => { contributeOptInRef.current = v; }} />
          </div>
        </div>
      )}

      {/* Processing State with Skeleton Preview */}
      {(status === 'uploading' || status === 'processing') && !isDemo && (
        <div className="flex flex-col gap-6">
          <div className="mx-auto w-full max-w-lg">
            <ProgressDisplay
              current={progress.current}
              total={progress.total}
              stage={progress.stage}
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
                Make sure you selected the DATALOG folder from your ResMed SD card. Need help?{' '}
                <a href="/about#getting-started" className="text-primary hover:underline">See the guide</a>.
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
        <div className="flex flex-col gap-6 animate-fade-in-up">
          {/* Demo Banner */}
          {isDemo && (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Demo mode</span>{' '}
                — viewing sample data. Upload your own SD card to analyze your therapy.
              </p>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 self-start sm:self-auto">
                <Upload className="h-3 w-3" /> Upload Your Data
              </Button>
            </div>
          )}

          {/* Restored Session Banner */}
          {!isDemo && persistedData && (
            <div className="flex flex-col gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Previous session restored</span>{' '}
                — {persistedData.nights.length} night{persistedData.nights.length !== 1 ? 's' : ''}
                {persistedData.nights.length >= 2 && (() => {
                  const sorted = [...persistedData.nights].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
                  const first = sorted[0].dateStr.slice(5); // MM-DD
                  const last = sorted[sorted.length - 1].dateStr.slice(5);
                  return ` (${first} – ${last})`;
                })()}
                . Upload new data to update.
              </p>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 self-start sm:self-auto">
                <Upload className="h-3 w-3" /> New Analysis
              </Button>
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

          {/* Cloud storage progress banner */}
          <StorageProgressBanner />

          {/* Data Contribution — prominent placement at top of dashboard */}
          <DataContribution nights={nights} isDemo={isDemo} />

          {/* Controls Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <NightSelector
                dates={nightDates}
                selectedIndex={selectedNight}
                onChange={(idx) => {
                  setSelectedNight(idx);
                  events.nightSwitched(nights.length);
                }}
              />
              {therapyChangeDate && (
                <span className="hidden text-xs text-amber-500 sm:inline">
                  Settings changed on {therapyChangeDate}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block">
                <EmailOptIn variant="inline" source={isDemo ? 'demo-dashboard' : 'analyze-dashboard'} />
              </div>
              {!isDemo && <ExportButtons nights={nights} selectedNight={nights[selectedNight]} />}
              <ThresholdSettingsModal />
              <Button variant="ghost" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-2 h-3 w-3" /> {isDemo ? 'Exit Demo' : 'New'}
              </Button>
            </div>
          </div>

          {/* Tabbed Views */}
          <Tabs defaultValue="overview" onValueChange={(tab) => events.tabViewed(tab)}>
            <TabsList className="sticky top-14 z-40 -mx-4 w-[calc(100%+2rem)] justify-start overflow-x-auto rounded-none border-b border-border/50 bg-background/95 px-4 backdrop-blur-sm sm:top-16 sm:mx-0 sm:w-full sm:rounded-lg sm:border sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
              <TabsTrigger value="overview" className="gap-1.5">
                <BarChart3 className="h-3.5 w-3.5" />
                <span className="sm:hidden text-[11px]">Ovw</span>
                <span className="hidden sm:inline">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="glasgow" className="gap-1.5">
                <Activity className="h-3.5 w-3.5" />
                <span className="sm:hidden text-[11px]">Gla</span>
                <span className="hidden sm:inline">Glasgow</span>
              </TabsTrigger>
              <TabsTrigger value="flow" className="gap-1.5">
                <Waves className="h-3.5 w-3.5" />
                <span className="sm:hidden text-[11px]">Flow</span>
                <span className="hidden sm:inline">Flow Analysis</span>
              </TabsTrigger>
              <TabsTrigger value="waveform" className="gap-1.5">
                <Waves className="h-3.5 w-3.5" />
                <span className="sm:hidden text-[11px]">Wave</span>
                <span className="hidden sm:inline">Waveforms</span>
              </TabsTrigger>
              <TabsTrigger value="oximetry" className="gap-1.5">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="sm:hidden text-[11px]">O₂</span>
                <span className="hidden sm:inline">Oximetry</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="sm:hidden text-[11px]">Trends</span>
                <span className="hidden sm:inline">Trends &amp; Graphs</span>
              </TabsTrigger>
              <TabsTrigger value="compare" className="gap-1.5">
                <ArrowLeftRight className="h-3.5 w-3.5" />
                <span className="sm:hidden text-[11px]">Cmp</span>
                <span className="hidden sm:inline">Compare</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <ErrorBoundary context="Overview">
                <OverviewTab
                  nights={nights}
                  selectedNight={currentNight}
                  previousNight={previousNight}
                  therapyChangeDate={therapyChangeDate}
                  isDemo={isDemo}
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
                  nights={nights}
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
                  nights={nights}
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="waveform" className="mt-6">
              <ErrorBoundary context="Waveforms">
                <WaveformTab
                  selectedNight={currentNight}
                  isDemo={isDemo}
                  sdFiles={sdFilesRef.current}
                  onReUpload={handleReset}
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="oximetry" className="mt-6">
              <ErrorBoundary context="Oximetry">
                <OximetryTab
                  selectedNight={currentNight}
                  previousNight={previousNight}
                  nights={nights}
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
                  nights={nights}
                  therapyChangeDate={therapyChangeDate}
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="compare" className="mt-6">
              <ErrorBoundary context="Comparison">
                <ComparisonTab
                  nights={nights}
                  nightA={currentNight}
                  nightAIndex={selectedNight}
                />
              </ErrorBoundary>
            </TabsContent>
          </Tabs>

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
    </div>
  );
}
