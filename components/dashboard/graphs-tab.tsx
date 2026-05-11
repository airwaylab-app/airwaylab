'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendChart } from '@/components/charts/trend-chart';
import { GlasgowRadar } from '@/components/charts/glasgow-radar';
import { FlowWaveform, type EventType } from '@/components/charts/flow-waveform';
import { DevicePressureChart } from '@/components/charts/device-pressure-chart';
import { DeviceLeakChart } from '@/components/charts/device-leak-chart';
import { SpO2Trace } from '@/components/charts/spo2-trace';
import { TidalVolumeChart } from '@/components/charts/tidal-volume-chart';
import { RespiratoryRateChart } from '@/components/charts/respiratory-rate-chart';
import { SharedChartToolbar } from '@/components/charts/shared-chart-toolbar';
import { ChartInteractionHint } from '@/components/charts/chart-interaction-hint';
import { SyncedViewportProvider, useSyncedViewport } from '@/hooks/use-synced-viewport';
import { useWaveform } from '@/hooks/use-waveform';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { MachineSettingsBar } from '@/components/common/machine-settings-bar';
import { formatElapsedTimeShort, decimateFlowRange, decimatePressureRange, getTargetRate } from '@/lib/waveform-utils';
import type { StoredWaveform } from '@/lib/waveform-types';
import type { NightResult } from '@/lib/types';
import {
  Loader2,
  AlertCircle,
  Waves,
  HeartPulse,


  Cloud,
} from 'lucide-react';

interface Props {
  selectedNight: NightResult;
  nights: NightResult[];
  therapyChangeDate: string | null;
  isDemo: boolean;
  sdFiles: File[];
  onReUpload?: () => void;
  onUploadOximetry?: () => void;
}

const MACHINE_EVENT_DEFS: { type: EventType; label: string; color: string }[] = [
  { type: 'obstructive-apnea', label: 'OA', color: 'hsl(0 70% 50%)' },
  { type: 'central-apnea', label: 'CA', color: 'hsl(180 60% 45%)' },
  { type: 'hypopnea', label: 'H', color: 'hsl(220 70% 55%)' },
  { type: 'unclassified-apnea', label: 'UA', color: 'hsl(45 80% 50%)' },
];

const ALGORITHM_EVENT_DEFS: { type: EventType; label: string; color: string }[] = [
  { type: 'rera', label: 'RERA', color: 'hsl(262 83% 58%)' },
  { type: 'flow-limitation', label: 'FL', color: 'hsl(38 92% 50%)' },
  { type: 'm-shape', label: 'M', color: 'hsl(0 84% 60%)' },
];

const ALL_EVENT_TYPES: EventType[] = [
  ...MACHINE_EVENT_DEFS.map((d) => d.type),
  ...ALGORITHM_EVENT_DEFS.map((d) => d.type),
];

/**
 * Inner component that lives inside SyncedViewportProvider.
 * Handles on-the-fly decimation based on viewport zoom level.
 */
