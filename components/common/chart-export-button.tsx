'use client';

import { useState, useCallback } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Camera, Check, Loader2 } from 'lucide-react';
import { shareOrDownload, generateFilename } from '@/lib/chart-image';
import { events } from '@/lib/analytics';

interface Props {
  /** Function that renders the chart to a Blob */
  renderFn: () => Promise<Blob>;
  /** Chart type for filename (e.g. 'glasgow', 'flow', 'spo2') */
  chartType: string;
  /** Date string for filename */
  dateStr: string;
  /** Optional tooltip text */
  tooltip?: string;
}

export function ChartExportButton({ renderFn, chartType, dateStr, tooltip = 'Save chart as image' }: Props) {
  const [status, setStatus] = useState<'idle' | 'rendering' | 'done' | 'error'>('idle');

  const handleExport = useCallback(async () => {
    if (status === 'rendering') return;
    setStatus('rendering');
    try {
      const blob = await renderFn();
      const filename = generateFilename(chartType, dateStr);
      await shareOrDownload(blob, filename);
      events.export('chart_image');
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      console.error('[chart-export] Render failed:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  }, [renderFn, chartType, dateStr, status]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          onClick={handleExport}
          disabled={status === 'rendering'}
          className="inline-flex h-6 w-6 items-center justify-center rounded-md p-0 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          aria-label={tooltip}
        >
          {status === 'rendering' ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : status === 'done' ? (
            <Check className="h-3 w-3 text-emerald-500" />
          ) : (
            <Camera className="h-3 w-3" />
          )}
        </TooltipTrigger>
        <TooltipContent>
          {status === 'error' ? 'Export failed — try again' : tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
