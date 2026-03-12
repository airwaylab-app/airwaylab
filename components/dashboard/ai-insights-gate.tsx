'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { canAccess, getAIRemaining } from '@/lib/auth/feature-gate';
import { fetchAIInsights, fetchDeepAIInsights } from '@/lib/ai-insights-client';
import { DEMO_AI_INSIGHTS } from '@/lib/demo-ai-insights';
import { InsightsPanel } from '@/components/dashboard/insights-panel';
import { AILockedTeasers } from '@/components/dashboard/ai-locked-teasers';
import { DeepInsightTeasers } from '@/components/dashboard/deep-insight-teasers';
import { AIInsightsCTA } from '@/components/dashboard/ai-insights-cta';
import { loadNightNotes } from '@/lib/night-notes';
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

  // Check localStorage results for returning user detection
  const isReturning = typeof window !== 'undefined' && (() => {
    try { return !!localStorage.getItem('airwaylab_results'); } catch { return false; }
  })();

  const handleGenerate = useCallback(() => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAiLoading(true);
    setAiError(null);

    const selectedIdx = nights.indexOf(selectedNight);
    const notes = loadNightNotes(selectedNight.dateStr);

    events.aiInsightsButtonClicked(tier, aiRemaining === Infinity ? 999 : aiRemaining);

    const nightIdx = selectedIdx >= 0 ? selectedIdx : 0;

    // Use deep fetch for paid users — includes per-breath data from the selected night
    const fetchFn = isDeepAccess
      ? () => {
          // Extract per-breath summary from NED engine breaths if available
          const night = nights[nightIdx];
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
        if (result) {
          setServerRemainingCredits(result.remainingCredits);
          setAiInsights(result.insights);
          setIsDeepResult(result.isDeep ?? false);
          insightsNightRef.current = selectedNight.dateStr;
          events.aiInsightsGenerated(tier, result.insights.length, isDeepAccess);
        } else {
          setAiError('AI analysis temporarily unavailable. Please try again.');
          events.aiInsightsFailed(tier, 'null_result');
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setAiError('AI analysis temporarily unavailable. Please try again.');
        events.aiInsightsFailed(tier, 'fetch_error');
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setAiLoading(false);
      });

    return () => { controller.abort(); };
  }, [nights, selectedNight, therapyChangeDate, tier, aiRemaining, isDeepAccess]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleOpenAuth = onOpenAuth ?? (() => { /* noop if no auth handler */ });

  // Anonymous users: show locked teasers
  if (!user && !isDemo) {
    return (
      <>
        {/* Rule-based insights still show */}
        {ruleBasedInsights.length > 0 && (
          <InsightsPanel
            insights={ruleBasedInsights}
            defaultExpanded={!isNewUser}
          />
        )}
        <AILockedTeasers
          nightCount={nights.length}
          isReturning={isReturning}
          onRegister={handleOpenAuth}
        />
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
        <DeepInsightTeasers />
      )}
    </>
  );
}
