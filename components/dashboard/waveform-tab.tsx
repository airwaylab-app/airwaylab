'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FlowWaveform, type EventType } from '@/components/charts/flow-waveform';
import { SharedChartToolbar } from '@/components/charts/shared-chart-toolbar';
import { SyncedViewportProvider, useSyncedViewport } from '@/hooks/use-synced-viewport';
import { waveformOrchestrator, type WaveformState } from '@/lib/waveform-orchestrator';
import { generateSyntheticWaveform, formatElapsedTimeShort, decimateFlowRange, decimatePressureRange, getTargetRate } from '@/lib/waveform-utils';
import { loadCloudFiles } from '@/lib/storage/cloud-file-loader';
import { useAuth } from '@/lib/auth/auth-context';
import type { StoredWaveform } from '@/lib/waveform-types';
import type { NightResult } from '@/lib/types';
import { Eye, EyeOff, Loader2, AlertCircle, Waves, Cloud } from 'lucide-react';

interface Props {
  selectedNight: NightResult;
  isDemo: boolean;
  sdFiles: File[];
  onReUpload?: () => void;
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

export function WaveformTab({ selectedNight, isDemo, sdFiles, onReUpload }: Props) {
  const { user } = useAuth();
  const [state, setState] = useState<WaveformState>(waveformOrchestrator.getState());
  const [showPressure, setShowPressure] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<Set<EventType>>(() => new Set(ALL_EVENT_TYPES));
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
      waveformOrchestrator.extract(sdFiles, dateStr).catch((err) => {
        console.error('[waveform-tab] extraction failed:', err);
      });
      return;
    }

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

  const waveform = state.waveform;

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

  // Cloud loading state
  if (cloudLoading) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-sky-400" />
          <p className="text-sm text-muted-foreground">Loading waveform from cloud...</p>
          <p className="text-[11px] text-muted-foreground/80">
            Fetching stored files for {selectedNight.dateStr}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (state.status === 'loading') {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Extracting flow waveform...</p>
          <p className="text-[11px] text-muted-foreground/80">
            Parsing EDF files for {selectedNight.dateStr}
          </p>
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
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!isDemo && sdFiles.length === 0 && (cloudAttempted || !user)) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-12">
          <Waves className="h-6 w-6 text-muted-foreground/70" />
          <p className="text-sm text-muted-foreground">
            {cloudAttempted && user
              ? 'No stored waveform data found for this night'
              : 'Waveform data requires your SD card files'}
          </p>
          <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground/80">
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

  if (!waveform) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16">
          <Waves className="h-6 w-6 text-muted-foreground/70" />
          <p className="text-sm text-muted-foreground">No flow data available</p>
        </CardContent>
      </Card>
    );
  }

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

      {/* Controls — per-type toggles */}
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant={showPressure ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => setShowPressure(!showPressure)}
          disabled={!waveform.pressure || waveform.pressure.length === 0}
          className="gap-1.5 text-xs"
        >
          {showPressure ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
          Pressure
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
      </div>

      {/* Waveform chart with viewport-aware decimation */}
      <SyncedViewportProvider
        durationSeconds={waveform.durationSeconds}
        dateStr={selectedNight.dateStr}
      >
        <WaveformTabCharts
          waveform={waveform}
          showPressure={showPressure}
          visibleTypes={visibleTypes}
        />
      </SyncedViewportProvider>

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
          Sample rate: <strong className="text-foreground">{waveform.sampleRate.toFixed(0)} Hz</strong>
        </span>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] leading-relaxed text-muted-foreground/70">
        Flow waveforms show actual measured samples, decimated for display.
        Event detection on this view is approximate —
        refer to the Flow Analysis tab for authoritative engine results.
      </p>
    </div>
  );
}

/**
 * Inner component inside SyncedViewportProvider.
 * Decimates flow + pressure based on viewport zoom level.
 */
function WaveformTabCharts({
  waveform,
  showPressure,
  visibleTypes,
}: {
  waveform: StoredWaveform;
  showPressure: boolean;
  visibleTypes: Set<EventType>;
}) {
  const viewport = useSyncedViewport();

  const flowData = useMemo(() => {
    const targetRate = getTargetRate(viewport.visibleDurationSec, waveform.sampleRate);
    return decimateFlowRange(
      waveform.flow,
      waveform.sampleRate,
      viewport.clampedStartSec,
      viewport.clampedEndSec,
      targetRate
    );
  }, [waveform.flow, waveform.sampleRate, viewport.clampedStartSec, viewport.clampedEndSec, viewport.visibleDurationSec]);

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
    <div className="flex flex-col gap-3">
      <SharedChartToolbar durationSeconds={waveform.durationSeconds} />
      <FlowWaveform
        flow={flowData}
        pressure={pressureData}
        events={waveform.events}
        showPressure={showPressure}
        visibleEventTypes={visibleTypes}
      />
    </div>
  );
}
