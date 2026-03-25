'use client';

import type { MetricTier } from '@/lib/metric-registry';
import { METRIC_REGISTRY } from '@/lib/metric-registry';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { AlertTriangle, Minus, Info } from 'lucide-react';

interface MetricTierBadgeProps {
  metricId: string;
  className?: string;
}

const TIER_CONFIG: Record<string, { icon: typeof AlertTriangle | null; color: string; tooltip: string }> = {
  '1': { icon: null, color: '', tooltip: 'Direct measurement. Reliable for all comparisons.' },
  '1-asym': { icon: AlertTriangle, color: 'text-amber-500', tooltip: 'Reliable when elevated. Normal values are not reassuring for UARS.' },
  '2': { icon: Minus, color: 'text-blue-400', tooltip: 'Reliable within same settings.' },
  '3': { icon: Info, color: 'text-muted-foreground/50', tooltip: 'Context only. Do not use for trending decisions.' },
};

export function MetricTierBadge({ metricId, className = '' }: MetricTierBadgeProps) {
  const metric = METRIC_REGISTRY[metricId];
  if (!metric) return null;

  const tierKey = String(metric.tier);
  const config = TIER_CONFIG[tierKey];
  if (!config || !config.icon) return null;

  const Icon = config.icon;
  const confounders = metric.confounders.length > 0
    ? ` ${metric.confounders.join('. ')}.`
    : '';

  return (
    <Tooltip>
      <TooltipTrigger>
        <span className={`inline-flex items-center ${config.color} ${className}`}>
          <Icon className="h-3 w-3" />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-xs">
        {config.tooltip}{confounders}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Get the tier for a metric, for use in conditional rendering.
 */
export function getMetricTier(metricId: string): MetricTier | null {
  return METRIC_REGISTRY[metricId]?.tier ?? null;
}

/**
 * Check if a metric should be dimmed in a comparison context
 * where Rise Time has changed.
 */
export function shouldDimMetric(metricId: string, riseTimeChanged: boolean): boolean {
  const metric = METRIC_REGISTRY[metricId];
  if (!metric) return false;
  if (metric.tier === 4) return true;
  if (riseTimeChanged && metric.crossRT === 'invalid') return true;
  return false;
}
