'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlowWaveform } from '@/components/charts/flow-waveform';
import { waveformOrchestrator, type WaveformState } from '@/lib/waveform-orchestrator';
import { generateSyntheticWaveform, formatElapsedTimeShort } from '@/lib/waveform-utils';
import { loadCloudFiles } from '@/lib/storage/cloud-file-loader';
import { useAuth } from '@/lib/auth/auth-context';
import type { NightResult } from '@/lib/types';
import { Eye, EyeOff, Loader2, AlertCircle, Waves, Cloud } from 'lucide-react';

interface Props {
  selectedNight: NightResult;
  isDemo: boolean;
  sdFiles: File[];
  onReUpload?: () => void;
}

export function WaveformTab({ selectedNight, isDemo, sdFiles, onReUpload }: Props) {
  const { user } = useAuth();
  const [state, setState] = useState<WaveformState>(waveformOrchestrator.getState());
  const [showPressure, setShowPressure] = useState(false);
  const [showEvents, setShowEvents] = useState(true);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudAttempted, setCloudAttempted] = useState(false);
  const cloudAttemptedDates = useRef(new Set<string>());

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

    if (sdFiles.length > 0) {
      // Local files available — extract from them
      waveformOrchestrator.extract(sdFiles, dateStr).catch((err) => {
        console.error('[waveform-tab] extraction failed:', err);
      });
      return;
    }

    // No local files — try loading from cloud storage if authenticated
    if (user && !cloudAttemptedDates.current.has(dateStr)) {
      cloudAttemptedDates.current.add(dateStr);
      setCloudLoading(true);
      setCloudAttempted(false);

      loadCloudFiles(dateStr)
        .then((cloudFiles) => {
          if (cloudFiles.length > 0) {
            return waveformOrchestrator.extract(cloudFiles, dateStr);
          }
        })
        .then(() => {
          setCloudAttempted(true);
        })
        .catch((err) => {
          console.error('[waveform-tab] Cloud file load failed:', err);
          setCloudAttempted(true);
        })
        .finally(() => setCloudLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNight.dateStr, isDemo, user]);

  const handleRetry = useCallback(() => {
    if (sdFiles.length > 0) {
      waveformOrchestrator.extract(sdFiles, selectedNight.dateStr).catch((err) => {
        console.error('[waveform-tab] retry failed:', err);
      });
    } else if (user) {
      // Retry cloud load
      cloudAttemptedDates.current.delete(selectedNight.dateStr);
      setCloudLoading(true);
      setCloudAttempted(false);
      loadCloudFiles(selectedNight.dateStr)
        .then((cloudFiles) => {
          if (cloudFiles.length > 0) {
            return waveformOrchestrator.extract(cloudFiles, selectedNight.dateStr);
          }
        })
        .then(() => setCloudAttempted(true))
        .catch(() => setCloudAttempted(true))
        .finally(() => setCloudLoading(false));
    }
  }, [sdFiles, selectedNight.dateStr, user]);

  // Cloud loading state
  if (cloudLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          <p className="text-sm text-muted-foreground">Loading waveform from cloud...</p>
          <p className="text-[11px] text-muted-foreground/60">
            Fetching stored files for {selectedNight.dateStr}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Extraction loading state
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

  // No files available — no local files, cloud attempted but no files found
  if (!isDemo && sdFiles.length === 0 && (cloudAttempted || !user)) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Waves className="h-6 w-6 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            {cloudAttempted && user
              ? 'No stored waveform data found for this night'
              : 'Waveform data requires your SD card files'}
          </p>
          <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground/60">
            {cloudAttempted && user ? (
              <>
                Enable &quot;Store my SD card data&quot; on your next upload to access
                waveforms without re-uploading.
              </>
            ) : (
              <>
                Waveforms are extracted directly from your ResMed EDF files and aren&apos;t
                stored between sessions. Re-upload your SD card to browse the flow data.
              </>
            )}
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

  const isFromCloud = sdFiles.length === 0 && !isDemo && cloudAttempted;

  return (
    <div className="flex flex-col gap-4">
      {/* Cloud source indicator */}
      {isFromCloud && (
        <div className="flex items-center gap-2 text-xs text-sky-400">
          <Cloud className="h-3.5 w-3.5" />
          <span>Loaded from cloud storage</span>
        </div>
      )}

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
