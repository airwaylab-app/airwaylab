'use client';

import { memo, useState, useRef, useEffect } from 'react';
import type { ThresholdDef } from '@/lib/thresholds';
import { getTrafficLight, getTrafficDotColor, getTrafficBg } from '@/lib/thresholds';
import { TrendingUp, TrendingDown, Minus, Info, ChevronDown, ExternalLink } from 'lucide-react';
import { COMMUNITY_LINKS_ENABLED, COMMUNITY_LINK_MAP } from '@/lib/community-links';

interface MetricCardProps {
  label: string;
  value: number;
  format?: string;
  unit?: string;
  threshold?: ThresholdDef;
  previousValue?: number;
  compact?: boolean;
  tooltip?: string;
  methodology?: string;
  /** Plain-language "what this means for you" text shown at top of info tooltip */
  plainLanguage?: string;
  onClick?: () => void;
  /** Short context hint shown below value for amber/red metrics */
  contextHint?: string;
  /** When provided, shows micro-trend vs 7-night average (only if value and avg are both valid) */
  sevenNightAvg?: number;
  /** When provided and metric is amber/red, shows "Adjust your range" link */
  onAdjustThreshold?: () => void;
  /** Key into COMMUNITY_LINK_MAP — shows accordion when metric is amber/red and flag is enabled */
  communityKey?: string;
}

function formatValue(value: number, format?: string): string {
  if (value == null || isNaN(value)) return '—';
  if (format === 'int') return Math.round(value).toString();
  if (format === 'pct') return value.toFixed(1);
  return value.toFixed(1);
}

