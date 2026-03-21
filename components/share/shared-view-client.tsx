'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Copy,
  Check,
  AlertCircle,
  BarChart,
  BarChart3,
  Activity,
  Waves,
  HeartPulse,
  TrendingUp,
  Upload,
  HardDrive,
} from 'lucide-react';
import { NightSelector } from '@/components/common/night-selector';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { ThresholdsProvider } from '@/components/common/thresholds-provider';
import { OverviewTab } from '@/components/dashboard/overview-tab';
import { GlasgowTab } from '@/components/dashboard/glasgow-tab';
import { FlowAnalysisTab } from '@/components/dashboard/flow-analysis-tab';
import { OximetryTab } from '@/components/dashboard/oximetry-tab';
import { TrendsTab } from '@/components/dashboard/trends-tab';
import { SharedGraphsTab } from '@/components/share/shared-graphs-tab';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/analytics';
import type { NightResult, MachineSettings } from '@/lib/types';

interface Props {
  nights: NightResult[];
  machineInfo: MachineSettings | null;
  nightsCount: number;
  expiresAt: string;
  shareUrl: string;
  shareId: string;
  hasFiles: boolean;
  filePaths: string[];
}

export function SharedViewClient({
  nights,
  machineInfo,
  nightsCount,
  expiresAt,
  shareUrl,
  shareId,
  hasFiles,
  filePaths,
}: Props) {
  const [selectedNight, setSelectedNight] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  // Track shared view
  useEffect(() => {
    events.shareViewed();
  }, []);

  const currentNight = nights[selectedNight] ?? nights[0]!;
  const previousNight = nights[selectedNight + 1] ?? null;

  const nightDates = useMemo(
    () => nights.map((n) => n.dateStr),
    [nights]
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setCopyError(false);
      events.shareCopied();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(true);
      setTimeout(() => setCopyError(false), 3000);
    }
  }, [shareUrl]);

  // Format date deterministically to avoid SSR/client hydration mismatch
  // (toLocaleDateString output varies by runtime environment)
  const expiresDate = (() => {
    const d = new Date(expiresAt);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
  })();

  return (
    <ThresholdsProvider>
      <div className="container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8" data-sentry-mask>
        {/* Header banner */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[0.04] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-sm font-semibold">
              Shared Analysis &middot; {nightsCount} night
              {nightsCount !== 1 ? 's' : ''} &middot; Expires {expiresDate}
            </h1>
            {machineInfo && machineInfo.settingsSource !== 'unavailable' ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <HardDrive className="h-3 w-3" />
                {machineInfo.deviceModel}
                {machineInfo.papMode ? ` \u00b7 ${machineInfo.papMode}` : ''}
                {machineInfo.epap
                  ? ` \u00b7 EPAP ${machineInfo.epap}`
                  : ''}
                {machineInfo.ipap
                  ? ` / IPAP ${machineInfo.ipap}`
                  : ''}
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground/60">
                <HardDrive className="h-3 w-3" />
                Device settings not available
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium transition-colors hover:bg-accent"
              aria-label="Copy share link"
            >
              {copyError ? (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertCircle className="h-3 w-3" /> Copy failed
                </span>
              ) : copied ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check className="h-3 w-3" /> Copied!
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Copy className="h-3 w-3" /> Copy Link
                </span>
              )}
            </button>
            <Link href="/analyze">
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                <Upload className="h-3 w-3" />
                <span className="hidden sm:inline">Analyse your own data</span>
                <span className="sm:hidden">Analyse</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Night selector (multi-night only) */}
        {nights.length > 1 && (
          <div className="mb-4">
            <NightSelector
              dates={nightDates}
              selectedIndex={selectedNight}
              onChange={setSelectedNight}
            />
          </div>
        )}

        {/* Dashboard tabs */}
        <Tabs
          defaultValue="overview"
          onValueChange={(tab) => events.tabViewed(tab)}
        >
          <TabsList className="sticky top-14 z-40 -mx-4 w-[calc(100%+2rem)] justify-start overflow-x-auto rounded-none border-b border-border/50 bg-background/95 px-4 backdrop-blur-sm sm:top-16 sm:mx-0 sm:w-full sm:rounded-lg sm:border sm:bg-transparent sm:px-0 sm:backdrop-blur-none">
            <TabsTrigger value="overview" className="gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="text-[11px] sm:hidden">Ovw</span>
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="glasgow" className="gap-1.5">
              <Activity className="h-3.5 w-3.5" />
              <span className="text-[11px] sm:hidden">Gla</span>
              <span className="hidden sm:inline">Glasgow</span>
            </TabsTrigger>
            <TabsTrigger value="flow" className="gap-1.5">
              <Waves className="h-3.5 w-3.5" />
              <span className="text-[11px] sm:hidden">Flow</span>
              <span className="hidden sm:inline">Flow Analysis</span>
            </TabsTrigger>
            {currentNight?.oximetry && (
              <TabsTrigger value="oximetry" className="gap-1.5">
                <HeartPulse className="h-3.5 w-3.5" />
                <span className="text-[11px] sm:hidden">O&#8322;</span>
                <span className="hidden sm:inline">Oximetry</span>
              </TabsTrigger>
            )}
            {hasFiles && filePaths.length > 0 && (
              <TabsTrigger value="graphs" className="gap-1.5">
                <BarChart className="h-3.5 w-3.5" />
                <span className="text-[11px] sm:hidden">Gra</span>
                <span className="hidden sm:inline">Graphs</span>
              </TabsTrigger>
            )}
            {nights.length > 1 && (
              <TabsTrigger value="trends" className="gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-[11px] sm:hidden">Trends</span>
                <span className="hidden sm:inline">Trends &amp; Graphs</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <ErrorBoundary context="Overview">
              <OverviewTab
                nights={nights}
                selectedNight={currentNight!}
                previousNight={previousNight}
                therapyChangeDate={null}
                isDemo={false}
              />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="glasgow" className="mt-6">
            <ErrorBoundary context="Glasgow Index">
              <GlasgowTab
                nights={nights}
                selectedNight={currentNight!}
                previousNight={previousNight}
                therapyChangeDate={null}
              />
            </ErrorBoundary>
          </TabsContent>

          <TabsContent value="flow" className="mt-6">
            <ErrorBoundary context="Flow Analysis">
              <FlowAnalysisTab
                selectedNight={currentNight!}
                previousNight={previousNight}
                nights={nights}
              />
            </ErrorBoundary>
          </TabsContent>

          {currentNight?.oximetry && (
            <TabsContent value="oximetry" className="mt-6">
              <ErrorBoundary context="Oximetry">
                <OximetryTab
                  selectedNight={currentNight!}
                  previousNight={previousNight}
                  nights={nights}
                />
              </ErrorBoundary>
            </TabsContent>
          )}

          {hasFiles && filePaths.length > 0 && (
            <TabsContent value="graphs" className="mt-6">
              <ErrorBoundary context="Graphs">
                <SharedGraphsTab
                  shareId={shareId}
                  filePaths={filePaths}
                  dateStr={currentNight!.dateStr}
                />
              </ErrorBoundary>
            </TabsContent>
          )}

          {nights.length > 1 && (
            <TabsContent value="trends" className="mt-6">
              <ErrorBoundary context="Trends">
                <TrendsTab nights={nights} therapyChangeDate={null} />
              </ErrorBoundary>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </ThresholdsProvider>
  );
}
