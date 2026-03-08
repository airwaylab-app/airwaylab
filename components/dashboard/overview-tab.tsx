'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/common/metric-card';
import { NightHeatmap } from '@/components/charts/night-heatmap';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';
import { generateInsights, type Insight } from '@/lib/insights';
import { fetchAIInsights } from '@/lib/ai-insights-client';
import { Badge } from '@/components/ui/badge';
import { HeartPulse, TrendingDown, TrendingUp, AlertCircle, Info, CheckCircle, ChevronRight, Upload, Sparkles, Loader2 } from 'lucide-react';
import { ProTease } from '@/components/common/pro-tease';
import { AIKeyInput } from '@/components/common/ai-key-input';
import { SharePrompts } from '@/components/dashboard/share-prompts';
import type { GlasgowComponents } from '@/lib/types';

const AI_INSIGHTS_URL = process.env.NEXT_PUBLIC_AI_INSIGHTS_URL;

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
  isDemo?: boolean;
}

export function OverviewTab({ nights, selectedNight, previousNight, therapyChangeDate, onUploadOximetry, isDemo = false }: Props) {
  const THRESHOLDS = useThresholds();
  const n = selectedNight;
  const p = previousNight;
  const insights = generateInsights(nights, n, p, therapyChangeDate);

  const [aiInsights, setAiInsights] = useState<Insight[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiKey, setAiKey] = useState<string | null>(null);

  // Check for stored AI key on mount
  useEffect(() => {
    if (AI_INSIGHTS_URL) {
      const stored = localStorage.getItem('airwaylab_ai_key');
      if (stored) setAiKey(stored);
    }
  }, []);

  // Fetch AI insights when key is available and night changes
  const fetchAI = useCallback(async () => {
    if (!AI_INSIGHTS_URL || !aiKey) return;
    setAiLoading(true);
    try {
      const selectedIdx = nights.indexOf(selectedNight);
      const result = await fetchAIInsights(
        nights,
        selectedIdx >= 0 ? selectedIdx : 0,
        therapyChangeDate,
        aiKey
      );
      setAiInsights(result);
    } catch {
      setAiInsights(null);
    } finally {
      setAiLoading(false);
    }
  }, [aiKey, nights, selectedNight, therapyChangeDate]);

  useEffect(() => {
    fetchAI();
  }, [fetchAI]);

  const handleAIKeyActivate = (key: string) => {
    setAiKey(key);
  };

  const hasAIAccess = !!AI_INSIGHTS_URL;
  const hasAIKey = !!aiKey;

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
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Key Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
        <MetricCard
          label="Glasgow Index"
          value={n.glasgow.overall}
          threshold={THRESHOLDS.glasgowOverall}
          previousValue={p?.glasgow.overall}
        />
        <MetricCard
          label="FL Score"
          value={n.wat.flScore}
          unit="%"
          format="pct"
          threshold={THRESHOLDS.watFL}
          previousValue={p?.wat.flScore}
        />
        <MetricCard
          label="NED Mean"
          value={n.ned.nedMean}
          unit="%"
          format="pct"
          threshold={THRESHOLDS.nedMean}
          previousValue={p?.ned.nedMean}
        />
        <MetricCard
          label="RERA Index"
          value={n.ned.reraIndex}
          unit="/hr"
          threshold={THRESHOLDS.reraIndex}
          previousValue={p?.ned.reraIndex}
        />
      </div>

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
        />
        <MetricCard
          label="Periodicity"
          value={n.wat.periodicityIndex}
          unit="%"
          format="pct"
          threshold={THRESHOLDS.watPeriodicity}
          previousValue={p?.wat.periodicityIndex}
          compact
        />
        <MetricCard
          label="Combined FL"
          value={n.ned.combinedFLPct}
          unit="%"
          format="int"
          threshold={THRESHOLDS.combinedFL}
          previousValue={p?.ned.combinedFLPct}
          compact
        />
        <MetricCard
          label="Est. Arousal Index"
          value={n.ned.estimatedArousalIndex}
          unit="/hr"
          threshold={THRESHOLDS.eai}
          previousValue={p?.ned.estimatedArousalIndex}
          compact
        />
      </div>

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
              />
              <MetricCard
                label="T < 90%"
                value={n.oximetry.tBelow90}
                unit="min"
                threshold={THRESHOLDS.tBelow90}
                previousValue={p?.oximetry?.tBelow90}
                compact
              />
              <MetricCard
                label="SpO₂ Mean"
                value={n.oximetry.spo2Mean}
                unit="%"
                format="pct"
                threshold={THRESHOLDS.spo2Mean}
                previousValue={p?.oximetry?.spo2Mean}
                compact
              />
              <MetricCard
                label="HR Clin 10"
                value={n.oximetry.hrClin10}
                unit="/hr"
                threshold={THRESHOLDS.hrClin10}
                previousValue={p?.oximetry?.hrClin10}
                compact
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Oximetry Empty State */}
      {!n.oximetry && (
        <Card
          className={`border-dashed border-border/50 ${
            onUploadOximetry ? 'cursor-pointer transition-colors hover:border-border hover:bg-card/50' : ''
          }`}
          onClick={onUploadOximetry}
          role={onUploadOximetry ? 'button' : undefined}
          tabIndex={onUploadOximetry ? 0 : undefined}
          onKeyDown={onUploadOximetry ? (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onUploadOximetry();
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
                  : 'Upload a Viatom/Checkme O2 Max CSV alongside your SD card for SpO\u2082 and heart rate analysis.'}
              </p>
            </div>
            {onUploadOximetry && (
              <Upload className="ml-auto h-4 w-4 text-muted-foreground/40" />
            )}
          </CardContent>
        </Card>
      )}

      {/* Share Prompts (real data only) */}
      <SharePrompts nights={nights} selectedNight={selectedNight} isDemo={isDemo} />

      {/* Heatmap */}
      {nights.length > 1 && (
        <NightHeatmap nights={nights} therapyChangeDate={therapyChangeDate} />
      )}

      {/* AI Key Input or Pro Tease */}
      {hasAIAccess && !hasAIKey ? (
        <AIKeyInput onActivate={handleAIKeyActivate} />
      ) : (
        !hasAIAccess && (
          <ProTease
            feature="AI-powered therapy recommendations personalised to your breathing patterns."
            source="overview-tab"
          />
        )
      )}
    </div>
  );
}
