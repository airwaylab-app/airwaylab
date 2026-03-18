'use client';

import { useMemo } from 'react';
import { useThresholds } from '@/components/common/thresholds-provider';
import { getTrafficLight, type TrafficLight } from '@/lib/thresholds';
import type { NightResult } from '@/lib/types';
import { computeIFLRisk } from '@/lib/ifl-risk';
import { fmt } from '@/lib/format-utils';
import { CheckCircle, AlertCircle, TrendingDown } from 'lucide-react';

interface Props {
  night: NightResult;
  onExplainClick?: () => void;
}

const borderColors: Record<TrafficLight, string> = {
  good: 'border-emerald-500/40',
  warn: 'border-amber-500/40',
  bad: 'border-red-500/40',
};

const bgColors: Record<TrafficLight, string> = {
  good: 'bg-emerald-500/5',
  warn: 'bg-amber-500/5',
  bad: 'bg-red-500/5',
};

const iconMap: Record<TrafficLight, typeof CheckCircle> = {
  good: CheckCircle,
  warn: AlertCircle,
  bad: TrendingDown,
};

const iconColors: Record<TrafficLight, string> = {
  good: 'text-emerald-500',
  warn: 'text-amber-500',
  bad: 'text-red-500',
};

/**
 * Determine whether event control (RERA / hypopnea) is in the green zone.
 * Event control is considered good if EITHER metric is green.
 */
function isEventControlGood(
  night: NightResult,
  thresholds: Record<string, { green: number; amber: number; lowerIsBetter: boolean }>,
): boolean {
  const reraGreen = getTrafficLight(night.ned.reraIndex, thresholds.reraIndex) === 'good';
  const hypopneaIndex = night.ned.hypopneaIndex;
  if (hypopneaIndex != null) {
    const hypGreen = getTrafficLight(hypopneaIndex, thresholds.hypopneaIndex) === 'good';
    return reraGreen || hypGreen;
  }
  return reraGreen;
}

export function NightSummaryHero({ night, onExplainClick }: Props) {
  const THRESHOLDS = useThresholds();
  const n = night;

  const { displayTier, headline, body } = useMemo(() => {
    const iflRisk = computeIFLRisk(n);
    const iflTier = getTrafficLight(iflRisk, THRESHOLDS.iflRisk);
    const hasFLConcern = iflTier === 'warn' || iflTier === 'bad';
    const eventGood = isEventControlGood(n, THRESHOLDS);

    let tier: TrafficLight;
    let headlineText: string;
    let bodyText: string;

    if (eventGood && !hasFLConcern) {
      // Case 2: all good
      tier = 'good';
      headlineText = 'Your therapy looks effective tonight';
      bodyText = `IFL Symptom Risk of ${fmt(iflRisk)}% indicates your airway is functioning well during therapy. Current settings appear effective.`;
    } else if (eventGood && hasFLConcern) {
      // Case 1: dual framing — events controlled, FL elevated
      tier = 'warn';
      headlineText = 'Good event control \u2014 flow patterns worth monitoring';
      bodyText = `Your therapy is keeping respiratory events low (RERA ${fmt(n.ned.reraIndex)}/hr). Flow limitation metrics show additional breathing patterns that standard event counting doesn\u2019t capture \u2014 this is common and worth tracking over time. Discuss with your sleep physician if you\u2019re experiencing symptoms.`;
    } else if (!eventGood && hasFLConcern) {
      // Case 3: both bad
      tier = 'bad';
      headlineText = 'Your results need attention';
      bodyText = `Both respiratory event counts and flow limitation metrics are elevated (RERA ${fmt(n.ned.reraIndex)}/hr, IFL Risk ${fmt(iflRisk)}%). Discuss your settings with your sleep physician.`;
    } else {
      // Case 4: events elevated, FL fine
      tier = 'warn';
      headlineText = 'Respiratory events to monitor';
      bodyText = `Your breathing shows some elevated respiratory events (RERA ${fmt(n.ned.reraIndex)}/hr) despite good flow patterns. Discuss with your sleep physician.`;
    }

    return { displayTier: tier, headline: headlineText, body: bodyText };
  }, [n, THRESHOLDS]);

  const Icon = iconMap[displayTier];

  return (
    <div
      className={`rounded-xl border-l-4 ${borderColors[displayTier]} ${bgColors[displayTier]} px-4 py-4 sm:px-5`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColors[displayTier]}`} />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            {headline}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {body}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {onExplainClick && (
              <button
                type="button"
                onClick={onExplainClick}
                className="text-xs font-medium text-primary transition-colors hover:underline"
              >
                What does this mean?
              </button>
            )}
            <span className="text-[10px] text-muted-foreground/70">
              Always discuss results with your sleep physician before making therapy changes.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
