'use client';

import { type ReactNode, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  CheckCircle,
  AlertCircle,
  TrendingDown,
  Info,
  ChevronRight,
  Sparkles,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import type { Insight } from '@/lib/insights';

const insightStyles: Record<
  Insight['type'],
  { icon: typeof CheckCircle; border: string; bg: string; iconColor: string }
> = {
  positive: { icon: CheckCircle, border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', iconColor: 'text-emerald-500' },
  warning: { icon: AlertCircle, border: 'border-amber-500/20', bg: 'bg-amber-500/5', iconColor: 'text-amber-500' },
  actionable: { icon: TrendingDown, border: 'border-red-500/20', bg: 'bg-red-500/5', iconColor: 'text-red-500' },
  info: { icon: Info, border: 'border-blue-500/20', bg: 'bg-blue-500/5', iconColor: 'text-blue-400' },
};

interface Props {
  insights: Insight[];
  aiInsights?: Insight[] | null;
  aiLoading?: boolean;
  /** Whether the AI insights are from deep (per-breath) analysis */
  isDeepAnalysis?: boolean;
  defaultExpanded: boolean;
  /** Optional CTA rendered below AI insights */
  aiCTA?: ReactNode;
}

export function InsightsPanel({
  insights,
  aiInsights,
  aiLoading = false,
  isDeepAnalysis = false,
  defaultExpanded,
  aiCTA,
}: Props) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  // Force panel open when AI insights load or while loading spinner is visible
  useEffect(() => {
    if ((aiLoading || (aiInsights && aiInsights.length > 0)) && detailsRef.current) {
      detailsRef.current.open = true;
    }
  }, [aiLoading, aiInsights]);

  const allInsights = [...(aiInsights ?? []), ...insights];
  const totalCount = allInsights.length + (aiLoading ? 1 : 0);
  const warningCount = allInsights.filter(
    (i) => i.type === 'warning' || i.type === 'actionable'
  ).length;

  // Don't render if nothing to show
  if (totalCount === 0 && !aiLoading) return null;

  return (
    <details
      ref={detailsRef}
      className="group rounded-xl border border-border/50 bg-card/30"
      open={defaultExpanded || undefined}
      role="group"
    >
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        <span>Detailed insights ({aiLoading ? `${allInsights.length}+` : totalCount})</span>
        {warningCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
            {warningCount} need{warningCount === 1 ? 's' : ''} attention
          </span>
        )}
      </summary>

      <div className="flex flex-col gap-2 border-t border-border/30 px-4 pb-4 pt-3">
        {/* AI loading state */}
        {aiLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/10 bg-primary/[0.03] px-4 py-3 animate-fade-in-up">
            <Loader2 className="h-4 w-4 animate-spin text-primary/60" />
            <span className="text-sm text-muted-foreground">{isDeepAnalysis ? 'Analysing waveform patterns...' : 'Loading AI insights...'}</span>
          </div>
        )}

        {/* AI insights */}
        {aiInsights && aiInsights.length > 0 && (
          <div className="flex flex-col gap-2 animate-fade-in-up">
            {aiInsights.map((insight) => {
              const style = insightStyles[insight.type];
              const Icon = style.icon;
              return (
                <div
                  key={insight.id}
                  className={`rounded-lg border ${style.border} ${style.bg} px-4 py-3`}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {insight.title}
                        </p>
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                          <Sparkles className="h-2.5 w-2.5" />
                          AI
                        </span>
                        {isDeepAnalysis && (
                          <span className="inline-flex items-center rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                            Deep Analysis
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {insight.body}
                      </p>
                      {insight.context && (
                        <details className="mt-1.5 group/ctx">
                          <summary className="cursor-pointer text-[11px] font-medium text-primary/70 hover:text-primary">
                            Understanding this finding
                          </summary>
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
                            {insight.context}
                          </p>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* AI CTA */}
        {aiCTA}

        {/* Rule-based insights */}
        {insights.length > 0 && (
          <div className="flex flex-col gap-2 animate-fade-in-up">
            {insights.map((insight) => {
              const style = insightStyles[insight.type];
              const Icon = style.icon;
              return (
                <div
                  key={insight.id}
                  className={`rounded-lg border ${style.border} ${style.bg} px-4 py-3`}
                >
                  <div className="flex items-start gap-2.5">
                    <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.iconColor}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {insight.title}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                        {insight.body}
                      </p>
                      {insight.link && (
                        <Link
                          href={insight.link.href}
                          className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          {insight.link.text} <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Medical disclaimer */}
        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground/60">
          These insights are generated from your data for informational purposes
          only. They are not clinical recommendations. Discuss findings with your
          clinician.
        </p>
      </div>
    </details>
  );
}
