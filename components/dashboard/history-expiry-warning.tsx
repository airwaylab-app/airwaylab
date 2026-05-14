'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { getAnalysisWindowDays } from '@/lib/auth/feature-gate';
import { events } from '@/lib/analytics';
import type { NightResult } from '@/lib/types';

const STORAGE_KEY = 'airwaylab_history_expiry_dismissed';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const COMMUNITY_STORAGE_KEY = 'airwaylab_community_window_dismissed';
const COMMUNITY_DISMISS_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const WARNING_WINDOW_DAYS = 15;

interface Props {
  nights: NightResult[];
  hiddenNightCount?: number;
}

/**
 * Amber banner warning Supporter-tier users when their oldest analyses
 * approach the 90-day history window. Nudges toward Champion (lifetime).
 * Shows 15 days before first expiry. Dismissible with 7-day TTL.
 *
 * Also renders a slate/blue informational banner for Community-tier users
 * when nights are hidden by the 14-day window.
 */
export function HistoryExpiryWarning({ nights, hiddenNightCount }: Props) {
  const { tier } = useAuth();

  const [dismissed, setDismissed] = useState(() => {
    try {
      const ts = localStorage.getItem(STORAGE_KEY);
      if (!ts) return false;
      return Date.now() - Number(ts) < DISMISS_TTL_MS;
    } catch {
      return false;
    }
  });

  const [communityDismissed, setCommunityDismissed] = useState(() => {
    try {
      const ts = localStorage.getItem(COMMUNITY_STORAGE_KEY);
      if (!ts) return false;
      return Date.now() - Number(ts) < COMMUNITY_DISMISS_TTL_MS;
    } catch {
      return false;
    }
  });

  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (tier !== 'supporter' || nights.length === 0) {
      setDaysLeft(null);
      return;
    }

    const windowDays = getAnalysisWindowDays(tier);
    if (!isFinite(windowDays) || windowDays <= 0) {
      setDaysLeft(null);
      return;
    }

    // Find oldest night date
    const oldestDate = nights.reduce((oldest, n) => {
      const d = new Date(n.dateStr);
      return d < oldest ? d : oldest;
    }, new Date(nights[0]!.dateStr));

    const daysSinceOldest = Math.floor(
      (Date.now() - oldestDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    const remaining = windowDays - daysSinceOldest;

    // Only show within warning window
    if (remaining > WARNING_WINDOW_DAYS || remaining < 0) {
      setDaysLeft(null);
      return;
    }
    setDaysLeft(Math.max(0, remaining));
  }, [tier, nights]);

  // Community banner
  if (tier === 'community' && (hiddenNightCount ?? 0) > 0 && !communityDismissed) {
    const dismissCommunity = () => {
      setCommunityDismissed(true);
      try {
        localStorage.setItem(COMMUNITY_STORAGE_KEY, String(Date.now()));
      } catch { /* noop */ }
      events.upgradeNudgeDismissed('community_window');
    };

    return (
      <div className="animate-fade-in-up rounded-xl border border-blue-500/20 bg-blue-500/[0.06] px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
            <Clock className="h-4 w-4 text-blue-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                You&apos;re viewing the last 14 nights of history. Upgrade to Supporter to see 90 days.
              </h3>
              <button
                onClick={dismissCommunity}
                className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
                aria-label="Dismiss for now"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="mt-3">
              <Link
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400 transition-colors hover:bg-blue-500/20"
                onClick={() => events.upgradeNudgeClicked('community_window')}
              >
                See full history
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (tier !== 'supporter' || daysLeft === null || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch { /* noop */ }
    events.upgradeNudgeDismissed('history_expiry');
  };

  const message =
    daysLeft === 0
      ? 'Your earliest analyses are expiring today.'
      : daysLeft === 1
        ? 'Your earliest analysis expires tomorrow.'
        : `Your earliest analyses expire in ${daysLeft} days.`;

  return (
    <div className="animate-fade-in-up rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
          <Clock className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              {message}
            </h3>
            <button
              onClick={dismiss}
              className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              aria-label="Dismiss for now"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Champions keep everything forever. Never lose a night of analysis history.
          </p>
          <div className="mt-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/20"
              onClick={() => events.upgradeNudgeClicked('history_expiry')}
            >
              Keep your history
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
