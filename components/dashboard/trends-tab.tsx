'use client';

import { SettingsTimeline } from '@/components/dashboard/settings-timeline';
import { MetricsTable } from '@/components/dashboard/metrics-table';
import { SettingsMetricsTable } from '@/components/dashboard/settings-metrics-table';
import { ProTease } from '@/components/common/pro-tease';
import type { NightResult } from '@/lib/types';

interface Props {
  nights: NightResult[];
  therapyChangeDate: string | null;
}

export function TrendsTab({ nights, therapyChangeDate }: Props) {
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
      <MetricsTable nights={nights} />
      <SettingsMetricsTable nights={nights} />
      <SettingsTimeline nights={nights} therapyChangeDate={therapyChangeDate} />
      <ProTease
        feature="Weekly email digest with trend summaries and data pattern highlights."
        source="trends-tab"
      />
    </div>
  );
}
