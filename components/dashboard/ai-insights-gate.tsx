'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { canAccess, getAIRemaining } from '@/lib/auth/feature-gate';
import { fetchAIInsights, fetchDeepAIInsights } from '@/lib/ai-insights-client';
import { DEMO_AI_INSIGHTS } from '@/lib/demo-ai-insights';
import { InsightsPanel } from '@/components/dashboard/insights-panel';
import { DeepInsightTeasers } from '@/components/dashboard/deep-insight-teasers';
import { AIInsightsCTA } from '@/components/dashboard/ai-insights-cta';
import { loadNightNotes } from '@/lib/night-notes';
import * as Sentry from '@sentry/nextjs';
import { events } from '@/lib/analytics';
import type { NightResult } from '@/lib/types';
import type { Insight } from '@/lib/insights';
import Link from 'next/link';

interface Props {
  nights: NightResult[];
  selectedNight: NightResult;
  previousNight: NightResult | null;
  therapyChangeDate: string | null;
  ruleBasedInsights: Insight[];
  isDemo: boolean;
  isNewUser: boolean;
  onOpenAuth?: () => void;
}

/**
 * Orchestrates the AI insights section of the overview tab.
 *
 * States:
 * - Anonymous: locked teasers with registration CTA
 * - Demo: static AI insights
 * - Free registered: "Generate AI Insights" button (3/month)
 * - Paid registered: "Generate Deep AI Insights" button (unlimited)
 */
