// ============================================================
// AirwayLab — PDF Chart SVG Generators
// Pure string-based SVG for print-ready PDF reports.
// No React, no DOM dependencies.
// ============================================================

import type { GlasgowComponents, NightResult } from './types';

const AXES: { key: keyof GlasgowComponents; label: string }[] = [
  { key: 'skew', label: 'Skew' },
  { key: 'spike', label: 'Spike' },
  { key: 'flatTop', label: 'Flat Top' },
  { key: 'topHeavy', label: 'Top Heavy' },
  { key: 'multiPeak', label: 'Multi-Pk' },
  { key: 'noPause', label: 'No Pause' },
  { key: 'inspirRate', label: 'Insp Rate' },
  { key: 'multiBreath', label: 'Multi-Br' },
  { key: 'variableAmp', label: 'Var Amp' },
];

/**
 * Generate a 9-axis radar chart SVG string for Glasgow components.
 * Returns an inline SVG element (~400x400px).
 */
export function generateRadarSVG(glasgow: GlasgowComponents): string {
  const cx = 200;
  const cy = 200;
  const maxR = 150;
  const n = AXES.length;
  const angleStep = (2 * Math.PI) / n;
  const maxVal = 1.5; // Scale ceiling for visual clarity

  function polar(angle: number, r: number): [number, number] {
    return [
      cx + r * Math.cos(angle - Math.PI / 2),
      cy + r * Math.sin(angle - Math.PI / 2),
    ];
  }

  function polygonPoints(values: number[]): string {
    return values
      .map((v, i) => {
        const r = (Math.min(v, maxVal) / maxVal) * maxR;
        const [x, y] = polar(i * angleStep, r);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }

  // Grid rings at 25%, 50%, 75%, 100%
  const gridRings = [0.25, 0.5, 0.75, 1.0].map((frac) => {
    const r = frac * maxR;
    const pts = Array.from({ length: n }, (_, i) => {
      const [x, y] = polar(i * angleStep, r);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return `<polygon points="${pts.join(' ')}" fill="none" stroke="#e2e8f0" stroke-width="0.5" />`;
  });

  // Axis lines
  const axisLines = AXES.map((_, i) => {
    const [x, y] = polar(i * angleStep, maxR);
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#e2e8f0" stroke-width="0.5" />`;
  });

  // Axis labels
  const labels = AXES.map((axis, i) => {
    const [x, y] = polar(i * angleStep, maxR + 20);
    return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" fill="#64748b" font-size="10" text-anchor="middle" dominant-baseline="middle">${axis.label}</text>`;
  });

  // Normal range reference (green dashed, at ~0.3 for all)
  const normalVals = AXES.map(() => 0.3);
  const normalPoly = `<polygon points="${polygonPoints(normalVals)}" fill="rgba(16,185,129,0.08)" stroke="#10b981" stroke-width="1" stroke-dasharray="4,3" />`;

  // Data polygon
  const dataVals = AXES.map((a) => glasgow[a.key] as number);
  const dataPoly = `<polygon points="${polygonPoints(dataVals)}" fill="rgba(99,102,241,0.15)" stroke="#6366f1" stroke-width="2" />`;

  // Data points
  const dataPoints = dataVals.map((v, i) => {
    const r = (Math.min(v, maxVal) / maxVal) * maxR;
    const [x, y] = polar(i * angleStep, r);
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="#6366f1" />`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="400" height="400" style="display:block;margin:0 auto;">
  ${gridRings.join('\n  ')}
  ${axisLines.join('\n  ')}
  ${normalPoly}
  ${dataPoly}
  ${dataPoints.join('\n  ')}
  ${labels.join('\n  ')}
  <text x="${cx}" y="${cy + maxR + 40}" fill="#64748b" font-size="10" text-anchor="middle">
    Overall: ${glasgow.overall.toFixed(2)} | Dashed = normal range
  </text>
</svg>`;
}

interface TrendMetric {
  key: string;
  label: string;
  color: string;
  getValue: (n: NightResult) => number;
}

const TREND_METRICS: TrendMetric[] = [
  { key: 'glasgow', label: 'Glasgow', color: '#6366f1', getValue: (n) => n.glasgow.overall },
  { key: 'flScore', label: 'FL Score', color: '#10b981', getValue: (n) => n.wat.flScore },
  { key: 'nedMean', label: 'NED Mean', color: '#f59e0b', getValue: (n) => n.ned.nedMean },
  { key: 'rera', label: 'RERA/hr', color: '#ef4444', getValue: (n) => n.ned.reraIndex },
];

/**
 * Generate a multi-line trend chart SVG string.
 * Returns an inline SVG element (~600x250px).
 */
export function generateTrendSVG(nights: NightResult[]): string {
  if (nights.length < 2) return '';

  const chrono = [...nights].reverse();
  const w = 600;
  const h = 250;
  const pad = { top: 30, right: 20, bottom: 40, left: 45 };
  const plotW = w - pad.left - pad.right;
  const plotH = h - pad.top - pad.bottom;

  const lines: string[] = [];

  // Legend
  const legendItems = TREND_METRICS.map((m, i) => {
    const lx = pad.left + i * 120;
    return `<rect x="${lx}" y="8" width="10" height="10" rx="2" fill="${m.color}" />
    <text x="${lx + 14}" y="17" fill="#64748b" font-size="10">${m.label}</text>`;
  });
  lines.push(...legendItems);

  // For each metric, draw a polyline
  for (const metric of TREND_METRICS) {
    const vals = chrono.map((n) => metric.getValue(n));
    const minV = Math.min(...vals) * 0.8;
    const maxV = Math.max(...vals) * 1.2 || 1;
    const range = maxV - minV || 1;

    const points = vals.map((v, i) => {
      const x = pad.left + (i / (chrono.length - 1)) * plotW;
      const y = pad.top + plotH - ((v - minV) / range) * plotH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    lines.push(
      `<polyline points="${points.join(' ')}" fill="none" stroke="${metric.color}" stroke-width="1.5" stroke-linejoin="round" />`
    );

    // Data points
    vals.forEach((v, i) => {
      const x = pad.left + (i / (chrono.length - 1)) * plotW;
      const y = pad.top + plotH - ((v - minV) / range) * plotH;
      lines.push(`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.5" fill="${metric.color}" />`);
    });
  }

  // X-axis date labels
  chrono.forEach((n, i) => {
    const x = pad.left + (i / (chrono.length - 1)) * plotW;
    lines.push(
      `<text x="${x.toFixed(1)}" y="${h - 8}" fill="#64748b" font-size="9" text-anchor="middle">${n.dateStr.slice(5)}</text>`
    );
  });

  // Axes
  lines.push(
    `<line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${pad.top + plotH}" stroke="#e2e8f0" stroke-width="1" />`,
    `<line x1="${pad.left}" y1="${pad.top + plotH}" x2="${pad.left + plotW}" y2="${pad.top + plotH}" stroke="#e2e8f0" stroke-width="1" />`
  );

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" style="display:block;margin:0 auto;">
  ${lines.join('\n  ')}
</svg>`;
}
