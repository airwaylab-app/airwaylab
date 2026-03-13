'use client';

import { useState } from 'react';
import { ChevronRight, Stethoscope, Copy, Check } from 'lucide-react';
import { getTrafficDotColor } from '@/lib/thresholds';
import {
  generateClinicianQuestions,
  formatQuestionsForClipboard,
  type ClinicianQuestion,
} from '@/lib/clinician-questions';
import type { NightResult } from '@/lib/types';

interface Props {
  nights: NightResult[];
  selectedNight: NightResult;
  previousNight: NightResult | null;
  therapyChangeDate: string | null;
}

export function ClinicianQuestionsPanel({
  nights,
  selectedNight,
  previousNight,
  therapyChangeDate,
}: Props) {
  const [copied, setCopied] = useState(false);

  let questions: ClinicianQuestion[];
  try {
    questions = generateClinicianQuestions(
      nights,
      selectedNight,
      previousNight,
      therapyChangeDate
    );
  } catch (err) {
    console.error('[AirwayLab] Failed to generate clinician questions:', err);
    return null;
  }

  const count = questions.length;

  async function handleCopy() {
    const text = formatQuestionsForClipboard(questions, selectedNight.dateStr);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: create temporary textarea
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        console.error('[AirwayLab] Clipboard API unavailable');
      }
      document.body.removeChild(textarea);
    }
  }

  // All metrics green — show minimal message
  if (count === 0) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/30 px-4 py-3">
        <Stethoscope className="h-4 w-4 shrink-0 text-emerald-500/70" />
        <p className="text-xs text-muted-foreground">
          Your metrics are in the healthy range. No specific questions to flag
          for your clinician right now.
        </p>
      </div>
    );
  }

  return (
    <details className="group rounded-xl border border-border/50 bg-card/30">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        <Stethoscope className="h-4 w-4" />
        <span>Prepare for Your Appointment</span>
        <span className="ml-auto inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {count} {count === 1 ? 'question' : 'questions'}
        </span>
      </summary>

      <div className="flex flex-col gap-3 border-t border-border/30 px-4 pb-4 pt-3">
        {/* Question cards */}
        {questions.map((q) => (
          <div
            key={q.id}
            className="flex items-start gap-3 rounded-lg border border-border/30 bg-card/50 px-4 py-3"
          >
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${getTrafficDotColor(q.urgency)}`}
              aria-label={
                q.urgency === 'bad'
                  ? 'Discuss soon'
                  : q.urgency === 'warn'
                    ? 'Worth mentioning'
                    : 'Informational'
              }
            />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{q.stem}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {q.rationale}
              </p>
            </div>
          </div>
        ))}

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              Copied to clipboard
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy for appointment
            </>
          )}
        </button>

        {/* Medical disclaimer */}
        <p className="text-[10px] leading-relaxed text-muted-foreground/60">
          AirwayLab is not a medical device. These questions are generated from
          your data to support conversations with your sleep specialist — they
          are not clinical recommendations. Always discuss changes to your
          therapy with your clinician.
        </p>
      </div>
    </details>
  );
}
