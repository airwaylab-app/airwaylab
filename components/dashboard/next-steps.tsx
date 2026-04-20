'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Compass, ArrowRight, TrendingUp, Globe, Stethoscope, Copy, Check } from 'lucide-react';
import type { NightResult } from '@/lib/types';
import { getTrafficLight } from '@/lib/thresholds';
import { useThresholds } from '@/components/common/thresholds-provider';
import { computeIFLRisk } from '@/lib/ifl-risk';

interface Props {
  selectedNight: NightResult;
  hasOximetry: boolean;
  nightCount: number;
  onUploadOximetry?: () => void;
  onReUpload?: () => void;
}

function buildClinicianQuestions(
  night: NightResult,
  thresholds: ReturnType<typeof useThresholds>
): string[] {
  const questions: string[] = [];
  const iflRisk = computeIFLRisk(night);
  const iflL = getTrafficLight(iflRisk, thresholds.iflRisk!);
  const glL = getTrafficLight(night.glasgow.overall, thresholds.glasgowOverall!);
  const nedL = getTrafficLight(night.ned.nedMean, thresholds.nedMean!);
  const eaiVal = night.ned.estimatedArousalIndex ?? 0;
  const eaiL = getTrafficLight(eaiVal, thresholds.eai!);

  if (iflL !== 'good') {
    questions.push(
      `My IFL Symptom Risk is ${iflRisk.toFixed(1)}% — what might this indicate about my airway during sleep?`
    );
  }
  if (glL !== 'good') {
    questions.push(
      `My Glasgow Index is ${night.glasgow.overall.toFixed(2)} — is this level of waveform abnormality clinically significant?`
    );
  }
  if (nedL !== 'good') {
    questions.push(
      `My NED Mean is ${night.ned.nedMean.toFixed(1)}% — could this suggest effort-related breathing issues worth addressing?`
    );
  }
  if (eaiL !== 'good') {
    questions.push(
      `My respiratory disruption index is ${eaiVal.toFixed(1)}/hr — should I investigate this further?`
    );
  }
  if (questions.length === 0) {
    questions.push(
      'My breathing metrics look typical. Are there any patterns I should monitor over time?'
    );
  }
  return questions;
}

export function NextSteps({
  selectedNight,
  hasOximetry,
  nightCount,
  onUploadOximetry,
  onReUpload,
}: Props) {
  const THRESHOLDS = useThresholds();
  const [copied, setCopied] = useState(false);

  const clinicianQuestions = buildClinicianQuestions(selectedNight, THRESHOLDS);

  const handleCopy = useCallback(async () => {
    const text = clinicianQuestions.map((q) => `• ${q}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available — silently ignore
    }
  }, [clinicianQuestions]);

  const uploadAction = onUploadOximetry ?? onReUpload;

  return (
    <div data-walkthrough="next-steps" className="rounded-xl border border-border/50 bg-card/30 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Compass className="h-4 w-4 text-primary/60" />
        <h3 className="text-sm font-semibold text-foreground">Where to go from here</h3>
      </div>

      {/* Three-column layout: Track it / Explore it / Discuss it */}
      <div className="grid gap-4 sm:grid-cols-3">

        {/* Track it */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary/50" />
            <span className="text-xs font-medium text-foreground/80">Track it</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            {nightCount < 3
              ? 'Upload more nights to build a trend picture. At least 3 nights helps identify consistent patterns.'
              : 'Keep uploading regularly to spot changes early. Trends across 7+ nights give the clearest picture.'}
          </p>
          {!hasOximetry && uploadAction && (
            <button
              type="button"
              onClick={uploadAction}
              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
            >
              {onUploadOximetry ? 'Upload oximetry CSV' : 'Re-upload with oximetry'}
              <ArrowRight className="h-2.5 w-2.5" />
            </button>
          )}
          {nightCount < 3 && (
            <p className="text-[11px] text-muted-foreground/70">
              {3 - nightCount} more night{3 - nightCount !== 1 ? 's' : ''} to unlock trend analysis
            </p>
          )}
        </div>

        {/* Explore it */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-primary/50" />
            <span className="text-xs font-medium text-foreground/80">Explore it</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Community forums where others discuss PAP therapy optimisation:
          </p>
          <ul className="space-y-1">
            <li>
              <a
                href="https://www.apneaboard.com/forums/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
                aria-label="ApneaBoard forums (opens in new tab)"
              >
                ApneaBoard forums <ArrowRight className="h-2.5 w-2.5" />
              </a>
            </li>
            <li>
              <a
                href="https://www.reddit.com/r/SleepApnea/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-[11px] font-medium text-primary hover:underline"
                aria-label="r/SleepApnea on Reddit (opens in new tab)"
              >
                r/SleepApnea <ArrowRight className="h-2.5 w-2.5" />
              </a>
            </li>
          </ul>
          <p className="text-[10px] text-muted-foreground/60">
            External links. AirwayLab does not endorse specific treatment advice.
          </p>
        </div>

        {/* Discuss it */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <Stethoscope className="h-3.5 w-3.5 text-primary/50" />
            <span className="text-xs font-medium text-foreground/80">Discuss it</span>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Questions to bring to your next appointment — pre-filled with your metrics:
          </p>
          <ul className="space-y-1.5">
            {clinicianQuestions.map((q, i) => (
              <li key={i} className="text-[11px] leading-relaxed text-muted-foreground/80 italic">
                &ldquo;{q}&rdquo;
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-1 inline-flex items-center gap-1 self-start rounded border border-border/50 bg-card px-2 py-1 text-[10px] font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            aria-label="Copy clinician questions to clipboard"
          >
            {copied ? (
              <>
                <Check className="h-2.5 w-2.5 text-emerald-500" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-2.5 w-2.5" />
                Copy list
              </>
            )}
          </button>
        </div>

      </div>

      {/* Footer actions */}
      <div className="mt-4 flex items-center gap-3 border-t border-border/30 pt-3">
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
