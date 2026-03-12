'use client';

import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendChart } from '@/components/charts/trend-chart';
import { FlowWaveform, type EventType } from '@/components/charts/flow-waveform';
import { DevicePressureChart } from '@/components/charts/device-pressure-chart';
import { DeviceLeakChart } from '@/components/charts/device-leak-chart';
import { SpO2Trace } from '@/components/charts/spo2-trace';
import { TidalVolumeChart } from '@/components/charts/tidal-volume-chart';
import { RespiratoryRateChart } from '@/components/charts/respiratory-rate-chart';
import { SharedChartToolbar } from '@/components/charts/shared-chart-toolbar';
import { ChartInteractionHint } from '@/components/charts/chart-interaction-hint';
import { SyncedViewportProvider } from '@/hooks/use-synced-viewport';
import { useWaveform } from '@/hooks/use-waveform';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { formatElapsedTimeShort } from '@/lib/waveform-utils';
import type { NightResult } from '@/lib/types';
import {
  Loader2,
  AlertCircle,
  Waves,
  HeartPulse,
  Eye,
  EyeOff,
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
  const [showFlowPressure, setShowFlowPressure] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<Set<EventType>>(
    () => new Set(ALL_EVENT_TYPES.filter((t) => t !== 'm-shape'))
  );
  const [showODIEvents, setShowODIEvents] = useState(true);
  const [showHR, setShowHR] = useState(true);

  const waveform = state.waveform;
  const hasPressure = waveform ? waveform.pressure.length > 0 : false;
  const hasLeak = waveform ? waveform.leak.length > 0 : false;
  const hasFlowData = waveform ? waveform.flow.length > 0 : false;
  const hasTidalVolume = waveform ? (waveform.tidalVolume?.length ?? 0) > 0 : false;
  const hasRespRate = waveform ? (waveform.respiratoryRate?.length ?? 0) > 0 : false;
  const isFromCloud = sdFiles.length === 0 && !isDemo && cloudAttempted;

  const oxTrace = selectedNight.oximetryTrace ?? null;

  // Per-type event counts
  const eventCounts = useMemo(() => {
    if (!waveform) return new Map<EventType, number>();
    const counts = new Map<EventType, number>();
    for (const t of ALL_EVENT_TYPES) counts.set(t, 0);
    for (const e of waveform.events) {
      counts.set(e.type, (counts.get(e.type) ?? 0) + 1);
    }
    return counts;
  }, [waveform]);

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

  // Compute data length for synced viewport (flow data is the reference)
  const dataLength = waveform?.flow.length ?? 0;
  const bucketSeconds = waveform && waveform.flow.length > 1
    ? waveform.flow[1].t - waveform.flow[0].t
    : 2;

  return (
    <div className="flex flex-col gap-6">
      {/* Trend Chart — multi-night overview */}
      {nights.length > 1 && (
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

      {/* No waveform data — show upload prompt */}
      {!cloudLoading && state.status !== 'loading' && state.status !== 'error' && !waveform && (
        !isDemo && sdFiles.length === 0 && (cloudAttempted || !cloudLoading) ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
              <Waves className="h-6 w-6 text-muted-foreground/70" />
              <p className="text-sm text-muted-foreground">
                Waveform data requires your SD card files
              </p>
              <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground/80">
                Waveforms are extracted directly from your ResMed EDF files and aren&apos;t
                stored between sessions. Re-upload your SD card to browse the flow data.
              </p>
              {onReUpload && (
                <Button variant="outline" size="sm" onClick={onReUpload} className="mt-1">Upload SD card</Button>
              )}
            </CardContent>
          </Card>
        ) : !waveform ? (
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
              <Waves className="h-6 w-6 text-muted-foreground/70" />
              <p className="text-sm text-muted-foreground">No flow data available</p>
            </CardContent>
          </Card>
        ) : null
      )}

      {/* ── Synced Stacked Chart View ── */}
      {!cloudLoading && waveform && hasFlowData && (
        <SyncedViewportProvider
          dataLength={dataLength}
          bucketSeconds={bucketSeconds}
          dateStr={selectedNight.dateStr}
        >
          <div className="flex flex-col gap-3">
            {/* Cloud badge */}
            {isFromCloud && (
              <div className="flex items-center gap-2 text-xs text-sky-400">
                <Cloud className="h-3.5 w-3.5" />
                <span>Loaded from cloud storage</span>
              </div>
            )}

            {/* Shared toolbar + minimap */}
            <SharedChartToolbar durationSeconds={waveform.durationSeconds} />

            {/* First-use interaction hint */}
            <ChartInteractionHint />

            {/* Toggle buttons — grouped by source */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Pressure toggle */}
              <Button
                variant={showFlowPressure ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowFlowPressure(!showFlowPressure)}
                disabled={!hasPressure}
                className="gap-1.5 text-xs"
              >
                {showFlowPressure ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Pressure Overlay
              </Button>

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

            {/* Stacked charts — each wrapped in its own ErrorBoundary */}
            <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-card/20 p-3">
              {/* Flow Waveform */}
              <ErrorBoundary context="Flow Waveform">
                <FlowWaveform
                  waveform={waveform}
                  showPressure={showFlowPressure}
                  visibleEventTypes={visibleTypes}
                />
              </ErrorBoundary>

              {/* Tidal Volume */}
              {hasTidalVolume ? (
                <ErrorBoundary context="Tidal Volume">
                  <TidalVolumeChart tidalVolume={waveform.tidalVolume!} />
                </ErrorBoundary>
              ) : (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/80">
                  Requires flow data — upload your SD card.
                </div>
              )}

              {/* Respiratory Rate */}
              {hasRespRate ? (
                <ErrorBoundary context="Respiratory Rate">
                  <RespiratoryRateChart respiratoryRate={waveform.respiratoryRate!} />
                </ErrorBoundary>
              ) : (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/80">
                  Requires flow data — upload your SD card.
                </div>
              )}

              {/* Pressure */}
              {hasPressure ? (
                <ErrorBoundary context="Pressure">
                  <DevicePressureChart
                    pressure={waveform.pressure}
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
                  <DeviceLeakChart leak={waveform.leak} />
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
              <span>Duration: <strong className="text-foreground">{formatElapsedTimeShort(waveform.durationSeconds ?? 0)}</strong></span>
              <span>Breaths: <strong className="text-foreground">{(waveform.stats?.breathCount ?? 0).toLocaleString()}</strong></span>
              <span>Flow range: <strong className="text-foreground">{(waveform.stats?.flowMin ?? 0).toFixed(0)} – {(waveform.stats?.flowMax ?? 0).toFixed(0)} L/min</strong></span>
              {waveform.stats?.pressureMin != null && waveform.stats?.pressureMax != null && (
                <span>Pressure: <strong className="text-foreground">{waveform.stats.pressureMin.toFixed(1)} – {waveform.stats.pressureMax.toFixed(1)} cmH₂O</strong></span>
              )}
              <span>Events: <strong className="text-foreground">{waveform.events.length}</strong></span>
              <span>Sample rate: <strong className="text-foreground">{waveform.originalSampleRate.toFixed(0)} Hz</strong></span>
            </div>

            {/* Disclaimer */}
            <p className="text-[10px] leading-relaxed text-muted-foreground/70">
              Flow waveforms are downsampled for display. Tidal volume and respiratory rate are approximate.
              Event detection on this view is approximate — refer to the Flow Analysis tab for authoritative engine results.
            </p>
          </div>
        </SyncedViewportProvider>
      )}

      {/* SpO2 section when no waveform data — always visible */}
      {!cloudLoading && (!waveform || !hasFlowData) && (
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
