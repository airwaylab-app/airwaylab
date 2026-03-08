'use client';

import { useState, useCallback } from 'react';
import { Users, Check, Loader2, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { NightResult } from '@/lib/types';

const DISMISS_KEY = 'airwaylab-contribute-dismissed';
const CONTRIBUTED_KEY = 'airwaylab-contributed';

interface Props {
  nights: NightResult[];
  isDemo?: boolean;
}

/**
 * Opt-in anonymous data contribution banner.
 * Shown after analysis completes. Dismissible, remembers choice.
 * Users can contribute their anonymised metrics to help
 * improve analysis algorithms and therapy insights.
 */
export function DataContribution({ nights }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return sessionStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [alreadyContributed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(CONTRIBUTED_KEY) === '1';
    } catch {
      return false;
    }
  });

  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [expanded, setExpanded] = useState(false);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch { /* noop */ }
  }, []);

  const handleContribute = useCallback(async () => {
    setStatus('sending');
    try {
      const res = await fetch('/api/contribute-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nights }),
      });

      if (res.ok) {
        setStatus('success');
        try {
          localStorage.setItem(CONTRIBUTED_KEY, '1');
        } catch { /* noop */ }
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }, [nights]);

  // Don't show if already contributed or dismissed
  if (dismissed || alreadyContributed) return null;

  // Success state
  if (status === 'success') {
    return (
      <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 animate-fade-in-up">
        <div className="flex items-center gap-2.5">
          <Check className="h-4 w-4 text-emerald-500" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Thank you for contributing!
            </p>
            <p className="text-xs text-muted-foreground">
              {nights.length} night{nights.length !== 1 ? 's' : ''} of anonymised data submitted.
              Your contribution helps improve therapy analysis for everyone.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg border border-primary/15 bg-primary/[0.03] px-4 py-3 animate-fade-in-up">
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
        <div className="flex flex-col gap-2">
          <div>
            <p className="text-sm font-medium">Help improve CPAP analysis</p>
            <p className="text-xs text-muted-foreground">
              Submit your breathing data anonymously to help us improve analysis algorithms
              and build better therapy insights for everyone.
            </p>
          </div>

          {/* What gets shared (expandable) */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] text-primary/70 hover:text-primary transition-colors"
          >
            <Shield className="h-3 w-3" />
            {expanded ? 'Hide details' : 'What gets shared?'}
          </button>

          {expanded && (
            <div className="rounded-md border border-border/30 bg-background/50 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground/80 mb-1">Only anonymised metrics are shared:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Analysis scores (Glasgow, Flow Limitation, NED, RERA)</li>
                <li>Machine settings (mode, pressures — no serial numbers)</li>
                <li>Oximetry summary metrics (if uploaded)</li>
                <li>Duration and session count</li>
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
              variant="outline"
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
            100% voluntary · No account needed · Data cannot be traced back to you
          </p>
        </div>
      </div>
    </div>
  );
}
