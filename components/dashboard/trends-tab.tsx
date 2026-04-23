'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import { SettingsTimeline } from '@/components/dashboard/settings-timeline';
import { MetricsTable } from '@/components/dashboard/metrics-table';
import { SettingsMetricsTable } from '@/components/dashboard/settings-metrics-table';
import { ProTease } from '@/components/common/pro-tease';
import { MachineMetricsChart } from '@/components/charts/machine-metrics-chart';
import { useAuth } from '@/lib/auth/auth-context';
import { canAccess } from '@/lib/auth/feature-gate';
import { events } from '@/lib/analytics';
import type { NightResult } from '@/lib/types';

interface Props {
  nights: NightResult[];
  therapyChangeDate: string | null;
}

function ChampionUpsellCard() {
  useEffect(() => {
    events.championTrendUpsellViewed();
  }, []);

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
      <div className="flex items-start gap-3">
        <TrendingUp className="mt-0.5 h-4 w-4 shrink-0 text-amber-500/70" />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-foreground/90">Multi-Week Trend History</p>
          {/* PLACEHOLDER copy — pending Head of Compliance review (AIR-818) */}
          <p className="text-xs leading-relaxed text-muted-foreground">
            See how your AHI, leak rate, and pressure readings shift across 4+ weeks of data.
            Your clinician can use this view to discuss patterns in your therapy data with you.
          </p>
          <Link
            href="/pricing"
            className="mt-1 self-start rounded-md bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-400 transition-colors hover:bg-amber-500/20"
          >
            Upgrade to Champion →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function TrendsTab({ nights, therapyChangeDate }: Props) {
  const { tier } = useAuth();
  const hasHistoricalTrends = canAccess('historical_trends', tier);

  useEffect(() => {
    if (hasHistoricalTrends && nights.length >= 2) {
      events.championTrendViewed(nights.length);
    }
  }, [hasHistoricalTrends, nights.length]);

  if (nights.length < 2) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/50 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Upload multiple nights to see trends.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {hasHistoricalTrends ? (
        <MachineMetricsChart nights={nights} therapyChangeDate={therapyChangeDate} />
      ) : (
        <ChampionUpsellCard />
      )}
      <MetricsTable nights={nights} />
      <SettingsMetricsTable nights={nights} />
      <SettingsTimeline nights={nights} therapyChangeDate={therapyChangeDate} />
      {!hasHistoricalTrends && (
        <ProTease
          feature="Weekly email digest with trend summaries and data pattern highlights."
          source="trends-tab"
        />
      )}
    </div>
  );
}
