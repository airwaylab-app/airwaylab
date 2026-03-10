'use client';

import { memo, useCallback, useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NightResult } from '@/lib/types';

interface Props {
  nights: NightResult[];
  therapyChangeDate: string | null;
}

type MetricKey = 'glasgow' | 'flScore' | 'nedMean' | 'reraIndex';

const METRICS: { key: MetricKey; label: string; color: string; threshold: number; thresholdLabel: string }[] = [
  { key: 'glasgow', label: 'Glasgow', color: '#1B7A6E', threshold: 2.0, thresholdLabel: 'Glasgow = 2.0' },
  { key: 'flScore', label: 'FL Score', color: '#34A853', threshold: 30, thresholdLabel: 'FL = 30%' },
  { key: 'nedMean', label: 'NED Mean', color: '#E8913A', threshold: 15, thresholdLabel: 'NED = 15%' },
  { key: 'reraIndex', label: 'RERA/hr', color: '#E07A5F', threshold: 5, thresholdLabel: 'RERA = 5/hr' },
];

export const TrendChart = memo(function TrendChart({ nights, therapyChangeDate }: Props) {
  const [visible, setVisible] = useState<Record<MetricKey, boolean>>({
    glasgow: true,
    flScore: true,
    nedMean: true,
    reraIndex: true,
  });

  const data = useMemo(() => [...nights]
    .reverse()
    .map((n) => ({
      date: n.dateStr.slice(5),
      fullDate: n.dateStr,
      glasgow: +n.glasgow.overall.toFixed(1),
      flScore: +n.wat.flScore.toFixed(1),
      nedMean: +n.ned.nedMean.toFixed(1),
      reraIndex: +n.ned.reraIndex.toFixed(1),
    })), [nights]);

  // O(1) lookup for tooltip label formatting instead of linear search
  const dateToFullDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of data) map.set(d.date, d.fullDate);
    return map;
  }, [data]);

  const therapyChangeDateShort = therapyChangeDate?.slice(5);

  const toggleMetric = useCallback((key: MetricKey) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">Multi-Night Trends</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                aria-pressed={visible[m.key]}
                aria-label={`${m.label}: ${visible[m.key] ? 'visible' : 'hidden'}`}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  visible[m.key]
                    ? 'border-border bg-card text-foreground'
                    : 'border-transparent bg-transparent text-muted-foreground/50 line-through'
                }`}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: visible[m.key] ? m.color : 'hsl(215 20% 30%)' }}
                />
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="relative h-[300px] w-full sm:h-[380px]"
          role="img"
          aria-label={`Multi-night trend chart showing ${data.length} nights. Metrics displayed: ${METRICS.filter((m) => visible[m.key]).map((m) => m.label).join(', ')}.`}
        >
          <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none text-[9px] text-muted-foreground/30">
            airwaylab.app
          </span>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(217 33% 15% / 0.3)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(217 33% 15%)' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'hsl(215 20% 55%)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(217 33% 8%)',
                  border: '1px solid hsl(217 33% 15%)',
                  borderRadius: '0.5rem',
                  fontSize: 12,
                  color: 'hsl(210 40% 93%)',
                }}
                labelFormatter={(label) => dateToFullDate.get(label as string) ?? label}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              />
              {/* Therapy change reference line */}
              {therapyChangeDateShort && (
                <ReferenceLine
                  x={therapyChangeDateShort}
                  stroke="hsl(38 92% 50%)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: 'Settings Change',
                    fill: 'hsl(38 92% 50%)',
                    fontSize: 10,
                    position: 'top',
                  }}
                />
              )}
              {/* Threshold reference lines for visible metrics */}
              {METRICS.filter((m) => visible[m.key]).map((m) => (
                <ReferenceLine
                  key={m.key}
                  y={m.threshold}
                  stroke={m.color}
                  strokeDasharray="8 4"
                  strokeWidth={0.5}
                  strokeOpacity={0.4}
                />
              ))}
              {/* Metric lines */}
              {METRICS.map((m) => (
                <Line
                  key={m.key}
                  type="monotone"
                  dataKey={m.key}
                  name={m.label}
                  stroke={m.color}
                  strokeWidth={visible[m.key] ? 2 : 0}
                  dot={visible[m.key] ? { r: 3, fill: m.color } : false}
                  activeDot={visible[m.key] ? { r: 5 } : false}
                  hide={!visible[m.key]}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
