'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/common/metric-card';
import { NightHeatmap } from '@/components/charts/night-heatmap';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';
import { generateInsights, type Insight } from '@/lib/insights';
import { fetchAIInsights } from '@/lib/ai-insights-client';
import { DEMO_AI_INSIGHTS } from '@/lib/demo-ai-insights';
import { AIInsightsCTA } from '@/components/dashboard/ai-insights-cta';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { HeartPulse, TrendingDown, TrendingUp, AlertCircle, Info, CheckCircle, ChevronRight, Upload, Sparkles, Loader2, ArrowRight } from 'lucide-react';
import { UpgradePrompt } from '@/components/auth/upgrade-prompt';
import { useAuth } from '@/lib/auth/auth-context';
import { canAccess, incrementAIUsage } from '@/lib/auth/feature-gate';
import { SharePrompts } from '@/components/dashboard/share-prompts';
import { MetricDetailModal } from '@/components/dashboard/metric-detail-modal';
import { NextSteps } from '@/components/dashboard/next-steps';
import { MetricExplanation } from '@/components/common/metric-explanation';
import { getGlasgowExplanation, getEAIExplanation, getNEDExplanation } from '@/lib/metric-explanations';
import type { GlasgowComponents } from '@/lib/types';
import type { ThresholdDef } from '@/lib/thresholds';

const GLASGOW_COMPONENTS: { key: keyof GlasgowComponents; label: string; short: string }[] = [
  { key: 'skew', label: 'Skew', short: 'Waveform asymmetry' },
  { key: 'spike', label: 'Spike', short: 'Transient peaks' },
  { key: 'flatTop', label: 'Flat Top', short: 'Flow plateau' },
  { key: 'topHeavy', label: 'Top Heavy', short: 'Early-insp. excess' },
  { key: 'multiPeak', label: 'Multi-Peak', short: 'Multiple peaks' },
  { key: 'noPause', label: 'No Pause', short: 'Missing end-insp. pause' },
  { key: 'inspirRate', label: 'Insp. Rate', short: 'Flow rate changes' },
  { key: 'multiBreath', label: 'Multi-Breath', short: 'Cross-breath pattern' },
  { key: 'variableAmp', label: 'Var. Amp', short: 'Amplitude variability' },
];

