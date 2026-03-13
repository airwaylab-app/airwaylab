'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DevicePressureChart } from '@/components/charts/device-pressure-chart';
import { DeviceLeakChart } from '@/components/charts/device-leak-chart';
import { SyncedViewportProvider, useSyncedViewport } from '@/hooks/use-synced-viewport';
import { SharedChartToolbar } from '@/components/charts/shared-chart-toolbar';
import { useWaveform } from '@/hooks/use-waveform';
import { formatElapsedTimeShort, decimatePressureRange, getTargetRate } from '@/lib/waveform-utils';
import type { StoredWaveform } from '@/lib/waveform-types';
import type { NightResult, MachineSettings } from '@/lib/types';
import { MetricExplanation } from '@/components/common/metric-explanation';
import { Loader2, AlertCircle, Gauge, Eye, EyeOff, Info } from 'lucide-react';

interface Props {
  selectedNight: NightResult;
  isDemo: boolean;
  sdFiles: File[];
  onReUpload?: () => void;
}

export function DeviceTab({ selectedNight, isDemo, sdFiles, onReUpload }: Props) {
  const { state, cloudLoading, retry } = useWaveform(selectedNight, isDemo, sdFiles);
  const [showLeak, setShowLeak] = useState(true);
  const [showPressure, setShowPressure] = useState(true);

  // Loading states
  if (cloudLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          <p className="text-sm text-muted-foreground">Loading device data from cloud...</p>
        </CardContent>
      </Card>
    );
  }

  if (state.status === 'loading') {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Extracting device data...</p>
          <p className="text-[11px] text-muted-foreground/80">Parsing EDF files for {selectedNight.dateStr}</p>
        </CardContent>
      </Card>
    );
  }

  if (state.status === 'error') {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-red-400">{state.error}</p>
          <Button variant="outline" size="sm" onClick={retry}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  if (!state.waveform) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Gauge className="h-6 w-6 text-muted-foreground/70" />
          <p className="text-sm text-muted-foreground">No pressure or leak data available for this night.</p>
          <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground/80">
            This data comes from your ResMed SD card&apos;s BRP.edf files.
          </p>
          {onReUpload && (
            <Button variant="outline" size="sm" onClick={onReUpload} className="mt-1">Upload SD card</Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const waveform = state.waveform;
  const hasPressure = waveform.pressure !== null && waveform.pressure.length > 0;
  const hasLeak = waveform.leak.length > 0;

  if (!hasPressure && !hasLeak) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Gauge className="h-6 w-6 text-muted-foreground/70" />
          <p className="text-sm text-muted-foreground">No pressure or leak data available for this night.</p>
          <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground/80">
            This data comes from your ResMed SD card&apos;s BRP.edf files.
          </p>
        </CardContent>
      </Card>
    );
  }

  const settings = selectedNight.settings;

  return (
    <SyncedViewportProvider
      durationSeconds={waveform.durationSeconds}
      dateStr={selectedNight.dateStr}
    >
      <DeviceTabCharts
        waveform={waveform}
        settings={settings}
        showPressure={showPressure}
        showLeak={showLeak}
        hasPressure={hasPressure}
        hasLeak={hasLeak}
        onTogglePressure={() => setShowPressure(!showPressure)}
        onToggleLeak={() => setShowLeak(!showLeak)}
      />
    </SyncedViewportProvider>
  );
}

/**
 * Inner component inside SyncedViewportProvider.
 * Decimates pressure based on viewport zoom level.
 */
