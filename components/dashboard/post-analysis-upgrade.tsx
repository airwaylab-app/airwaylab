'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sparkles, X, TrendingUp, Cloud } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { events } from '@/lib/analytics';

const STORAGE_KEY = 'airwaylab_post_analysis_upgrade_dismissed';

interface Props {
  isComplete: boolean;
}

/**
 * One-time upgrade nudge shown after a user's first successful analysis.
 * Only appears for community-tier users who haven't dismissed it.
 * Designed to surface at the peak value moment — right after seeing results.
 */
export function PostAnalysisUpgrade({ isComplete }: Props) {
  const { tier } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isComplete || tier !== 'community') return;

    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return;
    } catch {
      return;
    }

    // Small delay so it doesn't compete with the walkthrough prompt
    const timer = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(timer);
  }, [isComplete, tier]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* noop */ }
    events.upgradeNudgeDismissed('post_analysis');
  };

  return (
    <div className="animate-fade-in-up rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.06] to-transparent px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-semibold text-foreground">Your analysis is ready</h3>
            <button
              onClick={dismiss}
              className="rounded p-2.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              aria-label="Dismiss upgrade prompt"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            You just got Glasgow Index, flow limitation scores, and RERA detection — free, in your browser.
            Want to go deeper?
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 shrink-0 text-primary/50" />
              <span>AI-powered therapy insights</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <TrendingUp className="h-3 w-3 shrink-0 text-primary/50" />
              <span>90-night trend tracking</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Cloud className="h-3 w-3 shrink-0 text-primary/50" />
              <span>90-day analysis history</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              onClick={() => events.upgradeNudgeClicked('post_analysis')}
            >
              See supporter benefits
            </Link>
            <button
              onClick={dismiss}
              className="text-[11px] text-muted-foreground/50 transition-colors hover:text-muted-foreground"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
