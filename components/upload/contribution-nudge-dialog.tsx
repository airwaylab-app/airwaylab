'use client';

import { Heart, Shield, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Modal shown after analysis completes when the user has NOT opted in to
 * data contribution. Gives them one last chance to contribute their
 * anonymised scores. Dismiss = no contribution, no hard feelings.
 */
export function ContributionNudgeDialog({
  nightCount,
  onContribute,
  onDismiss,
}: {
  nightCount: number;
  onContribute: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-background/70 backdrop-blur-sm">
      <div className="relative mx-4 flex max-w-lg flex-col items-center gap-5 rounded-2xl border border-primary/20 bg-card p-8 text-center shadow-2xl">
        <button
          onClick={onDismiss}
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-muted-foreground"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="rounded-full bg-primary/10 p-3.5">
          <Heart className="h-7 w-7 text-primary" />
        </div>

        <div>
          <h2 className="text-lg font-bold">
            Your {nightCount} {nightCount === 1 ? 'night' : 'nights'} could help thousands
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            We&apos;re building the largest PAP therapy dataset so patients and researchers can finally
            benchmark therapy outcomes. Your anonymised scores would make a real difference — no
            raw data leaves your device, ever.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            className="gap-2 shadow-glow sm:w-auto"
            onClick={onContribute}
          >
            <Heart className="h-4 w-4" />
            Yes, contribute my scores
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="text-muted-foreground sm:w-auto"
            onClick={onDismiss}
          >
            Not this time
          </Button>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
          <Shield className="h-3 w-3" />
          <span>Fully anonymous · No raw data · Cannot be traced to you</span>
        </div>
      </div>
    </div>
  );
}
