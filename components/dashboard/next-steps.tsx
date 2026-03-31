'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Lightbulb, ArrowRight, Compass } from 'lucide-react';
import type { NightResult } from '@/lib/types';
import { getTrafficLight } from '@/lib/thresholds';
import { useThresholds } from '@/components/common/thresholds-provider';

interface Props {
  selectedNight: NightResult;
  hasOximetry: boolean;
  nightCount: number;
  onUploadOximetry?: () => void;
  onReUpload?: () => void;
}

interface Step {
  text: string;
  richText?: ReactNode;
  link?: { href: string; label: string };
  onClick?: () => void;
  actionLabel?: string;
}

export function NextSteps({ selectedNight, hasOximetry, nightCount, onUploadOximetry, onReUpload }: Props) {
  const THRESHOLDS = useThresholds();
  const steps: Step[] = [];

  const gl = getTrafficLight(selectedNight.glasgow.overall, THRESHOLDS.glasgowOverall!);
  const eaiVal = selectedNight.ned.estimatedArousalIndex ?? 0;
  const eaiL = getTrafficLight(eaiVal, THRESHOLDS.eai!);

  if (gl === 'bad') {
    steps.push({
      text: 'Your flow limitation metrics are higher than typical. Consider sharing this report with your clinician for interpretation.',
    });
  }

  if (eaiL === 'bad' && gl === 'good') {
    steps.push({
      text: 'Your respiratory disruption metrics are elevated while flow limitation is low. Read about CNS sensitization for educational context.',
      link: { href: '/blog/what-is-cns-sensitization', label: 'Read about CNS sensitization' },
    });
  }

  if (!hasOximetry) {
    steps.push({
      text: 'Add pulse oximetry data for deeper analysis — oxygen desaturations and heart rate patterns reveal what flow data alone can\'t.',
      onClick: onUploadOximetry ?? onReUpload ?? (() => window.scrollTo({ top: 0, behavior: 'smooth' })),
      actionLabel: onUploadOximetry ? 'Upload oximetry CSV' : 'Re-upload with oximetry',
    });
  }

  if (nightCount < 3) {
    steps.push({
      text: 'Upload more nights to see trends. At least 3 nights helps identify consistent patterns vs one-off variations.',
    });
  }

  if (steps.length === 0) {
    steps.push({
      text: 'Your metrics are within the typical range. Upload regularly to track changes over time.',
    });
  }

  steps.push({
    text: 'Share your results on r/SleepApnea or ApneaBoard for community feedback.',
    richText: (
      <>
        Share your results on{' '}
        <a
          href="https://reddit.com/r/SleepApnea"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          r/SleepApnea
        </a>
        {' '}or{' '}
        <a
          href="https://www.apneaboard.com"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary hover:underline"
        >
          ApneaBoard
        </a>
        {' '}for community feedback.
      </>
    ),
  });

  const shown = steps.slice(0, 3);

  return (
    <div data-walkthrough="next-steps" className="rounded-xl border border-border/50 bg-card/30 p-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-foreground">What should I do next?</h3>
      </div>
      <ol className="mt-3 space-y-2">
        {shown.map((step, i) => (
          <li key={i} className="flex gap-2.5 text-xs leading-relaxed text-muted-foreground">
            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-400/10 text-[10px] font-bold text-amber-400">
              {i + 1}
            </span>
            <span>
              {step.richText ?? step.text}
              {step.link && (
                <Link
                  href={step.link.href}
                  className="ml-1 inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
                >
                  {step.link.label} <ArrowRight className="h-2.5 w-2.5" />
                </Link>
              )}
              {step.onClick && (
                <button
                  type="button"
                  onClick={step.onClick}
                  className="ml-1 inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
                >
                  {step.actionLabel ?? 'Do this'} <ArrowRight className="h-2.5 w-2.5" />
                </button>
              )}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex items-center gap-3 border-t border-border/30 pt-3">
        <button
          type="button"
          onClick={() => {
            const fn = (window as unknown as Record<string, (() => void) | undefined>).__airwaylab_restart_walkthrough;
            if (fn) fn();
          }}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          <Compass className="h-3 w-3" /> Take the tour again
        </button>
        <Link
          href="/getting-started"
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
        >
          Getting started guide <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      </div>
    </div>
  );
}