export function AIInsightsGate({
  nights,
  selectedNight,
  therapyChangeDate,
  ruleBasedInsights,
  isDemo,
  isNewUser,
  onOpenAuth,
}: Props) {
  const { user, tier, isPaid } = useAuth();

  const [aiInsights, setAiInsights] = useState<Insight[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [serverRemainingCredits, setServerRemainingCredits] = useState<number | undefined>(undefined);
  const [isDeepResult, setIsDeepResult] = useState(false);
  const [isAutoRun, setIsAutoRun] = useState(false);
  const [autoBannerDismissed, setAutoBannerDismissed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Track which night the current insights are for
  const insightsNightRef = useRef<string | null>(null);

  // Demo mode: load static insights
  useEffect(() => {
    if (isDemo) {
      setAiInsights(DEMO_AI_INSIGHTS);
      insightsNightRef.current = 'demo';
    }
  }, [isDemo]);

  // Clear insights when night changes (but show re-generate option)
  const nightChanged = insightsNightRef.current !== null && insightsNightRef.current !== selectedNight.dateStr && insightsNightRef.current !== 'demo';

  const isDeepAccess = !!user && canAccess('deep_ai_insights', tier);
  const aiRemaining = user ? (isPaid ? Infinity : getAIRemaining(tier)) : 0;
  const isExhausted = !isPaid && aiRemaining <= 0 && !!user;

  // (isReturning removed — was used only by AILockedTeasers which was replaced by inline preview)

  // Stable ref to handleGenerate — populated after the callback is defined below.
  const handleGenerateRef = useRef<(() => void) | null>(null);

  // Auto-run AI insights on mount for registered free users with remaining credits.
  // Fires once per night (insightsNightRef guards against re-running for the same night).
  const autoRunFiredRef = useRef(false);
  useEffect(() => {
    if (autoRunFiredRef.current) return;
    if (!user || isPaid || isDemo) return;
    if (aiRemaining <= 0) return;
    if (aiInsights !== null || aiLoading) return;
    if (insightsNightRef.current === selectedNight.dateStr) return;
    autoRunFiredRef.current = true;
    setIsAutoRun(true);
    // Call via ref so we don't need handleGenerate in deps (avoids declaration-order issues)
    handleGenerateRef.current?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isPaid, isDemo]);

  const handleGenerate = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAiLoading(true);
    setAiError(null);

    const selectedIdx = nights.indexOf(selectedNight);
    const notes = loadNightNotes(selectedNight.dateStr);

    events.aiInsightsButtonClicked(tier, aiRemaining === Infinity ? 999 : aiRemaining);
    Sentry.addBreadcrumb({ message: 'AI insights requested', category: 'ai', data: { tier } });

    const nightIdx = selectedIdx >= 0 ? selectedIdx : 0;

    // Use deep fetch for paid users — includes per-breath data from the selected night
    const fetchFn = isDeepAccess
      ? () => {
          // Extract per-breath summary from NED engine breaths if available
          const night = nights[nightIdx]!;
          const nedData = night.ned as unknown as Record<string, unknown>;
          const nedBreaths = nedData.breaths as Array<Record<string, unknown>> | undefined;
          const perBreathSummary = nedBreaths && nedBreaths.length > 0
            ? {
                breaths: nedBreaths.map((b) => ({
                  ned: Number(b.ned ?? 0),
                  fi: Number(b.flatnessIndex ?? 0),
                  mShape: Boolean(b.mShape),
                  tPeakTi: Number(b.tPeakTi ?? 0),
                  qPeak: Number(b.qPeak ?? 0),
                  duration: Number(b.duration ?? 0),
                })),
                breathCount: nedBreaths.length,
                sampleRate: Number(nedData.sampleRate ?? 25),
              }
            : undefined;
          return fetchDeepAIInsights(nights, nightIdx, therapyChangeDate, controller.signal, notes, perBreathSummary);
        }
      : () => fetchAIInsights(nights, nightIdx, therapyChangeDate, controller.signal, notes);

    fetchFn()
      .then((result) => {
        if (controller.signal.aborted) return;
        setServerRemainingCredits(result.remainingCredits);
        setAiInsights(result.insights);
        setIsDeepResult(result.isDeep ?? false);
        insightsNightRef.current = selectedNight.dateStr;
        events.aiInsightsGenerated(tier, result.insights.length, isDeepAccess);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : 'AI analysis failed. Please try again.';
        setAiError(message);
        events.aiInsightsFailed(tier, message);

        // Capture to Sentry — skip expected user-facing errors
        const skipSentry = /unauthorized|session.*expired|limit reached/i.test(message);
        if (!skipSentry) {
          Sentry.captureException(err instanceof Error ? err : new Error(message), {
            tags: { component: 'ai-insights-gate', tier },
            extra: { nightCount: nights.length, isDeepAccess },
          });
        }
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setAiLoading(false);
      });

    return () => { controller.abort(); };
  }, [nights, selectedNight, therapyChangeDate, tier, aiRemaining, isDeepAccess]);

  // Keep ref in sync with the latest handleGenerate callback
  handleGenerateRef.current = handleGenerate;

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleOpenAuth = onOpenAuth ?? (() => { /* noop if no auth handler */ });

  // Anonymous users: rule-based insights + AI preview using aggregate metrics
  if (!user && !isDemo) {
    // Pick top 1 rule-based insight for AI-style preview card
    const previewInsight = ruleBasedInsights.find((i) => i.type === 'warning' || i.type === 'actionable')
      ?? ruleBasedInsights[0];

    return (
      <>
        {/* Rule-based insights still show */}
        {ruleBasedInsights.length > 0 && (
          <InsightsPanel
            insights={ruleBasedInsights}
            defaultExpanded={!isNewUser}
          />
        )}
        {/* Anonymous AI preview — aggregate metrics only, no auth required */}
        <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/30 px-4 pb-4 pt-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">AI Analysis Preview</h3>
            <span className="ml-auto text-[10px] text-muted-foreground/60">Based on your metrics</span>
          </div>

          {/* Live preview card from aggregate metrics */}
          {previewInsight && (
            <div className="rounded-lg border border-border/30 bg-muted/10 px-4 py-3">
              <p className="text-[11px] font-medium text-foreground/80">{previewInsight.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{previewInsight.body}</p>
            </div>
          )}

          {/* Two locked skeleton cards representing AI-only insights */}
          {[0, 1].map((i) => (
            <div
              key={i}
              className="relative overflow-hidden rounded-lg border border-border/30 bg-muted/10 px-4 py-3"
            >
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 h-4 w-4 rounded-full skeleton-shimmer" />
                <div className="min-w-0 flex-1">
                  <div className="h-3.5 w-32 rounded skeleton-shimmer" />
                  <div className="mt-2 h-3 w-full rounded skeleton-shimmer" />
                  <div className="mt-1 h-3 w-3/4 rounded skeleton-shimmer" />
                </div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
                <span className="rounded-full border border-border/50 bg-card px-2 py-0.5 text-[10px] text-muted-foreground/70">
                  Register to unlock
                </span>
              </div>
            </div>
          ))}

          <div className="flex flex-col items-center gap-2 pt-1">
            <Button
              onClick={() => {
                events.aiTeaserCtaClicked();
                handleOpenAuth();
              }}
              className="w-full gap-2 sm:w-auto"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Create a free account for full AI insights
            </Button>
            <p className="text-center text-[11px] text-muted-foreground/80">
              Free · no credit card · 3 AI analyses per month included
            </p>
          </div>
        </div>
      </>
    );
  }

  // Demo mode: show static AI insights
  if (isDemo) {
    return (
      <>
        {(ruleBasedInsights.length > 0 || aiInsights) && (
          <InsightsPanel
            insights={ruleBasedInsights}
            aiInsights={aiInsights}
            aiLoading={false}
            defaultExpanded={!isNewUser}
            aiCTA={
              aiInsights && aiInsights.length > 0
                ? <AIInsightsCTA isDemo remainingCredits={serverRemainingCredits} />
                : undefined
            }
          />
        )}
        {/* Demo registration nudge */}
        <div className="flex items-start gap-2 rounded-md border border-primary/10 bg-primary/[0.03] px-3 py-2">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary/50" />
          <p className="text-[11px] leading-relaxed text-muted-foreground/70">
            Like these insights? Create a free account to analyse your own data with AI.{' '}
            <button
              onClick={handleOpenAuth}
              className="font-medium text-primary/70 underline underline-offset-2 hover:text-primary"
            >
              Create free account
            </button>
          </p>
        </div>
      </>
    );
  }

  // Registered user: show generate button + insights
  const showInsightsPanel = ruleBasedInsights.length > 0 || aiLoading || (aiInsights && aiInsights.length > 0);

  return (
    <>
      {showInsightsPanel && (
        <InsightsPanel
          insights={ruleBasedInsights}
          aiInsights={aiInsights}
          aiLoading={aiLoading}
          isDeepAnalysis={isDeepResult}
          defaultExpanded={!isNewUser}
          aiCTA={
            aiInsights && aiInsights.length > 0
              ? <AIInsightsCTA isDemo={false} remainingCredits={serverRemainingCredits} />
              : undefined
          }
        />
      )}

      {/* Generate button — only if insights not yet loaded for this night */}
      {!aiInsights && !aiLoading && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border/50 bg-card/30 px-4 py-4">
          {isExhausted ? (
            <>
              <p className="text-sm text-muted-foreground">
                3 free analyses used this month.
              </p>
              <p className="text-xs text-muted-foreground/80">
                Resets next month.{' '}
                <Link href="/pricing" className="font-medium text-primary/70 underline underline-offset-2 hover:text-primary">
                  Become a Supporter
                </Link>{' '}
                for unlimited deep analysis.
              </p>
            </>
          ) : (
            <>
              <Button
                onClick={handleGenerate}
                disabled={aiLoading}
                className="gap-2"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {isDeepAccess ? 'Generate Deep AI Insights' : 'Generate AI Insights'}
              </Button>
              <p className="text-[11px] text-muted-foreground/80">
                {isDeepAccess
                  ? 'Analyses waveform patterns, per-breath metrics, and cross-engine correlations.'
                  : `${aiRemaining} free this month`
                }
              </p>
            </>
          )}

          {aiError && (
            <p className="text-xs text-red-400">{aiError}</p>
          )}
        </div>
      )}

      {/* Auto-run banner — shown after AI auto-ran on load for free registered users */}
      {isAutoRun && aiInsights && !autoBannerDismissed && (
        <div className="flex items-center gap-2 rounded-md border border-primary/10 bg-primary/[0.03] px-3 py-2">
          <Sparkles className="h-3 w-3 shrink-0 text-primary/50" />
          <p className="flex-1 text-[11px] leading-relaxed text-muted-foreground/80">
            AI analysis ran automatically
            {serverRemainingCredits !== undefined
              ? ` · ${serverRemainingCredits} remaining this month`
              : aiRemaining !== Infinity
                ? ` · ${aiRemaining} remaining this month`
                : null}
            {' · '}
            <Link
              href="/pricing"
              className="font-medium text-primary/70 underline underline-offset-2 hover:text-primary"
            >
              Upgrade for unlimited →
            </Link>
          </p>
          <button
            type="button"
            onClick={() => setAutoBannerDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Re-generate for different night */}
      {nightChanged && aiInsights && !aiLoading && (
        <div className="flex items-center justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerate}
            disabled={isExhausted}
            className="gap-1.5 text-xs text-muted-foreground"
          >
            <Sparkles className="h-3 w-3" />
            Re-generate for {selectedNight.dateStr}
          </Button>
        </div>
      )}

      {/* Deep insight teasers for free users after AI insights load */}
      {aiInsights && aiInsights.length > 0 && !isPaid && !isDemo && (
        <DeepInsightTeasers night={selectedNight} />
      )}
    </>
  );
}
