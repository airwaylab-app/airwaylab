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
import { sanitizeNumber } from '@/lib/chart-downsample';

interface Props {
  nights: NightResult[];
  therapyChangeDate: string | null;
}

type MetricKey = 'ahi' | 'leak95' | 'maskPress95';

const METRICS: { key: MetricKey; label: string; color: string; unit: string }[] = [
  { key: 'ahi', label: 'AHI', color: 'hsl(213 94% 56%)', unit: '/hr' },
  { key: 'leak95', label: 'Leak 95th', color: 'hsl(38 92% 50%)', unit: 'L/min' },
  { key: 'maskPress95', label: 'Press 95th', color: 'hsl(142 71% 45%)', unit: 'cmH₂O' },
];

export const MachineMetricsChart = memo(function MachineMetricsChart({ nights, therapyChangeDate }: Props) {
  const [visible, setVisible] = useState<Record<MetricKey, boolean>>({
    ahi: true,
    leak95: true,
    maskPress95: true,
  });

  const data = useMemo(() => [...nights]
    .reverse()
    .map((n) => ({
      date: n.dateStr.slice(5),
      fullDate: n.dateStr,
      ahi: n.machineSummary?.ahi != null
        ? +sanitizeNumber(n.machineSummary.ahi).toFixed(1)
        : null,
      leak95: n.machineSummary?.leak95 != null
        ? +sanitizeNumber(n.machineSummary.leak95).toFixed(1)
        : null,
      maskPress95: n.machineSummary?.maskPress95 != null
        ? +sanitizeNumber(n.machineSummary.maskPress95).toFixed(1)
        : null,
    })), [nights]);

  const dateToFullDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of data) map.set(d.date, d.fullDate);
    return map;
  }, [data]);

  const therapyChangeDateShort = therapyChangeDate?.slice(5);

  const toggleMetric = useCallback((key: MetricKey) => {
    setVisible((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const hasAnyData = data.some(
    (d) => d.ahi != null || d.leak95 != null || d.maskPress95 != null,
  );

  if (!hasAnyData) {
    return (
      <Card className="border-border/50">
        <CardContent className="pt-6">
          <p className="text-center text-sm text-muted-foreground">
            No machine summary data found. Make sure your SD card export includes the STR.edf file.
          </p>
        </CardContent>
      </Card>
    );
  }

  const nightLabel = nights.length >= 28 ? `${nights.length}-Night History` : 'Machine Metrics Over Time';

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium">{nightLabel}</CardTitle>
          <div className="flex flex-wrap gap-1.5">
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                aria-pressed={visible[m.key]}
                aria-label={`${m.label}: ${visible[m.key] ? 'visible' : 'hidden'}`}
                className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
                  visible[m.key]
                    ? 'border-border bg-card text-foreground'
                    : 'border-transparent bg-transparent text-muted-foreground/70 line-through'
                }`}
              >
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: visible[m.key] ? m.color : 'hsl(215 20% 30%)' }}
                />
                {m.label}
                <span className="text-muted-foreground/60">{m.unit}</span>
              </button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="relative h-[300px] w-full sm:h-[380px]"
          role="img"
          aria-label={`Machine metrics trend chart showing ${data.length} nights. Metrics: ${METRICS.filter((m) => visible[m.key]).map((m) => m.label).join(', ')}.`}
        >
          <span className="pointer-events-none absolute bottom-1 right-2 z-10 select-none text-[9px] text-muted-foreground/70">
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
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
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
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
});
