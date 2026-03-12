'use client';

import { useState, useEffect } from 'react';
import { Lock, Users, BarChart3 } from 'lucide-react';
import { computeIFLRisk } from '@/lib/ifl-risk';
import type { NightResult } from '@/lib/types';

interface CommunityStats {
  avgRating: number;
  totalRatings: number;
  sameBucketAvgRating: number | null;
  sameBucketCount: number;
}

interface CommunityComparisonProps {
  night: NightResult;
  symptomRating: number | null;
  isContributeConsented: boolean;
}

export function CommunityComparison({ night, symptomRating, isContributeConsented }: CommunityComparisonProps) {
  const [stats, setStats] = useState<CommunityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [insufficient, setInsufficient] = useState(false);
  const [error, setError] = useState(false);

  const iflRisk = computeIFLRisk(night);

  useEffect(() => {
    if (!isContributeConsented) return;

    setLoading(true);
    setInsufficient(false);
    setError(false);

    const controller = new AbortController();
    const pressureBucket = night.settings.epap < 6 ? '<6'
      : night.settings.epap < 8 ? '6-8'
      : night.settings.epap < 10 ? '8-10'
      : night.settings.epap < 12 ? '10-12'
      : night.settings.epap < 14 ? '12-14'
      : '14+';

    fetch(`/api/community-insights?ifl_risk=${Math.round(iflRisk)}&pressure_bucket=${encodeURIComponent(pressureBucket)}`, {
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error('fetch failed');
        return r.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.insufficient) {
          setInsufficient(true);
          setStats(null);
        } else {
          setStats(data);
        }
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setStats(null);
        setError(true);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        setLoading(false);
      });

    return () => controller.abort();
  }, [isContributeConsented, night, iflRisk]);

  // State 1: Not consented — locked
  if (!isContributeConsented) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-3">
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <Lock className="h-4 w-4 shrink-0" />
          <div>
            <p className="text-xs font-medium text-muted-foreground/70">Community Comparison</p>
            <p className="text-[10px]">
              Contribute your data to see how your results compare with others at similar IFL Risk levels.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 3: Insufficient data
  if (insufficient) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-3">
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <BarChart3 className="h-4 w-4 shrink-0" />
          <div>
            <p className="text-xs font-medium text-muted-foreground/70">Community Comparison</p>
            <p className="text-[10px]">
              Not enough community data yet for your IFL Risk range. Check back as more users contribute.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // State 4: Error
  if (error) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-3">
        <div className="flex items-center gap-2 text-muted-foreground/60">
          <BarChart3 className="h-4 w-4 shrink-0" />
          <div>
            <p className="text-xs font-medium text-muted-foreground/70">Community Comparison</p>
            <p className="text-[10px]">
              Unable to load community data right now. This won&apos;t affect your analysis.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading || !stats) {
    return (
      <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-3">
        <div className="flex items-center gap-2 text-muted-foreground/80">
          <Users className="h-4 w-4 shrink-0 animate-pulse" />
          <p className="text-xs text-muted-foreground/70">Loading community data...</p>
        </div>
      </div>
    );
  }

  // State 2: Live data
  return (
    <div className="rounded-xl border border-border/50 bg-card/30 px-4 py-3">
      <div className="flex items-start gap-2">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary/60" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted-foreground">
            Community Comparison
            <span className="ml-1.5 text-[10px] font-normal text-muted-foreground/70">
              ({stats.totalRatings.toLocaleString()} ratings)
            </span>
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground/80">Community avg. rating</p>
              <p className="font-mono text-sm font-semibold tabular-nums">
                {stats.avgRating.toFixed(1)}/5
              </p>
            </div>
            {symptomRating !== null && (
              <div>
                <p className="text-[10px] text-muted-foreground/80">Your rating</p>
                <p className="font-mono text-sm font-semibold tabular-nums">
                  {symptomRating}/5
                  {symptomRating > stats.avgRating && (
                    <span className="ml-1 text-[10px] text-emerald-500">above avg</span>
                  )}
                  {symptomRating < stats.avgRating && (
                    <span className="ml-1 text-[10px] text-amber-500">below avg</span>
                  )}
                </p>
              </div>
            )}
          </div>
          {stats.sameBucketAvgRating !== null && stats.sameBucketCount >= 5 && (
            <p className="mt-1.5 text-[10px] text-muted-foreground/70">
              Users with similar IFL Risk rate their sleep {stats.sameBucketAvgRating.toFixed(1)}/5 on average
              ({stats.sameBucketCount} ratings)
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
