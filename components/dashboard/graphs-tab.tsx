'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendChart } from '@/components/charts/trend-chart';
import { FlowWaveform } from '@/components/charts/flow-waveform';
import { DevicePressureChart } from '@/components/charts/device-pressure-chart';
import { DeviceLeakChart } from '@/components/charts/device-leak-chart';
import { SpO2Trace } from '@/components/charts/spo2-trace';
import { useWaveform } from '@/hooks/use-waveform';
import { formatElapsedTimeShort } from '@/lib/waveform-utils';
import type { NightResult } from '@/lib/types';
import {
  Loader2,
  AlertCircle,
  Waves,
  Gauge,
  HeartPulse,
  Eye,
  EyeOff,
  Cloud,
  ChevronRight,
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
  const [showPressure, setShowPressure] = useState(true);
  const [showLeak, setShowLeak] = useState(true);
  const [showFlowPressure, setShowFlowPressure] = useState(false);
  const [showEvents, setShowEvents] = useState(true);

  const waveform = state.waveform;
  const hasPressure = waveform ? waveform.pressure.length > 0 : false;
  const hasLeak = waveform ? waveform.leak.length > 0 : false;
  const hasFlowData = waveform ? waveform.flow.length > 0 : false;
  const isFromCloud = sdFiles.length === 0 && !isDemo && cloudAttempted;

  const oxTrace = selectedNight.oximetryTrace ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* Trend Chart — multi-night overview */}
      {nights.length > 1 && (
        <TrendChart nights={nights} therapyChangeDate={therapyChangeDate} />
      )}

      {/* Flow Waveform Section */}
      <details className="group" open>
        <summary className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 bg-card/30 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          <Waves className="h-4 w-4" />
          Flow Waveform
          {waveform && (
            <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground/60">
              {formatElapsedTimeShort(waveform.durationSeconds)}
            </span>
          )}
        </summary>
        <div className="mt-3">
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
            ) : (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
                  <Waves className="h-6 w-6 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">No flow data available</p>
                </CardContent>
              </Card>
            )
          )}

          {!cloudLoading && waveform && hasFlowData && (
            <div className="flex flex-col gap-4">
              {isFromCloud && (
                <div className="flex items-center gap-2 text-xs text-sky-400">
                  <Cloud className="h-3.5 w-3.5" />
                  <span>Loaded from cloud storage</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={showFlowPressure ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setShowFlowPressure(!showFlowPressure)}
                  disabled={!hasPressure}
                  className="gap-1.5 text-xs"
                >
                  {showFlowPressure ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Pressure
                </Button>
                <Button
                  variant={showEvents ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => setShowEvents(!showEvents)}
                  disabled={waveform.events.length === 0}
                  className="gap-1.5 text-xs"
                >
                  {showEvents ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                  Events ({waveform.events.length})
                </Button>
              </div>
              <FlowWaveform
                waveform={waveform}
                showPressure={showFlowPressure}
                showEvents={showEvents}
              />
              <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-xs text-muted-foreground sm:gap-5">
                <span>Duration: <strong className="text-foreground">{formatElapsedTimeShort(waveform.durationSeconds)}</strong></span>
                <span>Breaths: <strong className="text-foreground">{waveform.stats.breathCount.toLocaleString()}</strong></span>
                <span>Flow range: <strong className="text-foreground">{waveform.stats.flowMin.toFixed(0)} – {waveform.stats.flowMax.toFixed(0)} L/min</strong></span>
                {waveform.stats.pressureMin !== null && waveform.stats.pressureMax !== null && (
                  <span>Pressure: <strong className="text-foreground">{waveform.stats.pressureMin.toFixed(1)} – {waveform.stats.pressureMax.toFixed(1)} cmH₂O</strong></span>
                )}
                <span>Events: <strong className="text-foreground">{waveform.events.length}</strong></span>
                <span>Sample rate: <strong className="text-foreground">{waveform.originalSampleRate.toFixed(0)} Hz</strong></span>
              </div>
            </div>
          )}
        </div>
      </details>

      {/* Pressure & Leak Section */}
      {waveform && (hasPressure || hasLeak) && (
        <details className="group" open>
          <summary className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 bg-card/30 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            <Gauge className="h-4 w-4" />
            Pressure &amp; Leak
          </summary>
          <div className="mt-3 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant={showPressure ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowPressure(!showPressure)}
                disabled={!hasPressure}
                className="gap-1.5 text-xs"
              >
                {showPressure ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Pressure
              </Button>
              <Button
                variant={showLeak ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setShowLeak(!showLeak)}
                disabled={!hasLeak}
                className="gap-1.5 text-xs"
              >
                {showLeak ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                Leak
              </Button>
            </div>
            {showPressure && hasPressure && (
              <DevicePressureChart
                pressure={waveform.pressure}
                settings={selectedNight.settings}
                durationSeconds={waveform.durationSeconds}
              />
            )}
            {showLeak && hasLeak && (
              <DeviceLeakChart
                leak={waveform.leak}
                durationSeconds={waveform.durationSeconds}
              />
            )}
          </div>
        </details>
      )}

      {/* SpO2 Trace Section */}
      <details className="group" open={!!oxTrace}>
        <summary className="flex cursor-pointer items-center gap-2 rounded-lg border border-border/50 bg-card/30 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&::-webkit-details-marker]:hidden">
          <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
          <HeartPulse className="h-4 w-4" />
          SpO₂ &amp; Heart Rate Trace
          {!oxTrace && (
            <span className="ml-auto text-[10px] text-muted-foreground/50">No data</span>
          )}
        </summary>
        <div className="mt-3">
          {oxTrace ? (
            <SpO2Trace trace={oxTrace} />
          ) : (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
                <HeartPulse className="h-6 w-6 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No oximetry trace available</p>
                <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground/60">
                  Upload a Viatom or Checkme O2 Max CSV to see SpO₂ and heart rate traces.
                </p>
                {onUploadOximetry && (
                  <button
                    onClick={onUploadOximetry}
                    className="mt-2 rounded-lg border border-dashed border-primary/30 bg-primary/[0.04] px-4 py-2.5 text-xs font-medium text-primary transition-colors hover:border-primary/50 hover:bg-primary/[0.08]"
                  >
                    Upload Oximetry CSV
                  </button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </details>

      <p className="text-[10px] leading-relaxed text-muted-foreground/50">
        Flow waveforms are downsampled for display. Event detection on this view is approximate —
        refer to the Flow Analysis tab for authoritative engine results.
      </p>
    </div>
  );
}
