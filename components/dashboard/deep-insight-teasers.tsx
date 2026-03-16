'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Sparkles, Lock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/analytics';
import type { NightResult } from '@/lib/types';

interface Props {
  /** Current night data for contextual teaser titles */
  night?: NightResult;
}

/**
 * Locked "deep insight" teasers shown to free users after AI insights load.
 * Dynamically generates teaser titles based on the user's actual data
 * to make the premium value concrete.
 */
export function DeepInsightTeasers({ night }: Props) {
  const tracked = useRef(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!tracked.current) {
      events.deepTeaserShown();
      tracked.current = true;
    }
  }, []);

  if (dismissed) return null;

  // Build contextual teasers based on the user's data
  const teasers: { title: string; desc: string }[] = [];

  if (night) {
    if (night.ned.reraIndex > 5) {
      teasers.push({
        title: 'Your RERA patterns across the night',
        desc: `With ${night.ned.reraIndex.toFixed(1)} RERAs/hr, waveform analysis can reveal when they cluster...`,
      });
    }
    if (Math.abs((night.ned.h1NedMean ?? 0) - (night.ned.h2NedMean ?? 0)) > 5) {
      teasers.push({
        title: 'First-half vs second-half breathing changes',
        desc: 'Your breathing effort shifts significantly during the night...',
      });
    }
    if (night.wat.flScore > 30) {
      teasers.push({
        title: 'What is driving your flow limitation',
        desc: `At ${night.wat.flScore.toFixed(0)}% FL Score, individual breath analysis can identify the obstruction type...`,
      });
    }
  }

  // Fill with defaults if we don't have enough data-specific teasers
  if (teasers.length < 2) {
    if (!teasers.some((t) => t.title.includes('Breath Pattern'))) {
      teasers.push({
        title: 'Breath Pattern Classification',
        desc: 'Individual breath shapes analysed for obstruction type...',
      });
    }
    if (!teasers.some((t) => t.title.includes('Temporal'))) {
      teasers.push({
        title: 'Temporal FL Clustering',
        desc: 'When flow limitation episodes cluster during the night...',
      });
    }
  }

  const shown = teasers.slice(0, 2);

  return (
    <div className="relative flex flex-col gap-3 rounded-xl border border-primary/10 bg-primary/[0.02] px-4 pb-4 pt-3">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground/70 transition-colors hover:text-muted-foreground"
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
        individual breaths that numbers alone can&apos;t show.
      </p>

      {/* Locked deep insight cards */}
      <div className="flex flex-col gap-2">
        {shown.map((teaser) => (
          <div key={teaser.title} className="relative overflow-hidden rounded-lg border border-primary/10 bg-primary/[0.03] px-4 py-3">
            <div className="flex items-start gap-2.5">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary/30" />
              <div>
                <p className="text-sm font-medium text-foreground/60">{teaser.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground/70">{teaser.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Link
        href="/pricing"
        onClick={() => events.deepTeaserCtaClicked()}
      >
        <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto">
          See supporter benefits
        </Button>
      </Link>
    </div>
  );
}
