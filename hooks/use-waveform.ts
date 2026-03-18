import { useCallback, useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { waveformOrchestrator, type WaveformState } from '@/lib/waveform-orchestrator';
import { generateSyntheticWaveform } from '@/lib/waveform-utils';
import { loadCloudFiles } from '@/lib/storage/cloud-file-loader';
import { useAuth } from '@/lib/auth/auth-context';
import type { NightResult } from '@/lib/types';

export function useWaveform(
  selectedNight: NightResult,
  isDemo: boolean,
  sdFiles: File[]
): {
  state: WaveformState;
  cloudLoading: boolean;
  cloudAttempted: boolean;
  retry: () => void;
} {
  const { user } = useAuth();
  const [state, setState] = useState<WaveformState>(waveformOrchestrator.getState());
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudAttempted, setCloudAttempted] = useState(false);
  const cloudAttemptedDates = useRef(new Set<string>());

  useEffect(() => {
    return waveformOrchestrator.subscribe(setState);
  }, []);

  // Extract waveform when night or available files change.
  // sdFiles.length is included so that when files become available
  // (e.g. re-upload from a persisted session), extraction triggers.
  useEffect(() => {
    let cancelled = false;
    const dateStr = selectedNight.dateStr;

    if (isDemo) {
      // Generate synthetic waveform for demo mode (returns StoredWaveform)
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
    } else {
      // Try IndexedDB first (instant load from local cache)
      waveformOrchestrator.loadFromIDB(dateStr).then((cached) => {
        if (cached || cancelled) return; // Already loaded from IDB

        if (sdFiles.length > 0) {
          // Local files available — extract from them
          waveformOrchestrator.extract(sdFiles, dateStr).catch((err) => {
            console.error('[use-waveform] extraction failed:', err);
            Sentry.captureException(err, { extra: { context: 'waveform-extraction', dateStr } });
          });
          return;
        }

        // No local files, no IDB cache — try loading from cloud storage if authenticated
        if (user && !cloudAttemptedDates.current.has(dateStr)) {
          cloudAttemptedDates.current.add(dateStr);
          if (!cancelled) setCloudLoading(true);
          if (!cancelled) setCloudAttempted(false);

          loadCloudFiles(dateStr)
            .then((cloudFiles) => {
              if (cancelled) return;
              if (cloudFiles.length > 0) {
                return waveformOrchestrator.extract(cloudFiles, dateStr);
              }
            })
            .then(() => {
              if (!cancelled) setCloudAttempted(true);
            })
            .catch((err: unknown) => {
              console.error('[use-waveform] Cloud file load failed:', err);
              Sentry.captureException(err, { extra: { context: 'cloud-file-load', dateStr } });
              if (!cancelled) setCloudAttempted(true);
            })
            .finally(() => { if (!cancelled) setCloudLoading(false); });
        }
      }).catch(() => {
        // IDB load failed — proceed with extraction if files available
        if (!cancelled && sdFiles.length > 0) {
          waveformOrchestrator.extract(sdFiles, dateStr).catch((err) => {
            console.error('[use-waveform] extraction failed:', err);
            Sentry.captureException(err, { extra: { context: 'waveform-extraction', dateStr } });
          });
        }
      });
    }

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cloudAttemptedDates is a ref (stable identity), not state. Including it would cause infinite re-renders.
  }, [selectedNight.dateStr, isDemo, user, sdFiles.length]);

  const retry = useCallback(() => {
    if (sdFiles.length > 0) {
      waveformOrchestrator.extract(sdFiles, selectedNight.dateStr).catch((err) => {
        console.error('[use-waveform] retry failed:', err);
        Sentry.captureException(err, { extra: { context: 'waveform-retry', dateStr: selectedNight.dateStr } });
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

  return { state, cloudLoading, cloudAttempted, retry };
}
