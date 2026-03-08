'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { EmailOptIn } from '@/components/common/email-opt-in';

interface Props {
  /** Short feature description, e.g. "PDF reports with clinical notes" */
  feature: string;
  /** Context for analytics */
  source: string;
}

/**
 * Subtle "coming soon" tease for future premium features.
 * Dismisses on X click. Shows email opt-in on "Notify me".
 */
export function ProTease({ feature, source }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const [showOptIn, setShowOptIn] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative rounded-lg border border-primary/10 bg-primary/[0.03] px-4 py-3">
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-2 rounded p-0.5 text-muted-foreground/40 transition-colors hover:text-muted-foreground"
        aria-label="Dismiss"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="flex items-start gap-2.5 pr-6">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
        <div className="flex flex-col gap-1.5">
          <p className="text-xs leading-snug text-muted-foreground">
            <span className="font-medium text-foreground/80">Coming soon:</span>{' '}
            {feature}
          </p>
          {!showOptIn ? (
            <button
              onClick={() => setShowOptIn(true)}
              className="self-start text-[11px] text-primary/70 underline underline-offset-2 transition-colors hover:text-primary"
            >
              Notify me when it launches
            </button>
          ) : (
            <div className="mt-1">
              <EmailOptIn variant="inline" source={`pro-tease-${source}`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
