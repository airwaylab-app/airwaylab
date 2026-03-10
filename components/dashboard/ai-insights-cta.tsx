'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { events } from '@/lib/analytics';
import { getAIRemaining } from '@/lib/auth/feature-gate';

interface Props {
  isDemo?: boolean;
  /** Server-synced remaining credits. Falls back to localStorage if undefined. */
  remainingCredits?: number;
}

/**
 * Contextual CTA below AI insights explaining costs and encouraging support.
 *
 * Four states:
 * - Demo mode: explain AI is funded out of pocket, nudge to upload own data
 * - Community tier (credits remaining): show remaining, explain community funding
 * - Community tier (credits exhausted): warm message, nudge to support
 * - Paid users: hidden
 */
export function AIInsightsCTA({ isDemo = false, remainingCredits }: Props) {
  const { tier, isPaid } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isPaid && !dismissed) {
      events.aiUpsellShown();
    }
  }, [isPaid, dismissed]);

  // Don't show to paid users or if dismissed this session
  if (isPaid) return null;
  if (dismissed) return null;

  // Use server value when available, fall back to localStorage
  const aiRemaining = remainingCredits ?? getAIRemaining(tier);

  return (
    <div className="relative flex items-start gap-2 rounded-md border border-primary/10 bg-primary/[0.03] px-3 py-2">
      <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary/50" />

      <div className="min-w-0 flex-1 text-[11px] leading-relaxed text-muted-foreground/70">
        {isDemo ? (
          <p>
            These AI insights are powered by Claude and funded out of pocket to keep AirwayLab free for everyone.{' '}
            <Link
              href="/analyze"
              className="font-medium text-primary/70 underline underline-offset-2 hover:text-primary"
            >
              Upload your own data
            </Link>{' '}
            to get personalised analysis of your therapy.
          </p>
        ) : aiRemaining > 0 ? (
          <p>
            Each AI analysis is funded out of pocket to keep AirwayLab free.
            <span className="font-medium text-foreground/60">
              {' '}{aiRemaining} free {aiRemaining === 1 ? 'analysis' : 'analyses'} left this month.
            </span>{' '}
            <Link
              href="/pricing"
              className="font-medium text-primary/70 underline underline-offset-2 hover:text-primary"
            >
              Support the project
            </Link>{' '}
            to help keep it running.
          </p>
        ) : (
          <p>
            You&apos;ve used your 3 free AI analyses this month. They reset next month.{' '}
            <Link
              href="/pricing"
              className="font-medium text-primary/70 underline underline-offset-2 hover:text-primary"
            >
              Become a supporter
            </Link>{' '}
            for unlimited AI analysis — and help fund AirwayLab for the whole community.
          </p>
        )}
      </div>

      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 rounded p-0.5 text-muted-foreground/30 transition-colors hover:text-muted-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
