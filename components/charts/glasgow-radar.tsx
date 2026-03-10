'use client';

import { memo, useMemo } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { chartColors, chartTheme } from '@/lib/chart-theme';
import type { GlasgowComponents } from '@/lib/types';

interface Props {
  glasgow: GlasgowComponents;
}

// Visual reference range on the 0–1 scale (proportion of breaths).
// These are visual guides only — they do not affect the Glasgow overall score.
const REFERENCE_VALUES: Record<string, number> = {
  Skew: 0.30,
  Spike: 0.20,
  'Flat Top': 0.25,
  'Top Heavy': 0.30,
  'Multi-Peak': 0.15,
  'No Pause': 0.30,
  'Insp. Rate': 0.20,
  'Multi-Breath': 0.15,
  'Var. Amp': 0.25,
};

export const GlasgowRadar = memo(function GlasgowRadar({ glasgow }: Props) {
  const data = useMemo(() => [
    { component: 'Skew', value: glasgow.skew, ref: REFERENCE_VALUES['Skew'] },
    { component: 'Spike', value: glasgow.spike, ref: REFERENCE_VALUES['Spike'] },
    { component: 'Flat Top', value: glasgow.flatTop, ref: REFERENCE_VALUES['Flat Top'] },
    { component: 'Top Heavy', value: glasgow.topHeavy, ref: REFERENCE_VALUES['Top Heavy'] },
    { component: 'Multi-Peak', value: glasgow.multiPeak, ref: REFERENCE_VALUES['Multi-Peak'] },
    { component: 'No Pause', value: glasgow.noPause, ref: REFERENCE_VALUES['No Pause'] },
    { component: 'Insp. Rate', value: glasgow.inspirRate, ref: REFERENCE_VALUES['Insp. Rate'] },
    { component: 'Multi-Breath', value: glasgow.multiBreath, ref: REFERENCE_VALUES['Multi-Breath'] },
    { component: 'Var. Amp', value: glasgow.variableAmp, ref: REFERENCE_VALUES['Var. Amp'] },
  ], [glasgow]);

  const hasData = data.some((d) => d.value > 0);

  if (!hasData) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center gap-2 py-12">
          <p className="text-sm text-muted-foreground">No Glasgow component data available.</p>
          <p className="text-xs text-muted-foreground/60">This may indicate insufficient breath data for analysis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          Glasgow Index Components{' '}
          <span className="font-mono tabular-nums text-muted-foreground">
            (Overall: {glasgow.overall.toFixed(1)})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className="relative h-[300px] w-full sm:h-[380px]"
          role="img"
          aria-label={`Glasgow Index radar chart. Overall score: ${glasgow.overall.toFixed(1)} out of 8. Shows 9 component scores: ${data.map((d) => `${d.component}: ${d.value.toFixed(2)}`).join(', ')}.`}
        >
          <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none text-[9px] text-muted-foreground/30">
            airwaylab.app
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
              <PolarGrid stroke="hsl(var(--border) / 0.5)" />
              <PolarAngleAxis
                dataKey="component"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 1]}
                tick={false}
                axisLine={false}
              />
              {/* Reference "normal" range — subtle green fill behind data */}
              <Radar
                name="Normal Range"
                dataKey="ref"
                stroke={`${chartColors.quinary}4D`}
                fill={chartColors.quinary}
                fillOpacity={0.05}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              {/* Actual data */}
              <Radar
                name="Score"
                dataKey="value"
                stroke={chartColors.primary}
                fill={chartColors.primary}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: chartTheme.tooltip.background,
                  border: `1px solid ${chartTheme.tooltip.border}`,
                  borderRadius: chartTheme.tooltip.borderRadius,
                  fontSize: 12,
                  color: '#2D2A26',
                }}
                formatter={(value, name) => {
                  if (name === 'Normal Range') return [Number(value).toFixed(2), 'Normal Limit'];
                  return [Number(value).toFixed(2), 'Score'];
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded-sm" style={{ backgroundColor: `${chartColors.primary}30` }} />
            Patient Score
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded-sm border border-dashed" style={{ borderColor: `${chartColors.quinary}66`, backgroundColor: `${chartColors.quinary}1A` }} />
            Normal Range
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
