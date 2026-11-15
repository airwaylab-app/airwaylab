'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { MetricCard } from '@/components/common/metric-card';
import { MetricDetailModal } from '@/components/dashboard/metric-detail-modal';
import type { NightResult } from '@/lib/types';
import type { ThresholdDef } from '@/lib/thresholds';
import { SETTINGS_METHODOLOGIES } from '@/lib/metric-explanations';
import { useThresholds } from '@/components/common/thresholds-provider';
import { Cpu, AlertTriangle, Wind } from 'lucide-react';

interface Props {
  selectedNight: NightResult;
  previousNight: NightResult | null;
  nights?: NightResult[];
}

export function SettingsTab({ selectedNight, previousNight, nights = [] }: Props) {
  const THRESHOLDS = useThresholds();
  const sm = selectedNight.settingsMetrics;
  const psm = previousNight?.settingsMetrics;

  const [detailMetric, setDetailMetric] = useState<{
    label: string;
    unit?: string;
    accessor: (n: NightResult) => number | undefined;
    threshold?: ThresholdDef;
    description?: string;
  } | null>(null);

  const openMetric = useCallback(
    (label: string, accessor: (n: NightResult) => number | undefined, opts?: { unit?: string; threshold?: ThresholdDef; description?: string }) => {
      if (nights.length > 1) setDetailMetric({ label, accessor, ...opts });
    },
    [nights.length]
  );

  const clickable = nights.length > 1;

  // Guard: should not render if settingsMetrics is null (tab is conditionally shown)
  if (!sm) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <p className="max-w-sm text-center text-sm text-muted-foreground">
            Settings analysis requires pressure channel data from your BiPAP machine.
            If you&apos;re using a BiPAP and seeing this, your device model may not
            record pressure in BRP files.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Detected Pressures */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Detected Pressures
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">EPAP</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {sm.epapDetected} cmH&#8322;O
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">IPAP</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {sm.ipapDetected} cmH&#8322;O
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">PS</span>
            <span className="font-mono text-sm font-semibold tabular-nums">
              {sm.psDetected} cmH&#8322;O
            </span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/70">
          Detected from BRP pressure waveform. See Device tab for prescribed vs delivered comparison.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Based on {sm.breathCount.toLocaleString()} analyzed breaths
        </p>
      </div>

      {/* airbreak-plus Custom VAuto Section */}
      {(selectedNight.settings?.customVAuto?.enabled || sm.customVAutoMetrics?.active) && (
        <Card className="border-primary/30 bg-primary/[0.03] p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/50 pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Cpu className="h-4 w-4" />
              </div>
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  airbreak-plus Custom VAuto
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    Firmware Active
                  </span>
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  Patched within-breath adaptive controller, expiratory pressure relief (EPS), and fuzzy trigger/cycle.
                </p>
              </div>
            </div>
          </div>

          {/* Configured Firmware Settings */}
          {selectedNight.settings?.customVAuto && (
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-lg bg-card/60 p-2.5">
                <div className="text-[10px] text-muted-foreground">ASV Max (Boost Cap)</div>
                <div className="font-mono text-sm font-semibold">
                  +{selectedNight.settings.customVAuto.asvMax.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">cmH&#8322;O</span>
                </div>
              </div>
              <div className="rounded-lg bg-card/60 p-2.5">
                <div className="text-[10px] text-muted-foreground">ASV Sens (PID Gain)</div>
                <div className="font-mono text-sm font-semibold">
                  {selectedNight.settings.customVAuto.asvSens} <span className="text-xs font-normal text-muted-foreground">({selectedNight.settings.customVAuto.asvSensMultiplier.toFixed(2)}x)</span>
                </div>
              </div>
              <div className="rounded-lg bg-card/60 p-2.5">
                <div className="text-[10px] text-muted-foreground">EPS (Exhale Relief)</div>
                <div className="font-mono text-sm font-semibold">
                  {selectedNight.settings.customVAuto.eps !== undefined
                    ? selectedNight.settings.customVAuto.eps === 0
                      ? 'Off'
                      : `-${selectedNight.settings.customVAuto.eps.toFixed(1)}`
                    : '-1.0'}{' '}
                  {selectedNight.settings.customVAuto.eps !== 0 && (
                    <span className="text-xs font-normal text-muted-foreground">cmH&#8322;O</span>
                  )}
                </div>
              </div>
              <div className="rounded-lg bg-card/60 p-2.5">
                <div className="text-[10px] text-muted-foreground">Exh. Shape</div>
                <div className="font-mono text-sm font-semibold">
                  Level {selectedNight.settings.customVAuto.exhaleShape ?? 0}{' '}
                  <span className="text-xs font-normal text-muted-foreground">
                    (s={(selectedNight.settings.customVAuto.exhaleShapeExponent ?? -0.75).toFixed(2)})
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-card/60 p-2.5">
                <div className="text-[10px] text-muted-foreground">Custom T/C</div>
                <div className="font-mono text-sm font-semibold">
                  {selectedNight.settings.customVAuto.customTriggerCycle ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <div className="rounded-lg bg-card/60 p-2.5">
                <div className="text-[10px] text-muted-foreground">Waveform Shaping</div>
                <div className="font-mono text-sm font-semibold">
                  {selectedNight.settings.customVAuto.squareWave ? 'Square Wave' : 'Standard'}
                </div>
              </div>
            </div>
          )}

          {/* Delivered Metrics from customVAutoMetrics */}
          {sm.customVAutoMetrics && (
            <div className="mt-4 flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-lg bg-card/60 p-2.5">
                  <div className="text-[10px] text-muted-foreground">Delivered Peak PS</div>
                  <div className="font-mono text-sm font-semibold">
                    {sm.customVAutoMetrics.effectivePsP95.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">cmH&#8322;O (P95)</span>
                  </div>
                </div>
                <div className="rounded-lg bg-card/60 p-2.5">
                  <div className="text-[10px] text-muted-foreground">Breaths Boosted</div>
                  <div className="font-mono text-sm font-semibold">
                    {sm.customVAutoMetrics.boostedBreathPct.toFixed(1)}%
                  </div>
                </div>
                <div className="rounded-lg bg-card/60 p-2.5">
                  <div className="text-[10px] text-muted-foreground">Mean Exhale Relief (EPS)</div>
                  <div className="font-mono text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                    -{sm.customVAutoMetrics.epsReliefMean.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">below EPAP</span>
                  </div>
                </div>
                <div className="rounded-lg bg-card/60 p-2.5">
                  <div className="text-[10px] text-muted-foreground">Exhale Support Retention</div>
                  <div className="font-mono text-sm font-semibold">
                    {(sm.customVAutoMetrics.expiratoryRetentionPct ?? 37.5).toFixed(1)}% <span className="text-xs font-normal text-muted-foreground">AUC</span>
                  </div>
                </div>
                <div className="rounded-lg bg-card/60 p-2.5">
                  <div className="text-[10px] text-muted-foreground">Pre-Trigger Assist</div>
                  <div className="font-mono text-sm font-semibold">
                    {sm.customVAutoMetrics.preTriggerAssistPct.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Clipping alert if Max IPAP is choking the adaptive boost */}
              {sm.customVAutoMetrics.maxIpapClippedPct > 30 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div>
                    <span className="font-semibold">Max IPAP Ceiling Clipping Detected ({sm.customVAutoMetrics.maxIpapClippedPct.toFixed(1)}% of breaths): </span>
                    Your machine hit the Max IPAP ceiling of {selectedNight.settings.ipap} cmH&#8322;O during boosted inspirations, restricting the full adaptive support needed for flow limitation.
                  </div>
                </div>
              )}

              {/* Short Ti warning if breaths < 0.7s lost EPS relief */}
              {sm.customVAutoMetrics.shortTiUnder07sPct > 10 && (
                <div className="flex items-start gap-2.5 rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-800 dark:text-blue-200">
                  <Wind className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
                  <div>
                    <span className="font-semibold">Short Inspiration Notice ({sm.customVAutoMetrics.shortTiUnder07sPct.toFixed(1)}% breaths &lt; 0.7s): </span>
                    The firmware requires Ti &ge; 0.7s to activate expiratory pressure relief (EPS). Breaths terminating under 700ms did not receive negative expiratory offset. Consider adjusting Ti Min to 0.7s–0.8s.
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Trigger Response */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Trigger Response
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Trigger Delay"
            value={sm.triggerDelayMedianMs}
            format="int"
            unit="ms"
            previousValue={psm?.triggerDelayMedianMs}
            threshold={THRESHOLDS.settingsTriggerDelay}
            tooltip="Time between your breath starting and the machine responding with pressure support. Lower is better — high delays mean the machine is slow to recognise your inspiration."
            methodology={SETTINGS_METHODOLOGIES.triggerMetrics}
            onClick={clickable ? () => openMetric('Trigger Delay', (x) => x.settingsMetrics?.triggerDelayMedianMs, { unit: 'ms' }) : undefined}
          />
          <MetricCard
            label="Auto-trigger"
            value={sm.autoTriggerPct}
            format="pct"
            unit="%"
            previousValue={psm?.autoTriggerPct}
            threshold={THRESHOLDS.settingsAutoTrigger}
            tooltip="Percentage of breaths where the machine started delivering pressure before you actually started breathing. High values suggest trigger sensitivity is too high."
            methodology={SETTINGS_METHODOLOGIES.triggerMetrics}
            onClick={clickable ? () => openMetric('Auto-trigger', (x) => x.settingsMetrics?.autoTriggerPct, { unit: '%' }) : undefined}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/70">
          Range: {sm.triggerDelayP10Ms}&ndash;{sm.triggerDelayP90Ms} ms (P10&ndash;P90)
        </p>
      </div>

      {/* Cycle Timing */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Cycle Timing
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Inspiratory Time (Ti)"
            value={sm.tiMedianMs}
            format="int"
            unit="ms"
            previousValue={psm?.tiMedianMs}
            threshold={THRESHOLDS.settingsTi}
            tooltip="How long each inspiration lasts. Very short Ti may mean the machine is cycling off too early. Very long Ti may mean it's not cycling off soon enough."
            methodology={SETTINGS_METHODOLOGIES.cycleMetrics}
            onClick={clickable ? () => openMetric('Inspiratory Time (Ti)', (x) => x.settingsMetrics?.tiMedianMs, { unit: 'ms' }) : undefined}
          />
          <MetricCard
            label="Expiratory Time (Te)"
            value={sm.teMedianMs}
            format="int"
            unit="ms"
            previousValue={psm?.teMedianMs}
            tooltip="Time spent exhaling between breaths. Should be longer than Ti for comfortable breathing."
            methodology={SETTINGS_METHODOLOGIES.cycleMetrics}
            onClick={clickable ? () => openMetric('Expiratory Time (Te)', (x) => x.settingsMetrics?.teMedianMs, { unit: 'ms' }) : undefined}
          />
          <MetricCard
            label="I:E Ratio"
            value={sm.ieRatio}
            previousValue={psm?.ieRatio}
            threshold={THRESHOLDS.settingsIeRatio}
            tooltip="Ratio of expiratory to inspiratory time. Normal range is 1.2–1.5. Below 1.0 (inspiration longer than expiration) suggests respiratory distress compensation."
            methodology={SETTINGS_METHODOLOGIES.cycleMetrics}
            onClick={clickable ? () => openMetric('I:E Ratio', (x) => x.settingsMetrics?.ieRatio) : undefined}
          />
          <MetricCard
            label="Time at IPAP"
            value={sm.timeAtIpapMedianMs}
            format="int"
            unit="ms"
            previousValue={psm?.timeAtIpapMedianMs}
            threshold={THRESHOLDS.settingsTimeAtIpap}
            tooltip="How long per breath the pressure is at full IPAP level. Short dwell means the machine reaches peak pressure but cycles off before you get the full benefit."
            methodology={SETTINGS_METHODOLOGIES.cycleMetrics}
            onClick={clickable ? () => openMetric('Time at IPAP', (x) => x.settingsMetrics?.timeAtIpapMedianMs, { unit: 'ms' }) : undefined}
          />
          <MetricCard
            label="IPAP Dwell"
            value={sm.ipapDwellMedianPct}
            format="pct"
            unit="%"
            previousValue={psm?.ipapDwellMedianPct}
            threshold={THRESHOLDS.settingsIpapDwell}
            tooltip="Fraction of each inspiration spent at full pressure support. Below 35% suggests the machine is cycling off too early or rise time is too slow."
            methodology={SETTINGS_METHODOLOGIES.cycleMetrics}
            onClick={clickable ? () => openMetric('IPAP Dwell', (x) => x.settingsMetrics?.ipapDwellMedianPct, { unit: '%' }) : undefined}
          />
          <MetricCard
            label="Premature Cycle"
            value={sm.prematureCyclePct}
            format="pct"
            unit="%"
            previousValue={psm?.prematureCyclePct}
            threshold={THRESHOLDS.settingsPrematureCycle}
            tooltip="Breaths where the machine dropped pressure while you were still actively inhaling. High values mean cycle sensitivity should be decreased."
            methodology={SETTINGS_METHODOLOGIES.cycleMetrics}
            onClick={clickable ? () => openMetric('Premature Cycle', (x) => x.settingsMetrics?.prematureCyclePct, { unit: '%' }) : undefined}
          />
          <MetricCard
            label="Late Cycle"
            value={sm.lateCyclePct}
            format="pct"
            unit="%"
            previousValue={psm?.lateCyclePct}
            threshold={THRESHOLDS.settingsLateCycle}
            tooltip="Breaths where you'd already started exhaling but the machine was still delivering pressure. High values mean cycle sensitivity should be increased."
            methodology={SETTINGS_METHODOLOGIES.cycleMetrics}
            onClick={clickable ? () => openMetric('Late Cycle', (x) => x.settingsMetrics?.lateCyclePct, { unit: '%' }) : undefined}
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-muted-foreground/70">
          <span>Ti IQR: {sm.tiP25Ms}&ndash;{sm.tiP75Ms} ms</span>
          <span>Time at IPAP P25: {sm.timeAtIpapP25Ms} ms</span>
          <span>IPAP Dwell P10: {sm.ipapDwellP10Pct}%</span>
        </div>
      </div>

      {/* Ventilation */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Ventilation
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <MetricCard
            label="Tidal Volume"
            value={sm.tidalVolumeMedianMl}
            format="int"
            unit="mL"
            previousValue={psm?.tidalVolumeMedianMl}
            tooltip="Volume of air per breath (proxy — relative values are valid, absolute mL depends on flow calibration)."
            methodology={SETTINGS_METHODOLOGIES.ventilationMetrics}
            onClick={clickable ? () => openMetric('Tidal Volume', (x) => x.settingsMetrics?.tidalVolumeMedianMl, { unit: 'mL' }) : undefined}
          />
          <MetricCard
            label="Vt Variability (CV)"
            value={sm.tidalVolumeCv}
            format="pct"
            unit="%"
            previousValue={psm?.tidalVolumeCv}
            threshold={THRESHOLDS.settingsVtCv}
            tooltip="Breath-to-breath consistency of tidal volume. Higher CV means more variable ventilation, which can indicate airway instability."
            methodology={SETTINGS_METHODOLOGIES.ventilationMetrics}
            onClick={clickable ? () => openMetric('Vt Variability (CV)', (x) => x.settingsMetrics?.tidalVolumeCv, { unit: '%' }) : undefined}
          />
          <MetricCard
            label="Minute Ventilation"
            value={sm.minuteVentProxy}
            unit="L/hr"
            previousValue={psm?.minuteVentProxy}
            tooltip="Total volume of air per hour. Dropping values night-over-night may indicate hypoventilation."
            methodology={SETTINGS_METHODOLOGIES.ventilationMetrics}
            onClick={clickable ? () => openMetric('Minute Ventilation', (x) => x.settingsMetrics?.minuteVentProxy, { unit: 'L/hr' }) : undefined}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground/70">
          Vt IQR: {sm.tidalVolumeP25Ml}&ndash;{sm.tidalVolumeP75Ml} mL (P25&ndash;P75)
        </p>
      </div>

      {/* Expiratory Pressure */}
      <div>
        <h3 className="mb-3 text-sm font-medium text-muted-foreground">
          Expiratory Pressure
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <MetricCard
            label="End-Exp Pressure"
            value={sm.endExpPressureMean}
            unit="cmH₂O"
            previousValue={psm?.endExpPressureMean}
            tooltip="Average pressure in the last 200ms before each breath. Should be close to your prescribed EPAP."
            methodology={SETTINGS_METHODOLOGIES.endExpPressure}
            onClick={clickable ? () => openMetric('End-Exp Pressure', (x) => x.settingsMetrics?.endExpPressureMean, { unit: 'cmH₂O' }) : undefined}
          />
          <MetricCard
            label="Pressure Stability (SD)"
            value={sm.endExpPressureSd}
            unit="cmH₂O"
            previousValue={psm?.endExpPressureSd}
            tooltip="How much the end-expiratory pressure varies breath-to-breath. High SD may indicate leak or machine issues."
            methodology={SETTINGS_METHODOLOGIES.endExpPressure}
            onClick={clickable ? () => openMetric('Pressure Stability (SD)', (x) => x.settingsMetrics?.endExpPressureSd, { unit: 'cmH₂O' }) : undefined}
          />
        </div>
      </div>

      {/* Explanatory card + disclaimer */}
      <Card className="border-border/50 bg-card/30">
        <CardContent className="py-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            These metrics show how your BiPAP machine responds to your breathing, breath by breath.
            Trigger metrics measure how quickly the machine detects your inspiration.
            Cycle metrics measure whether it stays at full pressure long enough.
            Ventilation metrics track the volume of air you receive.
            Together, they give your clinician a detailed picture of how the machine
            is responding to your breathing patterns over time.
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground/70">
            These metrics are informational. Your clinician can interpret them in the context of your overall therapy.
          </p>
        </CardContent>
      </Card>

      {/* Metric Detail Modal */}
      {detailMetric && (
        <MetricDetailModal
          label={detailMetric.label}
          unit={detailMetric.unit}
          nights={nights}
          selectedDate={selectedNight.dateStr}
          accessor={detailMetric.accessor}
          threshold={detailMetric.threshold}
          description={detailMetric.description}
          onClose={() => setDetailMetric(null)}
        />
      )}
    </div>
  );
}
