'use client';

import { useState, useCallback, useEffect } from 'react';
import { Users, Loader2, X, Shield, Heart, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NightResult } from '@/lib/types';
import { getAnonymousToken } from '@/lib/anonymous-token';

const DISMISS_KEY = 'airwaylab-contribute-dismissed';
const CONTRIBUTED_NIGHTS_KEY = 'airwaylab-contributed-nights';

interface Props {
  nights: NightResult[];
  isDemo?: boolean;
  therapyChangeDate?: string | null;
}

/**
 * Opt-in anonymous data contribution banner.
 * Shown after analysis completes. Dismissible, remembers choice.
 * Tracks how many nights were previously contributed so users
 * can contribute again when they upload new data.
 */
export function DataContribution({ nights, isDemo = false, therapyChangeDate = null }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Track which nights were previously contributed (date-based dedup)
  const [contributedDates] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem('airwaylab-contributed-dates') || '[]');
    } catch {
      return [];
    }
  });
  const contributedNightCount = contributedDates.length;

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [expanded, setExpanded] = useState(false);
  const [contributionCount, setContributionCount] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);

  // Fetch community contribution count for social proof
  useEffect(() => {
    fetch('/api/stats', { signal: AbortSignal.timeout(3000) })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setContributionCount(data.totalContributions ?? 0);
      })
      .catch(() => { /* non-critical */ });
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch { /* noop */ }
  }, []);

  const handleContribute = useCallback(async () => {
    setStatus('sending');
    try {
      // Cap at 365 most recent nights to stay within server limits
      const toSubmit = nights.length > 365
        ? nights.slice(0, 365)
        : nights;

      // Build therapy change metadata if a therapy change date was set
      let therapyChange = null;
      if (therapyChangeDate) {
        const changeIdx = toSubmit.findIndex((n) => n.dateStr === therapyChangeDate);
        if (changeIdx >= 0 && changeIdx < toSubmit.length - 1) {
          const nightBefore = toSubmit[changeIdx + 1]; // nights are most-recent-first
          therapyChange = {
            changeNightIndex: changeIdx,
            settingsBefore: nightBefore ? {
              epap: nightBefore.settings.epap,
              ipap: nightBefore.settings.ipap,
              pressureSupport: nightBefore.settings.pressureSupport,
              papMode: nightBefore.settings.papMode,
            } : undefined,
          };
        }
      }

      const res = await fetch('/api/contribute-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nights: toSubmit,
          sleepQuality,
          therapyChange,
          anonymousToken: getAnonymousToken(),
        }),
      });

      if (res.ok) {
        setStatus('success');
        try {
          const storedDates: string[] = JSON.parse(localStorage.getItem('airwaylab-contributed-dates') || '[]');
          const dateSet = new Set(storedDates);
          for (const n of nights) dateSet.add(n.dateStr);
          const updated = Array.from(dateSet);
          localStorage.setItem('airwaylab-contributed-dates', JSON.stringify(updated));
          localStorage.setItem(CONTRIBUTED_NIGHTS_KEY, String(updated.length));
        } catch { /* noop */ }
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, [nights, sleepQuality, therapyChangeDate]);

  // Check if user has new data beyond what they already contributed (date-based)
  const contributedSet = new Set(contributedDates);
  const hasNewData = nights.some((n) => !contributedSet.has(n.dateStr));

  // Don't show if dismissed this session, or if no new data to contribute (for real uploads)
  if (dismissed || (!isDemo && !hasNewData && contributedNightCount > 0)) return null;

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

  // Success state
  if (status === 'success') {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 animate-fade-in-up">
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
            <p className="mt-1 text-[10px] text-muted-foreground/50">
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
        className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
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

          {/* Sleep quality rating */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">How did you sleep?</span>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSleepQuality(sleepQuality === val ? null : val);
                  }}
                  className="rounded p-0.5 transition-colors hover:bg-primary/10"
                  aria-label={`Rate sleep quality ${val} out of 5`}
                >
                  <Star
                    className={`h-4 w-4 transition-colors ${
                      sleepQuality !== null && val <= sleepQuality
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {sleepQuality !== null && (
              <span className="text-[10px] text-muted-foreground/60">
                {sleepQuality}/5
              </span>
            )}
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
              <p className="font-medium text-foreground/80 mb-1">Only anonymised metrics are shared:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Analysis scores (Glasgow, Flow Limitation, NED, RERA)</li>
                <li>Machine settings (mode, pressures — no serial numbers)</li>
                <li>Oximetry summary metrics (if uploaded)</li>
                <li>Duration, session count, and time gaps between nights</li>
                <li>Your sleep quality rating (if provided)</li>
                <li>Therapy change context (if a settings change was marked)</li>
              </ul>
              <p className="mt-1.5 font-medium text-foreground/80">Never shared:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Raw breathing waveforms or SD card files</li>
                <li>Dates, names, or any personal information</li>
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
              <span className="text-[10px] text-red-400">
                Something went wrong — please try again.
              </span>
            )}
          </div>

          <p className="text-[10px] text-muted-foreground/50">
            One click · No account needed · Cannot be traced back to you
          </p>
        </div>
      </div>
    </div>
  );
}
