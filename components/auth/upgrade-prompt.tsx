'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Heart, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { getAIRemaining } from '@/lib/auth/feature-gate';

interface Props {
  /** What feature triggered this prompt */
  feature: string;
  /** Compact inline variant vs full card */
  variant?: 'card' | 'inline';
  /** Server-synced remaining credits. Falls back to localStorage if undefined. */
  remainingCredits?: number;
}

/**
 * Community-framing upgrade prompt.
 * NOT transactional SaaS language — uses "support", "fund development".
 */
export function UpgradePrompt({ feature, variant = 'card', remainingCredits }: Props) {
  const { tier, user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Don't show to paid users
  if (tier !== 'community') return null;
  if (dismissed) return null;

  // Use server value when available, fall back to localStorage
  const aiRemaining = remainingCredits ?? getAIRemaining(tier);

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 rounded-md bg-primary/[0.04] px-3 py-2 text-xs text-muted-foreground">
        <Heart className="h-3 w-3 shrink-0 text-primary/60" />
        <span>
          {feature}.{' '}
          <Link href="/pricing" className="font-medium text-primary hover:underline">
            Support AirwayLab
          </Link>{' '}
          to unlock this and fund continued development.
        </span>
      </div>
    );
  }

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
        <Heart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
        <div className="flex flex-col gap-1.5">
          <p className="text-xs leading-snug text-muted-foreground">
            <span className="font-medium text-foreground/80">{feature}</span>
          </p>

          {user && aiRemaining > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
              <Sparkles className="h-2.5 w-2.5" />
              {aiRemaining} free AI {aiRemaining === 1 ? 'analysis' : 'analyses'} remaining this month
            </div>
          )}

          <p className="text-[10px] leading-snug text-muted-foreground/60">
            Supporter contributions fund AirwayLab&apos;s continued development as a free, open-source tool.{' '}
            <Link
              href="/pricing"
              className="font-medium text-primary/70 underline underline-offset-2 hover:text-primary"
            >
              See how you can help
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
