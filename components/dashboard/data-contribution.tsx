'use client';

import { useState, useCallback, useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import { Users, Loader2, X, Shield, Heart, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/analytics';
import { contributeNights, trackContributedDates } from '@/lib/contribute';
import { getConsentState, setConsentState } from '@/components/upload/contribution-consent-utils';
import type { NightResult } from '@/lib/types';

const DISMISS_KEY = 'airwaylab_contribute_dismissed';

export type AutoSubmitStatus = 'idle' | 'sending' | 'success' | 'error';

interface Props {
  nights: NightResult[];
  isDemo?: boolean;
  /** Status of auto-contribution triggered by analyze/page.tsx for opted-in users */
  autoSubmitStatus?: AutoSubmitStatus;
  /** Number of new nights sent by auto-submit (for display) */
  autoSubmitCount?: number;
}

/**
 * Opt-in anonymous data contribution banner.
 * Shown after analysis completes. Dismissible, remembers choice.
 *
 * For opted-in users (airwaylab_contribute_optin === '1'), the banner
 * shows auto-contribution status instead of a manual submit button.
 * The manual UI is only shown for users who haven't opted in.
 */
export function DataContribution({
  nights,
  isDemo = false,
  autoSubmitStatus = 'idle',
  autoSubmitCount = 0,
}: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Check persistent consent state
  const [isOptedIn] = useState(() => {
    if (typeof window === 'undefined') return false;
    return getConsentState();
  });

  // Track which nights were previously contributed (date-based dedup)
  const [contributedDates] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('airwaylab_contributed_dates') || '[]');
    } catch {
      return [];
    }
  });
  const contributedNightCount = contributedDates.length;

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [expanded, setExpanded] = useState(false);
  const [contributionCount, setContributionCount] = useState<number | null>(null);

  // Fetch community contribution count for social proof
  useEffect(() => {
    fetch('/api/stats', { signal: AbortSignal.timeout(3000) })
      .then((r) => { if (!r.ok) throw new Error('Failed to fetch stats'); return r.json(); })
      .then((data) => {
        setContributionCount(data.totalContributions ?? 0);
      })
      .catch(() => { /* non-critical */ });
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    events.contributionDismissed();
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch { /* noop */ }
  }, []);

  const handleContribute = useCallback(async () => {
    setStatus('sending');
    try {
      await contributeNights(nights);
      setStatus('success');
      events.contributionOptedIn();
      trackContributedDates(nights);
      // Persist opt-in so the user isn't prompted again on future visits
      setConsentState(true);
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'contribute-data' } });
      setStatus('error');
    }
  }, [nights]);

  // Check if user has new data beyond what they already contributed (date-based)
  const contributedSet = new Set(contributedDates);
  const hasNewData = nights.some((n) => !contributedSet.has(n.dateStr));

  // Don't show if dismissed this session, or if no new data to contribute (for real uploads)
  if (dismissed || (!isDemo && !hasNewData && contributedNightCount > 0)) {
    // Exception: opted-in users still see the auto-contribution status if in-flight or just succeeded
    if (!isOptedIn || autoSubmitStatus === 'idle') return null;
  }

  // Demo mode — show teaser encouraging real upload
  if (isDemo) {
    return (
      <div className="rounded-lg border border-primary/10 bg-primary/[0.02] px-4 py-3 animate-fade-in-up">
        <div className="flex items-start gap-3">
          <Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary/50" />
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-muted-foreground">
              Help build the largest PAP therapy dataset
            </p>
            <p className="text-xs text-muted-foreground/70">
              Upload your own SD card data to contribute anonymised scores to the research dataset.
              {contributionCount !== null && contributionCount > 0 && (
                <span className="ml-1 text-primary/60">
                  {contributionCount} user{contributionCount !== 1 ? 's have' : ' has'} already contributed.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Opted-in path: show auto-contribution status ──────────
  if (isOptedIn) {
    // Auto-submit in flight
    if (autoSubmitStatus === 'sending') {
      return (
        <div aria-live="polite" className="rounded-lg border border-primary/10 bg-primary/[0.02] px-4 py-3 animate-fade-in-up">
          <div className="flex items-center gap-2.5">
            <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
            <p className="text-sm text-muted-foreground">
              Contributing new data...
            </p>
          </div>
        </div>
      );
    }

    // Auto-submit succeeded
    if (autoSubmitStatus === 'success') {
      return (
        <div aria-live="polite" className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 animate-fade-in-up">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <p className="text-sm text-muted-foreground">
              {autoSubmitCount === 1
                ? '1 new night contributed automatically'
                : `${autoSubmitCount} new nights contributed automatically`}
              {' '}&mdash; thank you
            </p>
          </div>
        </div>
      );
    }

    // Auto-submit failed — fall back to manual retry
    if (autoSubmitStatus === 'error') {
      return (
        <div aria-live="polite" className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 animate-fade-in-up">
          <div className="flex items-center gap-2.5">
            <Heart className="h-4 w-4 text-red-400" />
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Auto-contribution failed.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="h-6 text-xs"
                onClick={handleContribute}
                disabled={status === 'sending'}
              >
                {status === 'sending' ? (
                  <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Retrying...</>
                ) : (
                  'Tap to retry'
                )}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    // Auto-submit idle + no new data → don't show anything
    return null;
  }

  // ── Not opted-in path: manual contribution UI ─────────────

  // Success state (from manual contribution)
  if (status === 'success') {
    return (
      <div aria-live="polite" className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 animate-fade-in-up">
        <div className="flex items-center gap-2.5">
          <Heart className="h-4 w-4 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Thank you for contributing!
            </p>
            <p className="text-xs text-muted-foreground">
              {nights.length} night{nights.length !== 1 ? 's' : ''} of anonymised data submitted.
              You&apos;re helping build the largest PAP flow limitation dataset.
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground/70">
              Upload more data anytime to contribute additional nights.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Returning contributor state — user has contributed before but has new data
  const isReturning = contributedNightCount > 0;

  return (
    <div className="relative rounded-lg border border-primary/20 bg-primary/[0.04] px-4 py-3 animate-fade-in-up">
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground/80 transition-colors hover:text-muted-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <Heart className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm font-medium">
              {isReturning
                ? 'Contribute your new data'
                : 'Help build the largest PAP therapy dataset'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isReturning ? (
                <>
                  You&apos;ve previously contributed {contributedNightCount} night{contributedNightCount !== 1 ? 's' : ''}.
                  Share your latest analysis to keep the dataset growing.
                </>
              ) : (
                <>
                  Contribute your anonymised scores to improve flow limitation analysis for everyone.
                  {contributionCount !== null && contributionCount > 0 ? (
                    <span className="ml-1 text-primary/70">
                      {contributionCount} other{contributionCount !== 1 ? 's have' : ' has'} already contributed.
                    </span>
                  ) : (
                    <span className="ml-1 text-primary/70">
                      Be among the first to contribute.
                    </span>
                  )}
                </>
              )}
            </p>
          </div>

          {/* What gets shared (expandable) */}
          {!isReturning && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
            >
              <Shield className="h-3 w-3" />
              {expanded ? 'Hide details' : 'What gets shared?'}
            </button>
          )}

          {expanded && (
            <div className="rounded-md border border-border/30 bg-background/50 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground/80 mb-1">What gets shared (anonymised):</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Analysis scores (Glasgow, Flow Limitation, NED, RERA)</li>
                <li>Breathing pattern data (flow waveforms, for AI training)</li>
                <li>Machine settings (mode, pressures — no serial numbers)</li>
                <li>Oximetry summary metrics (if uploaded)</li>
                <li>Duration and session count</li>
              </ul>
              <p className="mt-1.5 font-medium text-foreground/80">Never shared:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Names, dates of birth, or any personal information</li>
                <li>IP addresses or device identifiers</li>
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={handleContribute}
              disabled={status === 'sending'}
            >
              {status === 'sending' ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> Submitting…
                </>
              ) : status === 'error' ? (
                'Retry'
              ) : (
                <>
                  <Users className="h-3 w-3" />
                  Contribute {nights.length} night{nights.length !== 1 ? 's' : ''} anonymously
                </>
              )}
            </Button>
            {status === 'error' && (
              <span aria-live="polite" className="text-[10px] text-red-400">
                Something went wrong — please try again.
              </span>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground/70">
            One click · No account needed · Cannot be traced back to you
          </p>
        </div>
      </div>
    </div>
  );
}