function DeviceTabCharts({
  waveform,
  settings,
  showPressure,
  showLeak,
  hasPressure,
  hasLeak,
  onTogglePressure,
  onToggleLeak,
}: {
  waveform: StoredWaveform;
  settings: MachineSettings;
  showPressure: boolean;
  showLeak: boolean;
  hasPressure: boolean;
  hasLeak: boolean;
  onTogglePressure: () => void;
  onToggleLeak: () => void;
}) {
  const viewport = useSyncedViewport();

  const pressureData = useMemo(() => {
    if (!waveform.pressure) return [];
    const targetRate = getTargetRate(viewport.visibleDurationSec, waveform.sampleRate);
    return decimatePressureRange(
      waveform.pressure,
      waveform.sampleRate,
      viewport.clampedStartSec,
      viewport.clampedEndSec,
      targetRate
    );
  }, [waveform.pressure, waveform.sampleRate, viewport.clampedStartSec, viewport.clampedEndSec, viewport.visibleDurationSec]);

  return (
    <div className="flex flex-col gap-4">
      {/* Shared toolbar */}
      <SharedChartToolbar durationSeconds={waveform.durationSeconds} />

      {/* Toggle controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showPressure ? 'secondary' : 'outline'}
          size="sm"
          onClick={onTogglePressure}
          disabled={!hasPressure}
          className="gap-1.5 text-xs"
        >
          {showPressure ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          Pressure
        </Button>
        <Button
          variant={showLeak ? 'secondary' : 'outline'}
          size="sm"
          onClick={onToggleLeak}
          disabled={!hasLeak}
          className="gap-1.5 text-xs"
        >
          {showLeak ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          Leak
        </Button>
      </div>

      {/* Pressure chart */}
      {showPressure && hasPressure && (
        <DevicePressureChart
          pressure={pressureData}
          settings={settings}
          deliveredP10={waveform.stats.pressureP10}
          deliveredP90={waveform.stats.pressureP90}
        />
      )}

      {/* Leak chart */}
      {showLeak && hasLeak && (
        <DeviceLeakChart
          leak={waveform.leak}
        />
      )}

      {/* Device summary card */}
      <DeviceSummaryCard waveform={waveform} settings={settings} />
    </div>
  );
}

// ── Mode-aware explanation content ──────────────────────────

function getPressureExplanation(papMode: string): string {
  const mode = papMode.toUpperCase();

  if (mode.includes('APAP') || mode.includes('AUTOSET')) {
    return 'Prescribed shows the pressure range your machine is set to work within (min to max). Delivered shows where the machine actually spent most of the night, measured from the pressure waveform.\n\nAPAP machines continuously adjust pressure in response to your breathing. The delivered values tell you the pressure your machine found effective \u2014 the lower value is where it spent 90% of the time above, and the upper value is where it spent 90% below. If your machine consistently delivers near the top of its range, it may be worth discussing a pressure increase with your clinician.';
  }
  if (mode.includes('ASV') || mode.includes('IVAPS')) {
    return 'Prescribed values are the target pressures configured on your machine. Delivered values show what the machine actually produced, measured from the pressure waveform.\n\nASV and iVAPS machines actively vary both EPAP and pressure support to stabilise your breathing. The delivered values will often differ from targets \u2014 that\u2019s the machine doing its job. What matters is the pattern: consistent delivered PS suggests stable breathing, while highly variable PS may indicate the machine is working hard to compensate for breathing instability. Discuss significant changes with your sleep physician.';
  }
  if (mode.includes('BIPAP') || mode.includes('VPAP') || mode.includes('BILEVEL')) {
    return 'Prescribed values come from your machine\u2019s settings: EPAP (expiratory pressure) and IPAP (inspiratory pressure). Delivered values are measured from the actual pressure waveform in your SD card data.\n\nBiPAP machines cycle between two pressures every breath \u2014 lower pressure when you exhale (EPAP) and higher pressure when you inhale (IPAP). Because you spend more time exhaling than inhaling (~60% vs ~40% of each breath), a simple average of pressure data would be misleadingly close to EPAP. AirwayLab uses the 10th and 90th percentiles instead, which accurately capture the two pressure levels your machine delivered.\n\nThe difference between delivered and prescribed values tells you whether your machine is hitting its targets. On fixed BiPAP (S-mode), they should be close. On auto modes, the machine adjusts breath-by-breath, so delivered values reflect what your airway actually needed.';
  }
  if (mode.includes('CPAP')) {
    return 'Prescribed is the fixed pressure set on your machine. Delivered is what the machine actually produced, measured from the pressure waveform in your SD card data.\n\nOn CPAP, these should be very close \u2014 your machine targets one constant pressure all night. Small differences (\u00b10.5 cmH\u2082O) are normal from the breathing cycle: pressure dips slightly as you inhale and rises as you exhale.';
  }

  return 'Prescribed values are from your machine\u2019s settings. Delivered values are measured from the actual pressure data recorded to your SD card. Differences between them can be normal depending on your machine\u2019s mode. Discuss any unexpected gaps with your sleep physician.';
}