function InfoTooltip({ text, methodology, plainLanguage }: { text: string; methodology?: string; plainLanguage?: string }) {
  const [show, setShow] = useState(false);
  const [showMethodology, setShowMethodology] = useState(false);
  const [position, setPosition] = useState<'above' | 'below'>('below');
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setShow(false);
        setShowMethodology(false);
      }
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [show]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (show) {
      setShow(false);
      setShowMethodology(false);
      return;
    }
    // Measure available space before opening
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedHeight = methodology ? 200 : plainLanguage ? 160 : 120;
      setPosition(spaceBelow < estimatedHeight ? 'above' : 'below');
    }
    setShow(true);
  };

  const positionClasses = position === 'above'
    ? 'bottom-full mb-1.5'
    : 'top-full mt-1.5';

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="text-muted-foreground/80 transition-colors hover:text-muted-foreground"
        aria-label="More info"
      >
        <Info className="h-3 w-3" />
      </button>
      {show && (
        <div className={`absolute left-1/2 ${positionClasses} z-50 -translate-x-1/2 rounded-lg border border-border bg-popover px-3 py-2 text-[11px] leading-relaxed text-muted-foreground shadow-md ${methodology || plainLanguage ? 'w-72' : 'w-48'}`}>
          {plainLanguage && (
            <p className="mb-1.5 text-[11px] font-medium leading-relaxed text-foreground/80">{plainLanguage}</p>
          )}
          {text}
          {methodology && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowMethodology(!showMethodology); }}
                className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-medium text-primary/70 transition-colors hover:text-primary"
              >
                How is this calculated?
                <ChevronDown className={`h-2.5 w-2.5 transition-transform duration-150 ${showMethodology ? 'rotate-180' : ''}`} />
              </button>
              {showMethodology && (
                <div className="mt-1.5 border-t border-border/50 pt-1.5 text-[10px] leading-relaxed text-muted-foreground/80">
                  {methodology}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const MetricCard = memo(function MetricCard({
  label,
  value,
  format,
  unit,
  threshold,
  previousValue,
  compact,
  tooltip,
  methodology,
  plainLanguage,
  onClick,
  contextHint,
  sevenNightAvg,
  onAdjustThreshold,
  communityKey,
}: MetricCardProps) {
  const light = threshold ? getTrafficLight(value, threshold) : null;
  const dotColor = light ? getTrafficDotColor(light) : '';
  const bgColor = light ? getTrafficBg(light) : 'bg-card';
  const lightLabel = light === 'good' ? 'Normal' : light === 'warn' ? 'Borderline' : light === 'bad' ? 'Elevated' : null;

  const trend = previousValue !== undefined
    ? value < previousValue - 0.1
      ? 'down'
      : value > previousValue + 0.1
        ? 'up'
        : 'flat'
    : null;

  // For lower-is-better metrics, down is good
  const trendIsPositive = threshold?.lowerIsBetter
    ? trend === 'down'
    : trend === 'up';

  // Micro-trend: % change vs 7-night average
  const avgDelta =
    sevenNightAvg !== undefined &&
    sevenNightAvg > 0 &&
    !isNaN(value) &&
    !isNaN(sevenNightAvg)
      ? ((value - sevenNightAvg) / sevenNightAvg) * 100
      : null;

  const showAdjustRange = onAdjustThreshold && light && light !== 'good';

  // Community links accordion — only for amber/red metrics when feature is enabled
  const communityLinks = COMMUNITY_LINKS_ENABLED && communityKey && light && light !== 'good'
    ? COMMUNITY_LINK_MAP[communityKey] ?? null
    : null;

  return (
    <div
      className={`rounded-xl border border-border/50 transition-colors ${bgColor} ${
        compact ? 'p-3' : 'p-4 sm:p-5'
      } ${onClick ? 'cursor-pointer hover:border-border hover:shadow-sm' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-medium text-muted-foreground sm:text-xs">{label}</span>
        {tooltip && <InfoTooltip text={tooltip} methodology={methodology} plainLanguage={plainLanguage} />}
        {light && (
          <span
            className={`inline-block h-2 w-2 rounded-full ${dotColor}`}
            role="img"
            aria-label={lightLabel ?? undefined}
            title={lightLabel ?? undefined}
          />
        )}
      </div>
      <div className="mt-1 flex items-baseline gap-1.5 sm:mt-1.5 sm:gap-2">
        <span className={`font-mono font-semibold tabular-nums ${compact ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>
          {formatValue(value, format)}
        </span>
        {unit && (
          <span className="text-[10px] text-muted-foreground sm:text-xs">{unit}</span>
        )}
        {trend && (
          <span
            className={trendIsPositive ? 'text-emerald-500' : trend === 'flat' ? 'text-muted-foreground' : 'text-red-400'}
            role="img"
            aria-label={`Trend: ${trend === 'up' ? 'increasing' : trend === 'down' ? 'decreasing' : 'stable'}${trendIsPositive ? ' (improving)' : trend === 'flat' ? '' : ' (worsening)'}`}
          >
            {trend === 'up' && <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            {trend === 'down' && <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
            {trend === 'flat' && <Minus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
          </span>
        )}
      </div>

      {/* Micro-trend vs 7-night average */}
      {avgDelta !== null && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">
          <span aria-hidden="true">{avgDelta > 0 ? '↑' : '↓'}</span>
          <span className="sr-only">{avgDelta > 0 ? 'increased' : 'decreased'} by</span>
          {' '}{Math.abs(avgDelta).toFixed(0)}% vs 7-night avg
        </p>
      )}

      {contextHint && light && light !== 'good' && (
        <p className="mt-0.5 text-[10px] text-muted-foreground">{contextHint}</p>
      )}

      {/* Adjust your range — opens ThresholdSettings scrolled to this metric */}
      {showAdjustRange && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onAdjustThreshold(); }}
          className="mt-1 inline-flex items-center gap-0.5 text-[10px] text-primary/60 transition-colors hover:text-primary"
          aria-label={`Adjust ${label} threshold range`}
        >
          Adjust your range
        </button>
      )}

      {/* "What people explore in this situation" community links accordion */}
      {communityLinks && (
        <details
          className="mt-2 group/community"
          onClick={(e) => e.stopPropagation()}
        >
          <summary className="flex cursor-pointer items-center gap-1 text-[10px] font-medium text-muted-foreground/70 transition-colors hover:text-muted-foreground [&::-webkit-details-marker]:hidden">
            <ChevronDown className="h-2.5 w-2.5 transition-transform duration-150 group-open/community:rotate-180" aria-hidden="true" />
            What people explore in this situation
          </summary>
          <div className="mt-1.5 border-t border-border/20 pt-1.5">
            <p className="text-[10px] leading-relaxed text-muted-foreground/70">
              {communityLinks.summary}
            </p>
            <ul className="mt-1 space-y-0.5">
              {communityLinks.links.map((link) => (
                <li key={link.url}>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 text-[10px] text-primary/60 transition-colors hover:text-primary"
                    aria-label={`${link.label} (opens in new tab)`}
                  >
                    {link.label}
                    <ExternalLink className="h-2 w-2" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-1 text-[9px] text-muted-foreground/50">
              External links. AirwayLab does not endorse specific advice.
            </p>
          </div>
        </details>
      )}
    </div>
  );
});