function WaveformCharts({
  storedWaveform,
  selectedNight,

  visibleTypes,
  showODIEvents,
  showHR,
  onUploadOximetry,
  isFromCloud,
}: {
  storedWaveform: StoredWaveform;
  selectedNight: NightResult;
  visibleTypes: Set<EventType>;
  showODIEvents: boolean;
  showHR: boolean;
  onUploadOximetry?: () => void;
  isFromCloud: boolean;
}) {
  const viewport = useSyncedViewport();
  const oxTrace = selectedNight.oximetryTrace ?? null;

  // Decimate flow data based on viewport zoom level
  const flowData = useMemo(() => {
    const targetRate = getTargetRate(viewport.visibleDurationSec, storedWaveform.sampleRate);
    return decimateFlowRange(
      storedWaveform.flow,
      storedWaveform.sampleRate,
      viewport.clampedStartSec,
      viewport.clampedEndSec,
      targetRate
    );
  }, [storedWaveform.flow, storedWaveform.sampleRate, viewport.clampedStartSec, viewport.clampedEndSec, viewport.visibleDurationSec]);

  // Decimate pressure data based on viewport zoom level
  const pressureData = useMemo(() => {
    if (!storedWaveform.pressure) return [];
    const targetRate = getTargetRate(viewport.visibleDurationSec, storedWaveform.sampleRate);
    return decimatePressureRange(
      storedWaveform.pressure,
      storedWaveform.sampleRate,
      viewport.clampedStartSec,
      viewport.clampedEndSec,
      targetRate
    );
  }, [storedWaveform.pressure, storedWaveform.sampleRate, viewport.clampedStartSec, viewport.clampedEndSec, viewport.visibleDurationSec]);

  const hasPressure = storedWaveform.pressure !== null && storedWaveform.pressure.length > 0;
  const hasLeak = storedWaveform.leak.length > 0;
  const hasTidalVolume = storedWaveform.tidalVolume.length > 0;
  const hasRespRate = storedWaveform.respiratoryRate.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {/* Cloud badge */}
      {isFromCloud && (
        <div className="flex items-center gap-2 text-xs text-sky-400">
          <Cloud className="h-3.5 w-3.5" />
          <span>Loaded from cloud storage</span>
        </div>
      )}

      {/* Shared toolbar + minimap */}
      <SharedChartToolbar durationSeconds={storedWaveform.durationSeconds} />

      {/* First-use interaction hint */}
      <ChartInteractionHint />

      {/* Stacked charts */}
      <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-card/20 p-3">
        {/* Flow Waveform */}
        <ErrorBoundary context="Flow Waveform">
          <FlowWaveform
            flow={flowData}
            pressure={pressureData}
            events={storedWaveform.events}
            visibleEventTypes={visibleTypes}
          />
        </ErrorBoundary>

        {/* Tidal Volume */}
        {hasTidalVolume ? (
          <ErrorBoundary context="Tidal Volume">
            <TidalVolumeChart tidalVolume={storedWaveform.tidalVolume} />
          </ErrorBoundary>
        ) : (
          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/80">
            Requires flow data — upload your SD card.
          </div>
        )}

        {/* Respiratory Rate */}
        {hasRespRate ? (
          <ErrorBoundary context="Respiratory Rate">
            <RespiratoryRateChart respiratoryRate={storedWaveform.respiratoryRate} />
          </ErrorBoundary>
        ) : (
          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/80">
            Requires flow data — upload your SD card.
          </div>
        )}

        {/* Pressure (from pre-computed buckets, same as TV/RR) */}
        {hasPressure ? (
          <ErrorBoundary context="Pressure">
            <DevicePressureChart
              pressure={pressureData}
              settings={selectedNight.settings}
            />
          </ErrorBoundary>
        ) : (
          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/80">
            No pressure data in this recording.
          </div>
        )}

        {/* Leak */}
        {hasLeak ? (
          <ErrorBoundary context="Leak">
            <DeviceLeakChart leak={storedWaveform.leak} />
          </ErrorBoundary>
        ) : (
          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/80">
            No leak data in this recording.
          </div>
        )}

        {/* SpO2 — always visible */}
        {oxTrace ? (
          <ErrorBoundary context="SpO₂ Trace">
            <SpO2Trace trace={oxTrace} showHR={showHR} showODIEvents={showODIEvents} />
          </ErrorBoundary>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6">
            <HeartPulse className="h-5 w-5 text-muted-foreground/80" />
            <p className="text-xs text-muted-foreground">No oximetry trace available</p>
            <p className="max-w-sm text-center text-[10px] leading-relaxed text-muted-foreground/70">
              Upload a Viatom or Checkme O2 Max CSV to see SpO₂ and heart rate traces alongside your flow data.
            </p>
            {onUploadOximetry && (
              <button
                onClick={onUploadOximetry}
                className="mt-1 rounded-lg border border-dashed border-primary/30 bg-primary/[0.04] px-3 py-2 text-xs font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/[0.08]"
              >
                Upload Oximetry CSV
              </button>
            )}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-xs text-muted-foreground sm:gap-5">
        <span>Duration: <strong className="text-foreground">{formatElapsedTimeShort(storedWaveform.durationSeconds)}</strong></span>
        <span>Breaths: <strong className="text-foreground">{(storedWaveform.stats.breathCount).toLocaleString()}</strong></span>
        <span>Flow range: <strong className="text-foreground">{(storedWaveform.stats.flowMin).toFixed(0)} – {(storedWaveform.stats.flowMax).toFixed(0)} L/min</strong></span>
        {storedWaveform.stats.pressureP10 != null && storedWaveform.stats.pressureP90 != null ? (
          <span>Delivered: <strong className="text-foreground">{storedWaveform.stats.pressureP10.toFixed(1)} / {storedWaveform.stats.pressureP90.toFixed(1)} cmH₂O (PS {(storedWaveform.stats.pressureP90 - storedWaveform.stats.pressureP10).toFixed(1)})</strong></span>
        ) : storedWaveform.stats.pressureMin != null && storedWaveform.stats.pressureMax != null ? (
          <span>Pressure: <strong className="text-foreground">{storedWaveform.stats.pressureMin.toFixed(1)} – {storedWaveform.stats.pressureMax.toFixed(1)} cmH₂O</strong></span>
        ) : null}
        <span>Events: <strong className="text-foreground">{storedWaveform.events.length}</strong></span>
        <span>Sample rate: <strong className="text-foreground">{storedWaveform.sampleRate.toFixed(0)} Hz</strong></span>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] leading-relaxed text-muted-foreground/70">
        Flow waveforms show actual measured samples, decimated for display at higher zoom levels.
        Tidal volume and respiratory rate are approximate.
        Event detection on this view is approximate — refer to the Flow Analysis tab for authoritative engine results.
      </p>
    </div>
  );
}