// ── Device Summary Card ─────────────────────────────────────

function DeviceSummaryCard({
  waveform,
  settings,
}: {
  waveform: StoredWaveform;
  settings: MachineSettings;
}) {
  const { pressureP10, pressureP90 } = waveform.stats;
  const hasDelivered = pressureP10 !== null && pressureP90 !== null;
  const deliveredPS = hasDelivered ? +(pressureP90 - pressureP10).toFixed(1) : null;

  // Divergence detection: show note when delivered PS differs from prescribed PS by ≥1.0
  const prescribedPS = settings.pressureSupport;
  const showDivergence = hasDelivered && deliveredPS !== null && prescribedPS > 0 && Math.abs(deliveredPS - prescribedPS) >= 1.0;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Device Summary</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Mode + Duration + Leak row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">Mode</span>
            <span className="font-mono text-sm font-semibold">{settings.papMode || 'Unknown'}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
            <span className="text-xs text-muted-foreground">Duration</span>
            <span className="font-mono text-sm font-semibold tabular-nums">{formatElapsedTimeShort(waveform.durationSeconds)}</span>
          </div>
          {waveform.stats.leakMean !== null && (
            <>
              <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">Mean Leak</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{waveform.stats.leakMean} L/min</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">Max Leak</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{waveform.stats.leakMax} L/min</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">95th %ile Leak</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{waveform.stats.leakP95} L/min</span>
              </div>
            </>
          )}
        </div>

        {/* Prescribed pressures */}
        <div>
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">Prescribed</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">EPAP</span>
              <span className="font-mono text-sm font-semibold tabular-nums">{settings.epap} cmH₂O</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">IPAP</span>
              <span className="font-mono text-sm font-semibold tabular-nums">{settings.ipap} cmH₂O</span>
            </div>
            {prescribedPS > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">PS</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{prescribedPS} cmH₂O</span>
              </div>
            )}
          </div>
        </div>

        {/* Delivered pressures (only when waveform data available) */}
        {hasDelivered && (
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">Delivered</p>
              <span className="group relative">
                <Info className="h-3 w-3 cursor-help text-muted-foreground/50" />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 w-56 -translate-x-1/2 rounded-lg border border-border bg-popover p-2 text-[11px] leading-relaxed text-muted-foreground opacity-0 shadow-md transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
                  The pressure your machine actually delivered, measured from the breath-by-breath pressure waveform. Prescribed values are what was configured; delivered values are what reached your airway.
                </span>
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">EPAP</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{pressureP10!.toFixed(1)} cmH₂O</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">IPAP</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{pressureP90!.toFixed(1)} cmH₂O</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">PS</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{deliveredPS!.toFixed(1)} cmH₂O</span>
              </div>
            </div>
          </div>
        )}

        {/* Divergence note */}
        {showDivergence && (
          <div className="flex gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <p className="text-xs leading-relaxed text-amber-200/90">
              Your machine delivered {deliveredPS!.toFixed(1)} cmH₂O of pressure support, compared to the prescribed {prescribedPS} cmH₂O. This can happen when the machine adjusts pressure in response to your breathing &mdash; it&apos;s common in auto-titrating modes. If the gap is larger than expected, discuss it with your sleep physician.
            </p>
          </div>
        )}

        {/* Mode-aware explanation */}
        {hasDelivered && (
          <MetricExplanation text={getPressureExplanation(settings.papMode || '')} />
        )}
      </CardContent>
    </Card>
  );
}
