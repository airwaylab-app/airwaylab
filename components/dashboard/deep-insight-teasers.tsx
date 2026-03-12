'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/analytics';

/**
 * Locked "deep insight" teasers shown to free users after AI insights load.
 * Nudges upgrade with waveform-level analysis value prop.
 */
export function DeepInsightTeasers() {
  const tracked = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!tracked.current) {
      events.deepTeaserShown();
      tracked.current = true;
    }
  }, []);

  if (dismissed) return null;

  return (
    <div className="relative flex flex-col gap-3 rounded-xl border border-primary/10 bg-primary/[0.02] px-4 pb-4 pt-3">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground/30 transition-colors hover:text-muted-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>

      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary/60" />
        <h3 className="text-sm font-medium text-foreground">Waveform-Level Analysis</h3>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        These insights use your aggregate scores. Waveform analysis detects patterns in
        individual breaths — RERA clusters, positional transitions, and progressive flow
        limitation that numbers alone can&apos;t show.
      </p>

      {/* Locked deep insight cards */}
      <div className="flex flex-col gap-2">
        <div className="relative overflow-hidden rounded-lg border border-primary/10 bg-primary/[0.03] px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary/30" />
            <div>
              <p className="text-sm font-medium text-foreground/60">Breath Pattern Classification</p>
              <p className="mt-0.5 text-xs text-muted-foreground/50">
                Individual breath shapes analysed for obstruction type...
              </p>
            </div>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-lg border border-primary/10 bg-primary/[0.03] px-4 py-3">
          <div className="flex items-start gap-2.5">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary/30" />
            <div>
              <p className="text-sm font-medium text-foreground/60">Temporal FL Clustering</p>
              <p className="mt-0.5 text-xs text-muted-foreground/50">
                When flow limitation episodes cluster during the night...
              </p>
            </div>
          </div>
        </div>
      </div>

      <Link
        href="/pricing"
        onClick={() => events.deepTeaserCtaClicked()}
      >
        <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto">
          Upgrade to Supporter for deep analysis
        </Button>
      </Link>
    </div>
  );
}
