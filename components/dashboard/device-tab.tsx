'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DevicePressureChart } from '@/components/charts/device-pressure-chart';
import { DeviceLeakChart } from '@/components/charts/device-leak-chart';
import { useWaveform } from '@/hooks/use-waveform';
import { formatElapsedTimeShort } from '@/lib/waveform-utils';
import type { NightResult } from '@/lib/types';
import { Loader2, AlertCircle, Gauge, Eye, EyeOff } from 'lucide-react';

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
          <p className="text-[11px] text-muted-foreground/60">Parsing EDF files for {selectedNight.dateStr}</p>
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
          <Gauge className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No pressure or leak data available for this night.</p>
          <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground/60">
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
  const hasPressure = waveform.pressure.length > 0;
  const hasLeak = waveform.leak.length > 0;

  if (!hasPressure && !hasLeak) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Gauge className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No pressure or leak data available for this night.</p>
          <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground/60">
            This data comes from your ResMed SD card&apos;s BRP.edf files.
          </p>
        </CardContent>
      </Card>
    );
  }

  const settings = selectedNight.settings;

  return (
    <div className="flex flex-col gap-4">
      {/* Toggle controls */}
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

      {/* Pressure chart */}
      {showPressure && hasPressure && (
        <DevicePressureChart
          pressure={waveform.pressure}
          settings={settings}
          durationSeconds={waveform.durationSeconds}
        />
      )}

      {/* Leak chart */}
      {showLeak && hasLeak && (
        <DeviceLeakChart
          leak={waveform.leak}
          durationSeconds={waveform.durationSeconds}
        />
      )}

      {/* Device summary card */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Device Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Mode</span>
              <span className="font-mono text-sm font-semibold">{settings.papMode || 'Unknown'}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">EPAP</span>
              <span className="font-mono text-sm font-semibold tabular-nums">{settings.epap} cmH₂O</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">IPAP</span>
              <span className="font-mono text-sm font-semibold tabular-nums">{settings.ipap} cmH₂O</span>
            </div>
            {settings.pressureSupport > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-card/50 px-3 py-2.5">
                <span className="text-xs text-muted-foreground">PS</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{settings.pressureSupport} cmH₂O</span>
              </div>
            )}
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
        </CardContent>
      </Card>
    </div>
  );
}
