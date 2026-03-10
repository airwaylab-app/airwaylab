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
              <PolarGrid stroke="hsl(217 33% 15% / 0.5)" />
              <PolarAngleAxis
                dataKey="component"
                tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
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
                stroke="hsl(142 71% 45% / 0.3)"
                fill="hsl(142 71% 45%)"
                fillOpacity={0.05}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
              {/* Actual data */}
              <Radar
                name="Score"
                dataKey="value"
                stroke="hsl(213 94% 56%)"
                fill="hsl(213 94% 56%)"
                fillOpacity={0.2}
                strokeWidth={2}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(217 33% 8%)',
                  border: '1px solid hsl(217 33% 15%)',
                  borderRadius: '0.5rem',
                  fontSize: 12,
                  color: 'hsl(210 40% 93%)',
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
            <div className="h-2 w-4 rounded-sm bg-blue-500/30" />
            Patient Score
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded-sm border border-dashed border-emerald-500/40 bg-emerald-500/10" />
            Normal Range
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
