'use client';

import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MetricCard } from '@/components/common/metric-card';
import { NightHeatmap } from '@/components/charts/night-heatmap';
import { useThresholds } from '@/components/common/thresholds-provider';
import type { NightResult } from '@/lib/types';
import { generateInsights } from '@/lib/insights';
import { NightSummaryHero } from '@/components/dashboard/night-summary-hero';
import { AIInsightsGate } from '@/components/dashboard/ai-insights-gate';
import { HeartPulse, TrendingDown, TrendingUp, ChevronRight, Upload, Info, Settings2, Share2, ShieldCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { UpgradePrompt } from '@/components/auth/upgrade-prompt';
import { useAuth } from '@/lib/auth/auth-context';
import { SharePrompts } from '@/components/dashboard/share-prompts';
import { MetricDetailModal } from '@/components/dashboard/metric-detail-modal';
import { NextSteps } from '@/components/dashboard/next-steps';
import { MetricExplanation } from '@/components/common/metric-explanation';
import { loadNightNotes } from '@/lib/night-notes';
import { SymptomRating } from '@/components/dashboard/symptom-rating';
import { NightContextEditor } from '@/components/dashboard/night-context-editor';
import type { NightNotes } from '@/lib/types';
import { EMPTY_NOTES } from '@/lib/night-notes';
import { CommunityComparison } from '@/components/dashboard/community-comparison';
import { CommunityBenchmarks } from '@/components/dashboard/community-benchmarks';
import { ClinicianQuestionsPanel } from '@/components/dashboard/clinician-questions-panel';
import { getConsentState } from '@/components/upload/contribution-consent-utils';
import { getGlasgowExplanation, getEAIExplanation, getNEDExplanation, getIFLRiskExplanation, METRIC_METHODOLOGIES } from '@/lib/metric-explanations';
import { computeIFLRisk, getIFLContextNote } from '@/lib/ifl-risk';
import type { GlasgowComponents } from '@/lib/types';
import { getTrafficLight, type ThresholdDef } from '@/lib/thresholds';
import { fmtHrs } from '@/lib/format-utils';

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

interface Props {
  nights: NightResult[];
  selectedNight: NightResult;
  previousNight: NightResult | null;
  therapyChangeDate: string | null;
  onUploadOximetry?: () => void;
  onReUpload?: () => void;
  onOpenAuth?: () => void;
  isDemo?: boolean;
  isNewUser?: boolean;
}

export function OverviewTab({ nights, selectedNight, previousNight, therapyChangeDate, onUploadOximetry, onReUpload, onOpenAuth, isDemo = false, isNewUser = false }: Props) {
  const THRESHOLDS = useThresholds();
  const n = selectedNight;
  const p = previousNight;

  const [symptomRating, setSymptomRating] = useState<number | null>(null);
  const [nightNotes, setNightNotes] = useState<NightNotes>({ ...EMPTY_NOTES });
  // Initialize to false to match SSR (localStorage is unavailable during
  // server rendering). Actual consent state is loaded in the useEffect below.
  const [isContributeConsented, setIsContributeConsented] = useState(false);

  // Load symptom rating, night notes, and consent state after mount (and when night changes)
  useEffect(() => {
    const notes = loadNightNotes(n.dateStr);
    setSymptomRating(notes.symptomRating);
    setNightNotes(notes);
    setIsContributeConsented(getConsentState());
  }, [n.dateStr]);

  // Keep symptomRating + nightNotes in sync when symptom rating changes
  const handleSymptomRatingChange = useCallback((rating: number | null) => {
    setSymptomRating(rating);
    setNightNotes((prev) => ({ ...prev, symptomRating: rating }));
  }, []);

  // Keep symptomRating + nightNotes in sync when context fields change
  const handleNotesChange = useCallback((updated: NightNotes) => {
    setNightNotes(updated);
    setSymptomRating(updated.symptomRating);
  }, []);

  const insights = generateInsights(nights, n, p, therapyChangeDate, symptomRating);

  const { isPaid } = useAuth();

  const [shareOpen, setShareOpen] = useState(false);

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
    <div className="flex flex-col gap-4">
      {/* Night Summary Hero — single glanceable takeaway */}
      <div data-walkthrough="summary-hero">
        <NightSummaryHero night={n} />
      </div>

      {/* Treatment Success Banner — contextualises metrics based on RERA control */}
      {(() => {
        const reraLight = getTrafficLight(n.ned.reraIndex, THRESHOLDS.reraIndex!);
        if (reraLight === 'good') {
          return (
            <div className="flex items-start gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.05] px-4 py-3">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500/70" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your therapy is controlling respiratory events effectively. The metrics below show areas where further optimisation may improve sleep quality.
              </p>
            </div>
          );
        }
        if (reraLight === 'warn') {
          return (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/70" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Your respiratory event index suggests room for therapy adjustment. Discuss these findings with your clinician.
              </p>
            </div>
          );
        }
        return (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-500/20 bg-red-500/[0.05] px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500/70" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your respiratory disruption index is elevated. These findings are worth discussing with your clinician.
            </p>
          </div>
        );
      })()}

      {/* Symptom Rating — how did you sleep? */}
      <SymptomRating
        night={n}
        value={symptomRating}
        onChange={handleSymptomRatingChange}
        isContributeConsented={isContributeConsented}
      />

      {/* Night Context — structured enum fields (caffeine, position, stress, etc.) */}
      <NightContextEditor
        night={n}
        notes={nightNotes}
        onNotesChange={handleNotesChange}
      />

      {/* Start-here guidance for new users — positioned right below hero */}
      {isNewUser && (
        <div className="flex items-start gap-2.5 rounded-lg border border-primary/10 bg-primary/[0.03] px-4 py-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Start with IFL Symptom Risk</span> — it combines multiple flow limitation metrics into a single signal.
            Green means low risk, amber means worth monitoring,
            red means discuss with your clinician. Click any metric for a detailed trend view.
          </p>
        </div>
      )}

      {/* Device Settings & Session Info (collapsed by default) */}
      <details className="group rounded-xl border border-border/50 bg-card/30">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          <Settings2 className="h-4 w-4" />
          Device Settings
          <span className="ml-auto text-xs font-normal tabular-nums">
            {fmtHrs(n.durationHours)} · {n.sessionCount} session{n.sessionCount !== 1 ? 's' : ''}
          </span>
        </summary>
        <div className="border-t border-border/30 px-4 pb-4 pt-3">
          {n.settings.settingsSource === 'unavailable' ? (
            <p className="text-xs leading-relaxed text-muted-foreground">
              Your device settings couldn&apos;t be read from the SD card. This usually means the device type isn&apos;t supported yet, or the settings file (STR.edf) wasn&apos;t included in the upload. Analysis of your breathing data is unaffected.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {n.settings.deviceModel && (
                <div className="col-span-2 sm:col-span-4">
                  <span className="text-[10px] text-muted-foreground">Device</span>
                  <p className="text-xs font-medium">{n.settings.deviceModel}</p>
                </div>
              )}
              <div>
                <span className="text-[10px] text-muted-foreground">Mode</span>
                <p className="text-xs font-medium">{n.settings.papMode}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">EPAP</span>
                <p className="font-mono text-xs font-medium tabular-nums">{n.settings.epap || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">IPAP</span>
                <p className="font-mono text-xs font-medium tabular-nums">{n.settings.ipap || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">PS</span>
                <p className="font-mono text-xs font-medium tabular-nums">{n.settings.pressureSupport || '—'}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Rise Time</span>
                <p className="font-mono text-xs font-medium tabular-nums">{n.settings.riseTime !== null ? n.settings.riseTime : '—'}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Trigger</span>
                <p className="text-xs font-medium">{n.settings.trigger}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">Cycle</span>
                <p className="text-xs font-medium">{n.settings.cycle}</p>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground">EasyBreathe</span>
                <p className="text-xs font-medium">{n.settings.easyBreathe ? 'On' : 'Off'}</p>
              </div>
            </div>
          )}
        </div>
      </details>

      {/* IFL Symptom Risk + Key Metrics Grid */}
      <div data-walkthrough="metrics-grid" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 stagger-children">
        <MetricCard
          label="IFL Symptom Risk"
          value={computeIFLRisk(n)}
          unit="%"
          format="pct"
          threshold={THRESHOLDS.iflRisk}
          previousValue={p ? computeIFLRisk(p) : undefined}
          tooltip="Combines FL Score, NED, Flatness Index, and Glasgow Index to estimate how much flow limitation may be driving symptoms. Higher values suggest greater symptom risk from flow limitation."
          contextHint={getTrafficLight(computeIFLRisk(n), THRESHOLDS.iflRisk!) === 'bad' ? 'Room to optimise' : getTrafficLight(computeIFLRisk(n), THRESHOLDS.iflRisk!) === 'warn' ? 'May benefit from optimisation' : undefined}
          onClick={() => openMetric('IFL Symptom Risk', (x) => computeIFLRisk(x), { unit: '%', threshold: THRESHOLDS.iflRisk, description: 'Composite flow limitation symptom risk across all nights' })}
        />
        <MetricCard
          label="Glasgow Index"
          value={n.glasgow.overall}
          threshold={THRESHOLDS.glasgowOverall}
          previousValue={p?.glasgow.overall}
          tooltip="A composite score measuring how abnormal your breathing waveform looks. Lower is better. Based on 9 breath shape components."
          methodology={METRIC_METHODOLOGIES.glasgowIndex}
          contextHint={getTrafficLight(n.glasgow.overall, THRESHOLDS.glasgowOverall!) === 'bad' ? 'Room to optimise' : getTrafficLight(n.glasgow.overall, THRESHOLDS.glasgowOverall!) === 'warn' ? 'May benefit from optimisation' : undefined}
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
          methodology={METRIC_METHODOLOGIES.flScore}
          contextHint={getTrafficLight(n.wat.flScore, THRESHOLDS.watFL!) === 'bad' ? 'Room to optimise' : getTrafficLight(n.wat.flScore, THRESHOLDS.watFL!) === 'warn' ? 'May benefit from optimisation' : undefined}
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
          methodology={METRIC_METHODOLOGIES.nedMean}
          contextHint={getTrafficLight(n.ned.nedMean, THRESHOLDS.nedMean!) === 'bad' ? 'Room to optimise' : getTrafficLight(n.ned.nedMean, THRESHOLDS.nedMean!) === 'warn' ? 'May benefit from optimisation' : undefined}
          onClick={() => openMetric('NED Mean', (x) => x.ned.nedMean, { unit: '%', threshold: THRESHOLDS.nedMean, description: 'Average wasted breathing effort due to obstruction' })}
        />
        <MetricCard
          label="RERA Index"
          value={n.ned.reraIndex}
          unit="/hr"
          threshold={THRESHOLDS.reraIndex}
          previousValue={p?.ned.reraIndex}
          tooltip="Respiratory Effort-Related Arousals per hour. These are brief awakenings caused by breathing effort. Lower is better."
          methodology={METRIC_METHODOLOGIES.reraIndex}
          contextHint={getTrafficLight(n.ned.reraIndex, THRESHOLDS.reraIndex!) === 'bad' ? 'Discuss with clinician' : undefined}
          onClick={() => openMetric('RERA Index', (x) => x.ned.reraIndex, { unit: '/hr', threshold: THRESHOLDS.reraIndex, description: 'Respiratory effort-related arousals per hour' })}
        />
      </div>

      <MetricExplanation
        text={getIFLRiskExplanation(computeIFLRisk(n), THRESHOLDS.iflRisk!)}
        defaultExpanded={isNewUser}
      />

      {/* Understanding Your Results — collapsible guide to interpreting metrics */}
      <details className="group rounded-xl border border-border/50 bg-card/30">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          Understanding Your Results
        </summary>
        <div className="border-t border-border/30 px-4 pb-4 pt-3 space-y-2.5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Green, amber, and red indicators show where each metric falls relative to research-based thresholds.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Flow limitation metrics (Glasgow Index, FL Score, NED) measure a different dimension than event-based metrics like RERA. Red flow limitation scores mean room to optimise, not that treatment is failing.
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Always discuss findings with your clinician before making therapy changes.
          </p>
          <Link
            href="/glossary"
            className="inline-block text-xs text-primary/70 underline underline-offset-2 hover:text-primary"
          >
            Read the full glossary for detailed metric definitions
          </Link>
        </div>
      </details>

      {/* Community Benchmarks — ungated, shows metric position bars */}
      <CommunityBenchmarks night={n} isDemo={isDemo} />

      {/* IFL Risk Breakdown (Collapsible) */}
      <details className="group rounded-xl border border-border/50 bg-card/30">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          IFL Symptom Risk — Breakdown
          <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
            {computeIFLRisk(n).toFixed(1)}%
          </span>
        </summary>
        <div className="border-t border-border/30 px-4 pb-4 pt-3">
          <p className="mb-3 text-xs text-muted-foreground">
            This composite metric weights four flow limitation measurements to give a single directional signal.
            It is based on research suggesting flow limitation itself drives symptoms via a stress response, independent of arousals.
          </p>
          {(() => {
            const flNorm = n.wat.flScore;
            const nedNorm = n.ned.nedMean;
            const fiNorm = (1 - n.ned.fiMean) * 100;
            const glNorm = (n.glasgow.overall / 9) * 100;
            const components = [
              { label: 'FL Score', value: n.wat.flScore, unit: '%', norm: flNorm, weight: 0.35, contribution: flNorm * 0.35, dp: 1 },
              { label: 'NED Mean', value: n.ned.nedMean, unit: '%', norm: nedNorm, weight: 0.30, contribution: nedNorm * 0.30, dp: 1 },
              { label: 'Flatness Index', value: n.ned.fiMean, unit: '', norm: fiNorm, weight: 0.20, contribution: fiNorm * 0.20, dp: 1 },
              { label: 'Glasgow Index', value: n.glasgow.overall, unit: '/9', norm: glNorm, weight: 0.15, contribution: glNorm * 0.15, dp: 2 },
            ];
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/30 text-muted-foreground/70">
                      <th className="pb-2 text-left font-medium">Metric</th>
                      <th className="pb-2 text-right font-medium">Value</th>
                      <th className="pb-2 text-right font-medium">Normalised</th>
                      <th className="pb-2 text-right font-medium">Weight</th>
                      <th className="pb-2 text-right font-medium">Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map((c) => (
                      <tr key={c.label} className="border-b border-border/20">
                        <td className="py-1.5 text-muted-foreground">{c.label}</td>
                        <td className="py-1.5 text-right font-mono tabular-nums">{c.value.toFixed(c.dp)}{c.unit}</td>
                        <td className="py-1.5 text-right font-mono tabular-nums">{c.norm.toFixed(1)}</td>
                        <td className="py-1.5 text-right font-mono tabular-nums text-muted-foreground/70">{(c.weight * 100).toFixed(0)}%</td>
                        <td className="py-1.5 text-right font-mono tabular-nums font-medium">{c.contribution.toFixed(1)}</td>
                      </tr>
                    ))}
                    <tr className="font-medium">
                      <td className="pt-2" colSpan={4}>Total</td>
                      <td className="pt-2 text-right font-mono tabular-nums">{computeIFLRisk(n).toFixed(1)}%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
          {(() => {
            const risk = computeIFLRisk(n);
            const eai = n.ned.estimatedArousalIndex ?? 0;
            const note = getIFLContextNote(risk, eai);
            if (!note) return null;
            return (
              <div className="mt-3 rounded-lg border border-primary/10 bg-primary/[0.03] px-3 py-2">
                <p className="text-xs text-muted-foreground">{note}</p>
              </div>
            );
          })()}
          <Link
            href="/blog/flow-limitation-and-sleepiness"
            className="mt-3 inline-block text-xs text-primary/70 underline underline-offset-2 hover:text-primary"
          >
            Read: Does Flow Limitation Drive Sleepiness?
          </Link>
        </div>
      </details>

      <MetricExplanation
        text={getGlasgowExplanation(n.glasgow.overall, THRESHOLDS.glasgowOverall!)}
        defaultExpanded={false}
      />

      {/* AI Insights Gate — handles anon teasers, generate button, deep insights */}
      <AIInsightsGate
        nights={nights}
        selectedNight={n}
        previousNight={p}
        therapyChangeDate={therapyChangeDate}
        ruleBasedInsights={insights}
        isDemo={isDemo}
        isNewUser={isNewUser}
        onOpenAuth={onOpenAuth}
      />

      {/* Community Comparison — shows how your results compare */}
      <CommunityComparison
        night={n}
        symptomRating={symptomRating}
        isContributeConsented={isContributeConsented}
      />

      {/* Clinician Questions — appointment prep */}
      <ClinicianQuestionsPanel
        nights={nights}
        selectedNight={n}
        previousNight={p}
        therapyChangeDate={therapyChangeDate}
      />

      {/* Glasgow Component Breakdown (Collapsible) */}
      <details className="group rounded-xl border border-border/50 bg-card/30">
        <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          Glasgow Component Breakdown
          <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
            Overall: {n.glasgow.overall.toFixed(2)}
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
                      {val.toFixed(2)}
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
                  <div className="mt-0.5 text-[9px] text-muted-foreground/80">{c.short}</div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground/70">
            Individual components are scored per breath and averaged. Lower values indicate more normal patterns.
            See the Glasgow tab for the full radar chart and detailed analysis.
          </p>
        </div>
      </details>

      {/* Next Steps CTA */}
      <NextSteps
        selectedNight={n}
        hasOximetry={!!n.oximetry}
        nightCount={nights.length}
        onUploadOximetry={onUploadOximetry}
        onReUpload={onReUpload}
      />

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
          methodology={METRIC_METHODOLOGIES.regularity}
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
          methodology={METRIC_METHODOLOGIES.periodicity}
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
          methodology={METRIC_METHODOLOGIES.combinedFL}
          onClick={() => openMetric('Combined FL', (x) => x.ned.combinedFLPct, { unit: '%', threshold: THRESHOLDS.combinedFL })}
        />
        <MetricCard
          label="Resp. Disruption Index"
          value={n.ned.estimatedArousalIndex}
          unit="/hr"
          threshold={THRESHOLDS.eai}
          previousValue={p?.ned.estimatedArousalIndex}
          compact
          tooltip="Respiratory disruptions per hour — recovery breaths following flow-limited breathing. This flow-based estimate typically reads higher than in-lab arousal index. Lower is better."
          methodology={METRIC_METHODOLOGIES.eai}
          contextHint={getTrafficLight(n.ned.estimatedArousalIndex, THRESHOLDS.eai!) === 'bad' ? 'Discuss with clinician' : undefined}
          onClick={() => openMetric('Resp. Disruption Index', (x) => x.ned.estimatedArousalIndex, { unit: '/hr', threshold: THRESHOLDS.eai })}
        />
      </div>
      <MetricExplanation
        text={[
          getEAIExplanation(n.ned.estimatedArousalIndex ?? 0, THRESHOLDS.eai!),
          getNEDExplanation(n.ned.nedMean, n.ned.reraIndex, THRESHOLDS.nedMean!),
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
                methodology={METRIC_METHODOLOGIES.odi3}
                contextHint={getTrafficLight(n.oximetry.odi3, THRESHOLDS.odi3!) === 'bad' ? 'Discuss with clinician' : undefined}
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
              <HeartPulse className="h-5 w-5 text-muted-foreground/70" />
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
                <Upload className="ml-auto h-4 w-4 text-muted-foreground/80" />
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Share button + modal (real data only, hidden for new users to reduce density) */}
      {!isNewUser && !isDemo && (
        <>
          <button
            onClick={() => setShareOpen(true)}
            className="flex w-full items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground"
          >
            <Share2 className="h-4 w-4" />
            Share your analysis
          </button>
          <SharePrompts
            nights={nights}
            selectedNight={selectedNight}
            open={shareOpen}
            onClose={() => setShareOpen(false)}
          />
        </>
      )}

      {/* Heatmap (hidden for new users to reduce density) */}
      {nights.length > 1 && !isNewUser && (
        <NightHeatmap nights={nights} therapyChangeDate={therapyChangeDate} />
      )}

      {/* Upgrade prompt for community users — contextual to their data */}
      {!isPaid && (() => {
        const ifl = computeIFLRisk(n);
        const iflTier = getTrafficLight(ifl, THRESHOLDS.iflRisk!);
        const msg = iflTier === 'good'
          ? 'Your therapy looks effective. Supporters get deeper analysis to understand exactly why -- and what to watch for over time.'
          : 'Your flow limitation patterns suggest room for therapy optimisation. Get AI-powered analysis of what your breathing data means for your settings.';
        return <UpgradePrompt feature={msg} />;
      })()}

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