function fmtHrs(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

const insightStyles: Record<Insight['type'], { icon: typeof CheckCircle; border: string; bg: string; iconColor: string }> = {
  positive: { icon: CheckCircle, border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', iconColor: 'text-emerald-500' },
  warning: { icon: AlertCircle, border: 'border-amber-500/20', bg: 'bg-amber-500/5', iconColor: 'text-amber-500' },
  actionable: { icon: TrendingDown, border: 'border-red-500/20', bg: 'bg-red-500/5', iconColor: 'text-red-500' },
  info: { icon: Info, border: 'border-blue-500/20', bg: 'bg-blue-500/5', iconColor: 'text-blue-400' },
};

interface Props {
  nights: NightResult[];
  selectedNight: NightResult;
  previousNight: NightResult | null;
  therapyChangeDate: string | null;
  onUploadOximetry?: () => void;
  onReUpload?: () => void;
  isDemo?: boolean;
}

export function OverviewTab({ nights, selectedNight, previousNight, therapyChangeDate, onUploadOximetry, onReUpload, isDemo = false }: Props) {
  const THRESHOLDS = useThresholds();
  const n = selectedNight;
  const p = previousNight;
  const insights = generateInsights(nights, n, p, therapyChangeDate);

  const { user, tier, isPaid } = useAuth();

  const [aiInsights, setAiInsights] = useState<Insight[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [serverRemainingCredits, setServerRemainingCredits] = useState<number | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);

  // Check if user can use AI insights (signed in + has quota or is paid)
  const hasAIAccess = !!user && canAccess('ai_insights', tier);

  // H4: Cancel in-flight AI requests when night changes + L3: prevent stale responses
  useEffect(() => {
    if (!hasAIAccess || isDemo) return;

    // Cancel any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAiLoading(true);
    const selectedIdx = nights.indexOf(selectedNight);

    fetchAIInsights(
      nights,
      selectedIdx >= 0 ? selectedIdx : 0,
      therapyChangeDate,
      controller.signal
    )
      .then((result) => {
        // L3: Don't update state if this request was aborted (stale)
        if (controller.signal.aborted) return;
        if (result) {
          incrementAIUsage();
          setAiInsights(result.insights);
          if (result.remainingCredits !== undefined) {
            setServerRemainingCredits(result.remainingCredits);
          }
        } else {
          setAiInsights(null);
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setAiInsights(null);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setAiLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [hasAIAccess, isDemo, nights, selectedNight, therapyChangeDate]);

  // Demo mode: load static AI insights instantly (no API call, no credits)
  useEffect(() => {
    if (!isDemo) return;
    setAiInsights(DEMO_AI_INSIGHTS);
  }, [isDemo]);

  // Track session count for new-user UX (expand explanations for first 5 sessions)
  const [isNewUser, setIsNewUser] = useState(false);
  useEffect(() => {
    const count = parseInt(localStorage.getItem('airwaylab_session_count') || '0', 10);
    const next = count + 1;
    localStorage.setItem('airwaylab_session_count', String(next));
    setIsNewUser(next <= 5);
  }, []);

  // Metric detail modal state
  const [detailMetric, setDetailMetric] = useState<{
    label: string;
    unit?: string;
    accessor: (n: NightResult) => number | undefined;
    threshold?: ThresholdDef;
    description?: string;
  } | null>(null);

  const openMetric = useCallback(
    (
      label: string,
      accessor: (n: NightResult) => number | undefined,
      opts?: { unit?: string; threshold?: ThresholdDef; description?: string }
    ) => {
      setDetailMetric({ label, accessor, ...opts });
    },
    []
  );

  return (
    <div className="flex flex-col gap-6">
      {/* AI Insights (shown above rule-based when available) */}
      {aiLoading && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/[0.03] px-4 py-3 animate-fade-in-up">
          <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
          <span className="text-sm text-muted-foreground">Loading AI insights...</span>
        </div>
      )}

      {aiInsights && aiInsights.length > 0 && (
        <div className="flex flex-col gap-2 animate-fade-in-up">
          {aiInsights.map((insight) => {
            const style = insightStyles[insight.type];
            const Icon = style.icon;
            return (
              <div
                key={insight.id}
                className={`rounded-lg border ${style.border} ${style.bg} px-4 py-3`}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">
                        {insight.title}
                      </p>
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                        <Sparkles className="h-2.5 w-2.5" />
                        AI
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {insight.body}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Insights CTA (demo or community tier) */}
      {aiInsights && aiInsights.length > 0 && (
        <AIInsightsCTA isDemo={isDemo} remainingCredits={serverRemainingCredits} />
      )}

      {/* Rule-based Insights Panel */}
      {insights.length > 0 && (
        <div className="flex flex-col gap-2 animate-fade-in-up">
          {insights.map((insight) => {
            const style = insightStyles[insight.type];
            const Icon = style.icon;
            return (
              <div
                key={insight.id}
                className={`rounded-lg border ${style.border} ${style.bg} px-4 py-3`}
              >
                <div className="flex items-start gap-2.5">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {insight.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                      {insight.body}
                    </p>
                    {insight.link && (
                      <Link
                        href={insight.link.href}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      >
                        {insight.link.text} <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Next Steps CTA */}
      <NextSteps
        selectedNight={n}
        hasOximetry={!!n.oximetry}
        nightCount={nights.length}
        onUploadOximetry={onUploadOximetry}
        onReUpload={onReUpload}
      />

      {/* Night Info Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono">
          {fmtHrs(n.durationHours)}
        </Badge>
        <Badge variant="secondary">
          {n.sessionCount} session{n.sessionCount !== 1 ? 's' : ''}
        </Badge>
        <Badge variant="outline">{n.settings.papMode}</Badge>
        {n.settings.epap > 0 && (
          <Badge variant="outline">
            {n.settings.epap}/{n.settings.ipap} cmH₂O
          </Badge>
        )}
        {n.settings.pressureSupport > 0 && (
          <Badge variant="outline">PS {n.settings.pressureSupport}</Badge>
        )}
      </div>

      {/* Start-here guidance for new users */}
      {isNewUser && (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/10 bg-primary/[0.03] px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Start with Glasgow Index</span> — it scores your overall breathing pattern on a 0–8 scale.
            Green means normal, amber means worth monitoring, red means discuss with your clinician.
            Click any metric for a detailed trend view.
          </p>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <MetricCard
          label="Glasgow Index"
          value={n.glasgow.overall}
          threshold={THRESHOLDS.glasgowOverall}
          previousValue={p?.glasgow.overall}
          tooltip="A composite score measuring how abnormal your breathing waveform looks. Lower is better. Based on 9 breath shape components."
          onClick={() => openMetric('Glasgow Index', (x) => x.glasgow.overall, { threshold: THRESHOLDS.glasgowOverall, description: 'Composite breath-shape abnormality score across all nights' })}
        />
        <MetricCard
          label="FL Score"
          value={n.wat.flScore}
          unit="%"
          format="pct"
          threshold={THRESHOLDS.watFL}
          previousValue={p?.wat.flScore}
          tooltip="Percentage of breaths showing flow limitation — when your airway partially collapses during inhalation. Lower is better."
          onClick={() => openMetric('FL Score', (x) => x.wat.flScore, { unit: '%', threshold: THRESHOLDS.watFL, description: 'Percentage of flow-limited breaths per night' })}
        />
        <MetricCard
          label="NED Mean"
          value={n.ned.nedMean}
          unit="%"
          format="pct"
          threshold={THRESHOLDS.nedMean}
          previousValue={p?.ned.nedMean}
          tooltip="Negative Effort Dependence — measures how much your breathing effort is wasted due to airway obstruction. Lower is better."
          onClick={() => openMetric('NED Mean', (x) => x.ned.nedMean, { unit: '%', threshold: THRESHOLDS.nedMean, description: 'Average wasted breathing effort due to obstruction' })}
        />
        <MetricCard
          label="RERA Index"
          value={n.ned.reraIndex}
          unit="/hr"
          threshold={THRESHOLDS.reraIndex}
          previousValue={p?.ned.reraIndex}
          tooltip="Respiratory Effort-Related Arousals per hour. These are brief awakenings caused by breathing effort. Lower is better."
          onClick={() => openMetric('RERA Index', (x) => x.ned.reraIndex, { unit: '/hr', threshold: THRESHOLDS.reraIndex, description: 'Respiratory effort-related arousals per hour' })}
        />
      </div>

      <MetricExplanation
        text={getGlasgowExplanation(n.glasgow.overall, THRESHOLDS.glasgowOverall)}
        defaultExpanded={isNewUser}
      />

      {/* Glasgow Component Breakdown (Collapsible) */}
      <details className="group rounded-xl border border-border/50 bg-card/30">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          Glasgow Component Breakdown
          <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
            Overall: {n.glasgow.overall.toFixed(1)}
          </span>
        </summary>
        <div className="border-t border-border/30 px-4 pb-4 pt-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {GLASGOW_COMPONENTS.map((c) => {
              const val = n.glasgow[c.key] as number;
              const prevVal = p ? (p.glasgow[c.key] as number) : undefined;
              return (
                <div
                  key={c.key}
                  className="rounded-lg border border-border/30 bg-card/50 px-3 py-2"
                >
                  <div className="text-[10px] text-muted-foreground">{c.label}</div>
                  <div className="mt-0.5 flex items-baseline gap-1.5">
                    <span className="font-mono text-lg font-semibold tabular-nums">
                      {val.toFixed(1)}
                    </span>
                    {prevVal !== undefined && Math.abs(val - prevVal) > 0.1 && (
                      <span
                        className={val < prevVal ? 'text-emerald-500' : 'text-red-400'}
                        aria-label={val < prevVal ? 'Decreased from previous night' : 'Increased from previous night'}
                      >
                        {val < prevVal ? (
                          <TrendingDown className="inline h-3 w-3" aria-hidden="true" />
                        ) : (
                          <TrendingUp className="inline h-3 w-3" aria-hidden="true" />
                        )}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[9px] text-muted-foreground/60">{c.short}</div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/50">
            Individual components are scored per breath and averaged. Lower values indicate more normal patterns.
            See the Glasgow tab for the full radar chart and detailed analysis.
          </p>
        </div>
      </details>

      {/* Secondary Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <MetricCard
          label="Regularity"
          value={n.wat.regularityScore}
          unit="%"
          format="int"
          threshold={THRESHOLDS.watRegularity}
          previousValue={p?.wat.regularityScore}
          compact
          tooltip="How consistent your breath timing is throughout the night. Higher means more regular breathing rhythm."
          onClick={() => openMetric('Regularity', (x) => x.wat.regularityScore, { unit: '%', threshold: THRESHOLDS.watRegularity })}
        />
        <MetricCard
          label="Periodicity"
          value={n.wat.periodicityIndex}
          unit="%"
          format="pct"
          threshold={THRESHOLDS.watPeriodicity}
          previousValue={p?.wat.periodicityIndex}
          compact
          tooltip="Detects repeating patterns in airflow that may indicate periodic breathing or Cheyne-Stokes. Lower is better."
          onClick={() => openMetric('Periodicity', (x) => x.wat.periodicityIndex, { unit: '%', threshold: THRESHOLDS.watPeriodicity })}
        />
        <MetricCard
          label="Combined FL"
          value={n.ned.combinedFLPct}
          unit="%"
          format="int"
          threshold={THRESHOLDS.combinedFL}
          previousValue={p?.ned.combinedFLPct}
          compact
          tooltip="Combined flow limitation from both WAT and NED analysis. Percentage of breaths with restricted airflow. Lower is better."
          onClick={() => openMetric('Combined FL', (x) => x.ned.combinedFLPct, { unit: '%', threshold: THRESHOLDS.combinedFL })}
        />
        <MetricCard
          label="Est. Arousal Index"
          value={n.ned.estimatedArousalIndex}
          unit="/hr"
          threshold={THRESHOLDS.eai}
          previousValue={p?.ned.estimatedArousalIndex}
          compact
          tooltip="Estimated arousals (brief awakenings) per hour, derived from breathing pattern changes. Lower means less fragmented sleep."
          onClick={() => openMetric('Est. Arousal Index', (x) => x.ned.estimatedArousalIndex, { unit: '/hr', threshold: THRESHOLDS.eai })}
        />
      </div>
      <MetricExplanation
        text={[
          getEAIExplanation(n.ned.estimatedArousalIndex ?? 0, THRESHOLDS.eai),
          getNEDExplanation(n.ned.nedMean, n.ned.reraIndex, THRESHOLDS.nedMean),
        ].filter(Boolean).join('\n\n')}
        defaultExpanded={isNewUser}
      />

      {/* Oximetry Quick View */}
      {n.oximetry && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Oximetry Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="ODI-3"
                value={n.oximetry.odi3}
                unit="/hr"
                threshold={THRESHOLDS.odi3}
                previousValue={p?.oximetry?.odi3}
                compact
                tooltip="Oxygen Desaturation Index — number of times per hour your blood oxygen drops by 3% or more. Lower is better."
                onClick={() => openMetric('ODI-3', (x) => x.oximetry?.odi3, { unit: '/hr', threshold: THRESHOLDS.odi3 })}
              />
              <MetricCard
                label="T < 90%"
                value={n.oximetry.tBelow90}
                unit="min"
                threshold={THRESHOLDS.tBelow90}
                previousValue={p?.oximetry?.tBelow90}
                compact
                tooltip="Total minutes your blood oxygen (SpO₂) was below 90%. Less time below 90% is better."
                onClick={() => openMetric('T < 90%', (x) => x.oximetry?.tBelow90, { unit: 'min', threshold: THRESHOLDS.tBelow90 })}
              />
              <MetricCard
                label="SpO₂ Mean"
                value={n.oximetry.spo2Mean}
                unit="%"
                format="pct"
                threshold={THRESHOLDS.spo2Mean}
                previousValue={p?.oximetry?.spo2Mean}
                compact
                tooltip="Average blood oxygen saturation throughout the night. Normal is 94–98%. Higher is better."
                onClick={() => openMetric('SpO₂ Mean', (x) => x.oximetry?.spo2Mean, { unit: '%', threshold: THRESHOLDS.spo2Mean })}
              />
              <MetricCard
                label="HR Clin 10"
                value={n.oximetry.hrClin10}
                unit="/hr"
                threshold={THRESHOLDS.hrClin10}
                previousValue={p?.oximetry?.hrClin10}
                compact
                tooltip="Heart rate clinical events per hour — large heart rate swings often linked to breathing events. Lower is better."
                onClick={() => openMetric('HR Clin 10', (x) => x.oximetry?.hrClin10, { unit: '/hr', threshold: THRESHOLDS.hrClin10 })}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Oximetry Empty State */}
      {!n.oximetry && (() => {
        const clickHandler = onUploadOximetry ?? onReUpload;
        return (
          <Card
            className={`border-dashed border-border/50 ${
              clickHandler ? 'cursor-pointer transition-colors hover:border-border hover:bg-card/50' : ''
            }`}
            onClick={clickHandler}
            role={clickHandler ? 'button' : undefined}
            tabIndex={clickHandler ? 0 : undefined}
            onKeyDown={clickHandler ? (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                clickHandler();
              }
            } : undefined}
          >
            <CardContent className="flex items-center gap-3 py-6">
              <HeartPulse className="h-5 w-5 text-muted-foreground/50" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">No Oximetry Data</p>
                <p className="text-xs text-muted-foreground/70">
                  {onUploadOximetry
                    ? 'Click to upload a Viatom/Checkme O2 Max CSV for SpO\u2082 and heart rate analysis.'
                    : onReUpload
                      ? 'Click to re-upload your SD card with an oximetry CSV for SpO\u2082 and heart rate analysis.'
                      : 'Upload a Viatom/Checkme O2 Max CSV alongside your SD card for SpO\u2082 and heart rate analysis.'}
                </p>
              </div>
              {clickHandler && (
                <Upload className="ml-auto h-4 w-4 text-muted-foreground/40" />
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Share Prompts (real data only) */}
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={isDemo} />

      {/* Heatmap */}
      {nights.length > 1 && (
        <NightHeatmap nights={nights} therapyChangeDate={therapyChangeDate} />
      )}

      {/* Upgrade prompt for community users */}
      {!isPaid && (
        <UpgradePrompt feature="AI-powered therapy insights and detailed metric explanations are available to supporters." remainingCredits={serverRemainingCredits} />
      )}

      {/* Metric Detail Modal */}
      {detailMetric && (
        <MetricDetailModal
          label={detailMetric.label}
          unit={detailMetric.unit}
          nights={nights}
          selectedDate={n.dateStr}
          accessor={detailMetric.accessor}
          threshold={detailMetric.threshold}
          description={detailMetric.description}
          onClose={() => setDetailMetric(null)}
        />
      )}
    </div>
  );
}
