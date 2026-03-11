'use client';

import { useMemo } from 'react';
import { useThresholds } from '@/components/common/thresholds-provider';
import { getTrafficLight, type TrafficLight } from '@/lib/thresholds';
import type { NightResult } from '@/lib/types';
import { CheckCircle, AlertCircle, TrendingDown } from 'lucide-react';

interface Props {
  night: NightResult;
  onExplainClick?: () => void;
}

interface MetricCheck {
  name: string;
  value: number;
  unit: string;
  light: TrafficLight;
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

function fmt(n: number, dp = 1): string {
  return n.toFixed(dp);
}

export function NightSummaryHero({ night, onExplainClick }: Props) {
  const THRESHOLDS = useThresholds();
  const n = night;

  const { worstTier, headline, body } = useMemo(() => {
    const metrics: MetricCheck[] = [
      {
        name: 'Glasgow Index',
        value: n.glasgow.overall,
        unit: '',
        light: getTrafficLight(n.glasgow.overall, THRESHOLDS.glasgowOverall),
      },
      {
        name: 'FL Score',
        value: n.wat.flScore,
        unit: '%',
        light: getTrafficLight(n.wat.flScore, THRESHOLDS.watFL),
      },
      {
        name: 'NED Mean',
        value: n.ned.nedMean,
        unit: '%',
        light: getTrafficLight(n.ned.nedMean, THRESHOLDS.nedMean),
      },
      {
        name: 'RERA Index',
        value: n.ned.reraIndex,
        unit: '/hr',
        light: getTrafficLight(n.ned.reraIndex, THRESHOLDS.reraIndex),
      },
    ];

    const tierPriority: Record<TrafficLight, number> = { bad: 0, warn: 1, good: 2 };
    const sorted = [...metrics].sort((a, b) => tierPriority[a.light] - tierPriority[b.light]);
    const worst = sorted[0];
    const tier = worst.light;

    let headlineText: string;
    let bodyText: string;

    if (tier === 'good') {
      headlineText = 'Your therapy looks effective tonight';
      bodyText = `Glasgow Index of ${fmt(n.glasgow.overall)} indicates minimal flow limitation. Your current settings appear to be working well.`;
    } else if (tier === 'warn') {
      headlineText = 'Some areas to monitor';
      bodyText = `${worst.name} is in the watch zone (${fmt(worst.value)}${worst.unit}). This isn't urgent, but worth tracking over time.`;
    } else {
      headlineText = 'Your results need attention';
      bodyText = `${worst.name} is elevated (${fmt(worst.value)}${worst.unit}). Consider discussing your settings with your sleep physician.`;
    }

    return { worstTier: tier, headline: headlineText, body: bodyText };
  }, [n, THRESHOLDS]);

  const Icon = iconMap[worstTier];

  return (
    <div
      className={`rounded-xl border-l-4 ${borderColors[worstTier]} ${bgColors[worstTier]} px-4 py-4 sm:px-5`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconColors[worstTier]}`} />
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
            <span className="text-[10px] text-muted-foreground/50">
              Always discuss results with your sleep physician before making therapy changes.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
