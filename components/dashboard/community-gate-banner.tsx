'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { events } from '@/lib/analytics';
import type { NightResult } from '@/lib/types';

const SESSION_KEY = 'airwaylab_community_gate_banner_dismissed';
const COMMUNITY_TIER_LIMIT = 7;
// Evaluated once at module load — sessions after gate date never see this banner
const PAST_GATE_DATE = Date.now() >= new Date('2026-05-27T00:00:00').getTime();

interface Props {
  nights: NightResult[];
}

export function CommunityGateBanner({ nights }: Props) {
  const { tier } = useAuth();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(SESSION_KEY) === '1';
    } catch {
      return false;
    }
  });

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch { /* noop — non-critical */ }
    events.upgradeNudgeDismissed('community_gate_preview');
  };

  if (tier !== 'community') return null;
  if (nights.length <= COMMUNITY_TIER_LIMIT) return null;
  if (PAST_GATE_DATE) return null;
  if (dismissed) return null;

  return (
    <div className="animate-fade-in-up rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-4 py-4">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              7-night history limit arriving May 27
            </h3>
            <button
              onClick={handleDismiss}
              className="rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            You currently have {nights.length} nights stored. The free tier will show the most recent 7. Older nights stay on your device.
          </p>
          <div className="mt-3">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-500/20"
              onClick={() => events.upgradeNudgeClicked('community_gate_preview')}
            >
              See plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
