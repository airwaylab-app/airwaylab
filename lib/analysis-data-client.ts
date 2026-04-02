import * as Sentry from '@sentry/nextjs';
import type { NightResult } from '@/lib/types';
import { events } from '@/lib/analytics';

export async function storeAnalysisData(nights: NightResult[]): Promise<void> {
  try {
    const totalBreathCount = nights.reduce(
      (sum, night) => sum + (night.ned.breathCount ?? 0),
      0
    );

    const payload = nights.map((night) => ({
      dateStr: night.dateStr,
      glasgowOverall: night.glasgow.overall,
      flScore: night.wat.flScore,
      nedMean: night.ned.nedMean,
      reraIndex: night.ned.reraIndex,
      eai: night.ned.estimatedArousalIndex ?? 0,
      durationHours: night.durationHours,
      sessionCount: night.sessionCount,
      settings: night.settings,
    }));

    const response = await fetch('/api/store-analysis-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ nights: payload }),
    });

    if (!response.ok) {
      console.error('Failed to store analysis data:', response.status, response.statusText);
      return;
    }

    events.analysisDataStored(nights.length, totalBreathCount);
  } catch (error) {
    console.error('Error storing analysis data:', error);
    Sentry.captureException(error, { tags: { action: 'store-analysis-data' } });
  }
}

