'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileUpload } from '@/components/upload/file-upload';
import { ProgressDisplay } from '@/components/upload/progress-display';
import { ContributionOptIn } from '@/components/upload/contribution-opt-in';
import { ContributionNudgeDialog } from '@/components/upload/contribution-nudge-dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { orchestrator } from '@/lib/analysis-orchestrator';
import { SAMPLE_NIGHTS, SAMPLE_THERAPY_CHANGE_DATE } from '@/lib/sample-data';
import type { AnalysisState, NightResult } from '@/lib/types';
import { loadPersistedResults, persistResults, clearPersistedResults } from '@/lib/persistence';
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
} from 'lucide-react';

export default function AnalyzePage() {
  return (
    <Suspense fallback={null}>
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
  const oxInputRef = useRef<HTMLInputElement>(null);
  const contributeOptInRef = useRef(false);
  const [showContributeNudge, setShowContributeNudge] = useState(false);
  const pendingNightsRef = useRef<NightResult[]>([]);
  const [showDemoStar, setShowDemoStar] = useState(false);
  const demoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lifetimeNights, setLifetimeNights] = useState(0);

  // Load lifetime night count from localStorage
  useEffect(() => {
    try {
      const stored = parseInt(localStorage.getItem('airwaylab-nights-analyzed') || '0', 10);
      if (stored > 0) setLifetimeNights(stored);
    } catch { /* noop */ }
  }, []);

  // Show GitHub star prompt after 30s in demo mode (once per session)
  useEffect(() => {
    if (isDemo && !showDemoStar) {
      try {
        if (sessionStorage.getItem('airwaylab-demo-star-shown') === '1') return;
      } catch { /* noop */ }
      demoTimerRef.current = setTimeout(() => {
        setShowDemoStar(true);
        try { sessionStorage.setItem('airwaylab-demo-star-shown', '1'); } catch { /* noop */ }
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
      if (saved) setPersistedData(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return orchestrator.subscribe((newState) => {
      setState(newState);
      // Persist results when analysis completes
      if (newState.status === 'complete' && newState.nights.length > 0) {
        persistResults(newState.nights, newState.therapyChangeDate);
        setPersistedData(null);

        // Track analysis session (fire-and-forget, non-blocking)
        const hasOximetry = newState.nights.some((n) => !!n.oximetry);
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

        // Contribute data: auto if opted in, show nudge dialog if not
        if (contributeOptInRef.current) {
          submitContribution(newState.nights);
        } else {
          pendingNightsRef.current = newState.nights;
          setShowContributeNudge(true);
        }

        // Update local lifetime night count
        try {
          const prev = parseInt(localStorage.getItem('airwaylab-nights-analyzed') || '0', 10);
          const updated = prev + newState.nights.length;
          localStorage.setItem('airwaylab-nights-analyzed', String(updated));
          setLifetimeNights(updated);
        } catch { /* noop */ }
      }
    });
  }, []);

  const handleFiles = useCallback(
    (sdFiles: File[], oxFiles: File[]) => {
      setIsDemo(false);
      sdFilesRef.current = sdFiles;
      orchestrator.analyze(sdFiles, oxFiles.length > 0 ? oxFiles : undefined);
    },
    []
  );

  const handleOximetryUpload = useCallback(() => {
    oxInputRef.current?.click();
  }, []);

  const handleOximetryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0 && sdFilesRef.current.length > 0) {
        orchestrator.analyze(sdFilesRef.current, files);
      }
      // Reset input so same file can be re-selected
      if (oxInputRef.current) oxInputRef.current.value = '';
    },
    []
  );

  const submitContribution = useCallback((nightsToSubmit: NightResult[]) => {
    fetch('/api/contribute-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nights: nightsToSubmit }),
    }).then((res) => {
      if (res.ok) {
        try {
          const prev = parseInt(localStorage.getItem('airwaylab-contributed-nights') || '0', 10);
          localStorage.setItem('airwaylab-contributed-nights', String(prev + nightsToSubmit.length));
        } catch { /* noop */ }
      }
    }).catch(() => { /* non-critical */ });
  }, []);

  const handleNudgeContribute = useCallback(() => {
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
    // Bypass the orchestrator — inject sample data directly
    orchestrator.reset();
  }, []);

  const handleReset = useCallback(() => {
    // Show demo star prompt when exiting demo (if not already shown)
    if (isDemo) {
      try {
        if (sessionStorage.getItem('airwaylab-demo-star-shown') !== '1') {
          setShowDemoStar(true);
          sessionStorage.setItem('airwaylab-demo-star-shown', '1');
        }
      } catch { /* noop */ }
    }
    setIsDemo(false);
    orchestrator.reset();
    setSelectedNight(0);
    setPersistedData(null);
    clearPersistedResults();
  }, [isDemo]);

  const { status, progress, error } = state;

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

          {/* Data contribution opt-in — shown during upload for higher conversion */}
          <div className="mt-4">
            <ContributionOptIn onChange={(v) => { contributeOptInRef.current = v; }} />
          </div>

          {/* Demo CTA */}
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
        <div className="mx-auto max-w-lg">
          <div className="flex flex-col gap-3 rounded-xl border border-red-500/30 bg-red-500/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleReset} className="self-start sm:self-auto">
              <RotateCcw className="mr-2 h-3 w-3" /> Try Again
            </Button>
          </div>
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
                — showing your last analysis. Upload new data to start fresh.
              </p>
              <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 self-start sm:self-auto">
                <Upload className="h-3 w-3" /> New Analysis
              </Button>
            </div>
          )}

          {/* Data Contribution — prominent placement at top of dashboard */}
          <DataContribution nights={nights} isDemo={isDemo} />

          {/* Controls Bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <NightSelector
                dates={nightDates}
                selectedIndex={selectedNight}
                onChange={setSelectedNight}
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
          <Tabs defaultValue="overview">
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
              <TabsTrigger value="oximetry" className="gap-1.5">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="sm:hidden text-[11px]">O₂</span>
                <span className="hidden sm:inline">Oximetry</span>
              </TabsTrigger>
              <TabsTrigger value="trends" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="sm:hidden text-[11px]">Trnd</span>
                <span className="hidden sm:inline">Trends</span>
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
                    !isDemo && !currentNight.oximetry && sdFilesRef.current.length > 0
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
                />
              </ErrorBoundary>
            </TabsContent>

            <TabsContent value="oximetry" className="mt-6">
              <ErrorBoundary context="Oximetry">
                <OximetryTab
                  selectedNight={currentNight}
                  previousNight={previousNight}
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
