'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlowWaveform } from '@/components/charts/flow-waveform';
import { waveformOrchestrator, type WaveformState } from '@/lib/waveform-orchestrator';
import { generateSyntheticWaveform, formatElapsedTimeShort } from '@/lib/waveform-utils';
import type { NightResult } from '@/lib/types';
import { Eye, EyeOff, Loader2, AlertCircle, Waves } from 'lucide-react';

interface Props {
  selectedNight: NightResult;
  isDemo: boolean;
  sdFiles: File[];
  onReUpload?: () => void;
}

export function WaveformTab({ selectedNight, isDemo, sdFiles, onReUpload }: Props) {
  const [state, setState] = useState<WaveformState>(waveformOrchestrator.getState());
  const [showPressure, setShowPressure] = useState(false);
  const [showEvents, setShowEvents] = useState(true);

  useEffect(() => {
    return waveformOrchestrator.subscribe(setState);
  }, []);

  // Extract waveform when night changes
  useEffect(() => {
    const dateStr = selectedNight.dateStr;

    if (isDemo) {
      // Generate synthetic waveform for demo mode only
      const synthetic = generateSyntheticWaveform(
        selectedNight.durationHours,
        selectedNight.ned.breathCount,
        {
          flPct: selectedNight.ned.combinedFLPct,
          mShapePct: selectedNight.ned.mShapePct,
          reraCount: selectedNight.ned.reraCount,
          epap: selectedNight.settings.epap,
          ipap: selectedNight.settings.ipap,
        }
      );
      synthetic.dateStr = dateStr;
      waveformOrchestrator.setDemoWaveform(synthetic);
      return;
    }

    if (sdFiles.length === 0) {
      // No files available (persisted session) — can't extract real waveforms
      return;
    }

    // Check if already cached
    if (waveformOrchestrator.hasCached(dateStr)) {
      waveformOrchestrator.extract(sdFiles, dateStr);
      return;
    }

    // Extract on mount
    waveformOrchestrator.extract(sdFiles, dateStr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNight.dateStr, isDemo]);

  const handleRetry = useCallback(() => {
    waveformOrchestrator.extract(sdFiles, selectedNight.dateStr);
  }, [sdFiles, selectedNight.dateStr]);

  // Loading state
  if (state.status === 'loading') {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Extracting flow waveform...</p>
          <p className="text-[11px] text-muted-foreground/60">
            Parsing EDF files for {selectedNight.dateStr}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (state.status === 'error') {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <p className="text-sm text-red-400">{state.error}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  // No files available (persisted session without SD card)
  if (!isDemo && sdFiles.length === 0) {
    return (
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
            <Button variant="outline" size="sm" onClick={onReUpload} className="mt-1">
              Upload SD card
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // No waveform data yet
  if (!state.waveform) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <Waves className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">No flow data available</p>
        </CardContent>
      </Card>
    );
  }

  const waveform = state.waveform;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={showPressure ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowPressure(!showPressure)}
          disabled={waveform.pressure.length === 0}
          className="gap-1.5 text-xs"
        >
          {showPressure ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
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

      {/* Waveform chart */}
      <FlowWaveform
        waveform={waveform}
        showPressure={showPressure}
        showEvents={showEvents}
      />

      {/* Stats bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 bg-card/50 px-4 py-3 text-xs text-muted-foreground sm:gap-5">
        <span>
          Duration: <strong className="text-foreground">{formatElapsedTimeShort(waveform.durationSeconds)}</strong>
        </span>
        <span>
          Breaths: <strong className="text-foreground">{waveform.stats.breathCount.toLocaleString()}</strong>
        </span>
        <span>
          Flow range: <strong className="text-foreground">{waveform.stats.flowMin.toFixed(0)} – {waveform.stats.flowMax.toFixed(0)} L/min</strong>
        </span>
        {waveform.stats.pressureMin !== null && waveform.stats.pressureMax !== null && (
          <span>
            Pressure: <strong className="text-foreground">{waveform.stats.pressureMin.toFixed(1)} – {waveform.stats.pressureMax.toFixed(1)} cmH₂O</strong>
          </span>
        )}
        <span>
          Events: <strong className="text-foreground">{waveform.events.length}</strong>
        </span>
        <span>
          Sample rate: <strong className="text-foreground">{waveform.originalSampleRate.toFixed(0)} Hz</strong>
        </span>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] leading-relaxed text-muted-foreground/50">
        Flow waveforms are downsampled for display. Event detection on this view is approximate —
        refer to the Flow Analysis tab for authoritative engine results. Use the brush control
        below the chart to zoom into specific time ranges.
      </p>
    </div>
  );
}
