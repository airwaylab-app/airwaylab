import { useCallback, useEffect, useRef, useState } from 'react';
import * as Sentry from '@sentry/nextjs';
import { waveformOrchestrator, type WaveformState } from '@/lib/waveform-orchestrator';
import { events } from '@/lib/analytics';

interface UseSharedWaveformOptions {
  shareId: string;
  filePaths: string[];
  dateStr: string;
}

/**
 * Hook for loading waveform data in the shared view.
 * Downloads EDF files via signed URLs, then extracts waveform
 * using the existing waveformOrchestrator pipeline.
 */
export function useSharedWaveform({
  shareId,
  filePaths,
  dateStr,
}: UseSharedWaveformOptions): {
  state: WaveformState;
  downloading: boolean;
  retry: () => void;
} {
  const [state, setState] = useState<WaveformState>(waveformOrchestrator.getState());
  const [downloading, setDownloading] = useState(false);
  const attemptedDates = useRef(new Set<string>());
  const filesCache = useRef<File[]>([]);

  useEffect(() => {
    return waveformOrchestrator.subscribe(setState);
  }, []);

  const loadWaveform = useCallback(async () => {
    if (filePaths.length === 0) return;

    // If files already downloaded, just extract for new date
    if (filesCache.current.length > 0) {
      waveformOrchestrator.extract(filesCache.current, dateStr).catch((err) => {
        console.error('[use-shared-waveform] extraction failed:', err);
        Sentry.captureException(err, { extra: { context: 'shared-waveform-extraction', dateStr } });
      });
      return;
    }

    setDownloading(true);

    try {
      // Get signed download URLs
      const res = await fetch(`/api/share/files?shareId=${encodeURIComponent(shareId)}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? 'Could not load waveform data');
      }

      const { downloadUrls } = await res.json() as {
        downloadUrls: { fileName: string; downloadUrl: string }[];
      };

      // Download all files
      const files: File[] = [];
      for (const entry of downloadUrls) {
        const fileRes = await fetch(entry.downloadUrl);
        if (!fileRes.ok) continue;

        const blob = await fileRes.blob();
        files.push(new File([blob], entry.fileName, { type: 'application/octet-stream' }));
      }

      if (files.length === 0) {
        throw new Error('No files could be downloaded');
      }

      filesCache.current = files;
      setDownloading(false);

      events.shareWaveformLoaded();

      // Extract waveform for the current night
      await waveformOrchestrator.extract(files, dateStr);
    } catch (err) {
      console.error('[use-shared-waveform] download failed:', err);
      Sentry.captureException(err, { extra: { context: 'shared-waveform-download', shareId } });
      setDownloading(false);
    }
  }, [shareId, filePaths.length, dateStr]);

  // Trigger load when date changes
  useEffect(() => {
    if (filePaths.length === 0) return;

    // Check cache first
    if (waveformOrchestrator.hasCached(dateStr)) return;

    if (filesCache.current.length > 0) {
      // Files already downloaded, just extract for new date
      waveformOrchestrator.extract(filesCache.current, dateStr).catch((err) => {
        console.error('[use-shared-waveform] extraction failed:', err);
        Sentry.captureException(err, { extra: { context: 'shared-waveform-extraction', dateStr } });
      });
      return;
    }

    if (!attemptedDates.current.has(dateStr)) {
      attemptedDates.current.add(dateStr);
      loadWaveform();
    }
  }, [dateStr, filePaths.length, loadWaveform]);

  const retry = useCallback(() => {
    attemptedDates.current.delete(dateStr);
    filesCache.current = [];
    loadWaveform();
  }, [dateStr, loadWaveform]);

  return { state, downloading, retry };
}
