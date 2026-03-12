'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { events } from '@/lib/analytics';

interface Props {
  nightCount: number;
  isReturning: boolean;
  onRegister: () => void;
}

/**
 * Locked/skeleton AI insight cards shown to anonymous users.
 * Nudges registration with clear value prop.
 */
export function AILockedTeasers({ nightCount, isReturning, onRegister }: Props) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!tracked.current) {
      events.aiTeaserShown(nightCount, isReturning);
      tracked.current = true;
    }
  }, [nightCount, isReturning]);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-card/30 px-4 pb-4 pt-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">AI-Powered Insights</h3>
      </div>

      <p className="text-xs leading-relaxed text-muted-foreground">
        AirwayLab&apos;s AI finds cross-engine correlations, H1/H2 shifts, and therapy setting
        patterns that rule-based analysis can&apos;t detect.
      </p>

      {/* Skeleton insight cards */}
      <div className="flex flex-col gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="relative overflow-hidden rounded-lg border border-border/30 bg-muted/10 px-4 py-3"
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 h-4 w-4 rounded-full skeleton-shimmer" />
              <div className="min-w-0 flex-1">
                <div className="h-3.5 w-32 rounded skeleton-shimmer" />
                <div className="mt-2 h-3 w-full rounded skeleton-shimmer" />
                <div className="mt-1 h-3 w-3/4 rounded skeleton-shimmer" />
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
              <Lock className="h-4 w-4 text-muted-foreground/40" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-2 pt-1">
        <Button
          onClick={() => {
            events.aiTeaserCtaClicked();
            onRegister();
          }}
          className="w-full gap-2 sm:w-auto"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Create a free account for AI insights
        </Button>
        <p className="text-center text-[11px] text-muted-foreground/60">
          Also: never re-upload your SD card again. Free, no credit card required.
        </p>
      </div>
    </div>
  );
}
