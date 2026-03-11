'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendChart } from '@/components/charts/trend-chart';
import { FlowWaveform } from '@/components/charts/flow-waveform';
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
  const [showEvents, setShowEvents] = useState(true);

  const waveform = state.waveform;
  const hasPressure = waveform ? waveform.pressure.length > 0 : false;
  const hasLeak = waveform ? waveform.leak.length > 0 : false;
  const hasFlowData = waveform ? waveform.flow.length > 0 : false;
  const hasTidalVolume = waveform ? (waveform.tidalVolume?.length ?? 0) > 0 : false;
  const hasRespRate = waveform ? (waveform.respiratoryRate?.length ?? 0) > 0 : false;
  const isFromCloud = sdFiles.length === 0 && !isDemo && cloudAttempted;

  const oxTrace = selectedNight.oximetryTrace ?? null;

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
            <p className="text-[11px] text-muted-foreground/60">Parsing EDF files for {selectedNight.dateStr}</p>
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
              <Waves className="h-6 w-6 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Waveform data requires your SD card files
              </p>
              <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground/60">
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
              <Waves className="h-6 w-6 text-muted-foreground/50" />
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

            {/* Toggle buttons */}
            <div className="flex flex-wrap items-center gap-2">
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
              <Button
                variant={showEvents ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowEvents(!showEvents)}
                className="gap-1.5 text-xs"
              >
                {showEvents ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Events ({waveform.events.length})
              </Button>
            </div>

            {/* Stacked charts — each wrapped in its own ErrorBoundary */}
            <div className="flex flex-col gap-4 rounded-lg border border-border/50 bg-card/20 p-3">
              {/* Flow Waveform */}
              <ErrorBoundary context="Flow Waveform">
                <FlowWaveform
                  waveform={waveform}
                  showPressure={showFlowPressure}
                  showEvents={showEvents}
                />
              </ErrorBoundary>

              {/* Tidal Volume */}
              {hasTidalVolume ? (
                <ErrorBoundary context="Tidal Volume">
                  <TidalVolumeChart tidalVolume={waveform.tidalVolume!} />
                </ErrorBoundary>
              ) : (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/60">
                  Requires flow data — upload your SD card.
                </div>
              )}

              {/* Respiratory Rate */}
              {hasRespRate ? (
                <ErrorBoundary context="Respiratory Rate">
                  <RespiratoryRateChart respiratoryRate={waveform.respiratoryRate!} />
                </ErrorBoundary>
              ) : (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/60">
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
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/60">
                  No pressure data in this recording.
                </div>
              )}

              {/* Leak */}
              {hasLeak ? (
                <ErrorBoundary context="Leak">
                  <DeviceLeakChart leak={waveform.leak} />
                </ErrorBoundary>
              ) : (
                <div className="flex items-center justify-center py-4 text-xs text-muted-foreground/60">
                  No leak data in this recording.
                </div>
              )}

              {/* SpO2 — always visible */}
              {oxTrace ? (
                <ErrorBoundary context="SpO₂ Trace">
                  <SpO2Trace trace={oxTrace} />
                </ErrorBoundary>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6">
                  <HeartPulse className="h-5 w-5 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">No oximetry trace available</p>
                  <p className="max-w-sm text-center text-[10px] leading-relaxed text-muted-foreground/50">
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
            <p className="text-[10px] leading-relaxed text-muted-foreground/50">
              Flow waveforms are downsampled for display. Tidal volume and respiratory rate are approximate.
              Event detection on this view is approximate — refer to the Flow Analysis tab for authoritative engine results.
            </p>
          </div>
        </SyncedViewportProvider>
      )}

      {/* SpO2 section when no waveform data — always visible */}
      {!cloudLoading && (!waveform || !hasFlowData) && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border/50 bg-card/20 py-8">
          <HeartPulse className="h-5 w-5 text-muted-foreground/40" />
          <p className="text-xs text-muted-foreground">No oximetry trace available</p>
          <p className="max-w-sm text-center text-[10px] leading-relaxed text-muted-foreground/50">
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