export function GraphsTab({
  selectedNight,
  nights,
  therapyChangeDate,
  isDemo,
  sdFiles,
  onReUpload,
  onUploadOximetry,
}: Props) {
  const { state, cloudLoading, cloudAttempted, retry } = useWaveform(selectedNight, isDemo, sdFiles);
  const [visibleTypes, setVisibleTypes] = useState<Set<EventType>>(
    () => new Set(ALL_EVENT_TYPES.filter((t) => t !== 'm-shape'))
  );
  const [showODIEvents, setShowODIEvents] = useState(true);
  const [showHR, setShowHR] = useState(true);

  const storedWaveform = state.waveform;
  const hasFlowData = storedWaveform ? storedWaveform.flow.length > 0 : false;
  const isFromCloud = sdFiles.length === 0 && !isDemo && cloudAttempted;

  const oxTrace = selectedNight.oximetryTrace ?? null;

  // Per-type event counts
  const eventCounts = useMemo(() => {
    if (!storedWaveform) return new Map<EventType, number>();
    const counts = new Map<EventType, number>();
    for (const t of ALL_EVENT_TYPES) counts.set(t, 0);
    for (const e of storedWaveform.events) {
      counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    }
    return counts;
  }, [storedWaveform]);

  const toggleEventType = useCallback((type: EventType) => {
    setVisibleTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Trend Chart — always visible when data exists */}
      {nights.length > 0 && (
        <TrendChart nights={nights} therapyChangeDate={therapyChangeDate} />
      )}

      {/* Loading / Error / No-data states */}
      {cloudLoading && (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
            <p className="text-sm text-muted-foreground">Loading waveform from cloud...</p>
          </CardContent>
        </Card>
      )}

      {!cloudLoading && state.status === 'loading' && (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Extracting flow waveform...</p>
            <p className="text-[11px] text-muted-foreground/80">Parsing EDF files for {selectedNight.dateStr}</p>
          </CardContent>
        </Card>
      )}

      {!cloudLoading && state.status === 'error' && (
        <Card className="border-border/50">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <p className="text-sm text-red-400">{state.error}</p>
            <Button variant="outline" size="sm" onClick={retry}>Try Again</Button>
          </CardContent>
        </Card>
      )}

      {/* No waveform data — show Glasgow Radar + upload/loading hint */}
      {!cloudLoading && state.status !== 'loading' && state.status !== 'error' && !storedWaveform && (
        <>
          {/* Glasgow Radar — always available from persisted metrics */}
          <GlasgowRadar glasgow={selectedNight.glasgow} />

          {/* Info banner: upload prompt OR loading indicator */}
          {!isDemo && sdFiles.length === 0 && (cloudAttempted || !cloudLoading) ? (
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/30 px-4 py-3">
              <Waves className="h-4 w-4 shrink-0 text-muted-foreground/70" />
              <p className="flex-1 text-xs text-muted-foreground">
                Re-upload your SD card to view flow waveforms, pressure, leak, and respiratory rate charts.
              </p>
              {onReUpload && (
                <Button variant="outline" size="sm" onClick={onReUpload} className="shrink-0">Re-upload</Button>
              )}
            </div>
          ) : !isDemo && sdFiles.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-card/30 px-4 py-3">
              <Waves className="h-4 w-4 shrink-0 text-muted-foreground/70" />
              <p className="flex-1 text-xs text-muted-foreground">
                Upload your SD card to view flow waveform charts.
              </p>
            </div>
          ) : !isDemo && sdFiles.length > 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Preparing waveform data...</p>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}

      {/* ── Synced Stacked Chart View ── */}
      {!cloudLoading && storedWaveform && hasFlowData && (
        <SyncedViewportProvider
          durationSeconds={storedWaveform.durationSeconds}
          dateStr={selectedNight.dateStr}
        >
          <div className="flex flex-col gap-3">
            {/* Toggle buttons — grouped by source */}
            {/* Machine settings reference for waveform context */}
            <MachineSettingsBar settings={selectedNight.settings} />
            <div className="flex flex-wrap items-center gap-1.5">

              <div className="mx-1 h-4 w-px bg-border/50" />

              {/* Machine event toggles */}
              <span className="hidden text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70 sm:inline">Machine</span>
              {MACHINE_EVENT_DEFS.map((def) => {
                const count = eventCounts.get(def.type) ?? 0;
                const isOn = visibleTypes.has(def.type);
                return (
                  <button
                    key={def.type}
                    onClick={() => toggleEventType(def.type)}
                    disabled={count === 0}
                    aria-pressed={isOn}
                    aria-label={`${def.label}: ${isOn ? 'visible' : 'hidden'} (${count})`}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      count === 0
                        ? 'cursor-not-allowed border-transparent bg-transparent text-muted-foreground/70'
                        : isOn
                          ? 'border-border bg-card text-foreground'
                          : 'border-transparent bg-transparent text-muted-foreground/70 line-through'
                    }`}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: isOn && count > 0 ? def.color : 'hsl(215 20% 30%)' }}
                    />
                    {def.label} ({count})
                  </button>
                );
              })}

              <div className="mx-1 h-4 w-px bg-border/50" />

              {/* Algorithm event toggles */}
              <span className="hidden text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70 sm:inline">AirwayLab</span>
              {ALGORITHM_EVENT_DEFS.map((def) => {
                const count = eventCounts.get(def.type) ?? 0;
                const isOn = visibleTypes.has(def.type);
                return (
                  <button
                    key={def.type}
                    onClick={() => toggleEventType(def.type)}
                    disabled={count === 0}
                    aria-pressed={isOn}
                    aria-label={`${def.label}: ${isOn ? 'visible' : 'hidden'} (${count})`}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      count === 0
                        ? 'cursor-not-allowed border-transparent bg-transparent text-muted-foreground/70'
                        : isOn
                          ? 'border-border bg-card text-foreground'
                          : 'border-transparent bg-transparent text-muted-foreground/70 line-through'
                    }`}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: isOn && count > 0 ? def.color : 'hsl(215 20% 30%)' }}
                    />
                    {def.label} ({count})
                  </button>
                );
              })}

              {/* SpO2 toggles — only when trace available */}
              {oxTrace && (
                <>
                  <div className="mx-1 h-4 w-px bg-border/50" />
                  <span className="hidden text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70 sm:inline">SpO₂</span>
                  <button
                    onClick={() => setShowODIEvents(!showODIEvents)}
                    aria-pressed={showODIEvents}
                    aria-label={`ODI-3: ${showODIEvents ? 'visible' : 'hidden'}`}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      showODIEvents
                        ? 'border-border bg-card text-foreground'
                        : 'border-transparent bg-transparent text-muted-foreground/70 line-through'
                    }`}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: showODIEvents ? 'hsl(0 84% 60%)' : 'hsl(215 20% 30%)' }}
                    />
                    ODI-3 ({oxTrace.odi3Events.length})
                  </button>
                  <button
                    onClick={() => setShowHR(!showHR)}
                    aria-pressed={showHR}
                    aria-label={`Heart Rate: ${showHR ? 'visible' : 'hidden'}`}
                    className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                      showHR
                        ? 'border-border bg-card text-foreground'
                        : 'border-transparent bg-transparent text-muted-foreground/70 line-through'
                    }`}
                  >
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: showHR ? 'hsl(0 84% 60%)' : 'hsl(215 20% 30%)' }}
                    />
                    Heart Rate
                  </button>
                </>
              )}
            </div>

            {/* Charts rendered inside viewport context */}
            <WaveformCharts
              storedWaveform={storedWaveform}
              selectedNight={selectedNight}

              visibleTypes={visibleTypes}
              showODIEvents={showODIEvents}
              showHR={showHR}
              onUploadOximetry={onUploadOximetry}
              isFromCloud={isFromCloud}
            />
          </div>
        </SyncedViewportProvider>
      )}

      {/* SpO2 section when no waveform data — always visible */}
      {!cloudLoading && (!storedWaveform || !hasFlowData) && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border/50 bg-card/20 py-8">
          <HeartPulse className="h-5 w-5 text-muted-foreground/80" />
          <p className="text-xs text-muted-foreground">No oximetry trace available</p>
          <p className="max-w-sm text-center text-[10px] leading-relaxed text-muted-foreground/70">
            Upload a Viatom or Checkme O2 Max CSV to see SpO₂ and heart rate traces alongside your flow data.
          </p>
          {onUploadOximetry && (
            <button
              onClick={onUploadOximetry}
              className="mt-1 rounded-lg border border-dashed border-primary/30 bg-primary/[0.04] px-3 py-2 text-xs font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/[0.08]"
            >
              Upload Oximetry CSV
            </button>
          )}
        </div>
      )}
    </div>
  );
}
