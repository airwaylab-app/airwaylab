'use client';

import { useMemo } from 'react';
import { useThresholds } from '@/components/common/thresholds-provider';
import { getTrafficLight, type TrafficLight } from '@/lib/thresholds';
import type { NightResult } from '@/lib/types';
import { computeIFLRisk } from '@/lib/ifl-risk';
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
    // IFL Risk as primary signal
    const iflRisk = computeIFLRisk(n);
    const iflTier = getTrafficLight(iflRisk, THRESHOLDS.iflRisk);

    // Secondary metrics for context
    const secondaryMetrics: MetricCheck[] = [
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
    ];

    // Use IFL Risk tier as the primary tier
    const tier = iflTier;

    let headlineText: string;
    let bodyText: string;

    if (tier === 'good') {
      headlineText = 'Low flow limitation tonight';
      bodyText = `IFL Symptom Risk of ${fmt(iflRisk)}% indicates your airway is functioning well during therapy. Current settings appear effective.`;
    } else if (tier === 'warn') {
      headlineText = 'Moderate flow limitation detected';
      const elevated = secondaryMetrics.filter((m) => m.light !== 'good');
      const detail = elevated.length > 0
        ? ` Key contributors: ${elevated.map((m) => `${m.name} ${fmt(m.value)}${m.unit}`).join(', ')}.`
        : '';
      bodyText = `IFL Symptom Risk of ${fmt(iflRisk)}% suggests some flow limitation is present.${detail} Worth monitoring over time.`;
    } else {
      headlineText = 'Significant flow limitation detected';
      const elevated = secondaryMetrics.filter((m) => m.light === 'bad');
      const detail = elevated.length > 0
        ? ` Elevated: ${elevated.map((m) => `${m.name} ${fmt(m.value)}${m.unit}`).join(', ')}.`
        : '';
      bodyText = `IFL Symptom Risk of ${fmt(iflRisk)}% indicates substantial flow limitation.${detail} Discuss your settings with your sleep physician.`;
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
            <span className="text-[10px] text-muted-foreground/70">
              Always discuss results with your sleep physician before making therapy changes.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
