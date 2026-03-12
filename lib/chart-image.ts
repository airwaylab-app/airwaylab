// ============================================================
// AirwayLab — Canvas Chart Image Renderer
// Renders chart images to Canvas for sharing/export.
// No DOM dependencies beyond Canvas API.
// ============================================================

import type { NightResult, GlasgowComponents } from './types';
import type { WaveformData } from './waveform-types';

// Colour palette matching globals.css dark theme
const COLORS = {
  background: '#090d19',
  foreground: '#e4ecf2',
  muted: '#667a8f',
  primary: '#2196f3',
  border: '#161d2b',
  good: '#22c55e',
  warn: '#f59e0b',
  bad: '#ef4444',
};

// Glasgow radar axes (matches pdf-charts.ts)
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

// Inline traffic light thresholds (avoids importing ThresholdsProvider context)
interface ThresholdDef {
  green: number;
  amber: number;
  /** 'asc' = higher is worse, 'desc' = lower is worse */
  direction: 'asc' | 'desc';
}

const INLINE_THRESHOLDS: Record<string, ThresholdDef> = {
  glasgowOverall: { green: 2.5, amber: 4.0, direction: 'asc' },
  flScore: { green: 30, amber: 50, direction: 'asc' },
  nedMean: { green: 20, amber: 35, direction: 'asc' },
  reraIndex: { green: 1.5, amber: 3.0, direction: 'asc' },
  regularityScore: { green: 50, amber: 70, direction: 'asc' },
  combinedFLPct: { green: 25, amber: 45, direction: 'asc' },
  odi3: { green: 5, amber: 15, direction: 'asc' },
  spo2Mean: { green: 95, amber: 92, direction: 'desc' },
};

type TrafficLight = 'green' | 'amber' | 'red';

function getTrafficLight(value: number, key: string): TrafficLight {
  const def = INLINE_THRESHOLDS[key];
  if (!def) return 'green';

  if (def.direction === 'asc') {
    if (value <= def.green) return 'green';
    if (value <= def.amber) return 'amber';
    return 'red';
  }
  // desc: lower is worse
  if (value >= def.green) return 'green';
  if (value >= def.amber) return 'amber';
  return 'red';
}

function trafficColor(light: TrafficLight): string {
  switch (light) {
    case 'green':
      return COLORS.good;
    case 'amber':
      return COLORS.warn;
    case 'red':
      return COLORS.bad;
  }
}

function trafficLabel(light: TrafficLight): string {
  switch (light) {
    case 'green':
      return 'G';
    case 'amber':
      return 'A';
    case 'red':
      return 'R';
  }
}

// ============================================================
// Canvas Utilities
// ============================================================

/**
 * Wait for fonts to be ready with a timeout.
 * Falls back silently if fonts do not load in time.
 */
async function waitForFonts(timeoutMs = 2000): Promise<void> {
  if (typeof document === 'undefined') return;
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch {
    // Fonts not available — continue with fallback
  }
}

/**
 * Create a canvas at the given logical size, scaled by devicePixelRatio.
 */
function createScaledCanvas(
  logicalWidth: number,
  logicalHeight: number,
  scale = 2
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = logicalWidth * scale;
  canvas.height = logicalHeight * scale;
  canvas.style.width = `${logicalWidth}px`;
  canvas.style.height = `${logicalHeight}px`;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.scale(scale, scale);
  return { canvas, ctx };
}

/**
 * Convert canvas to PNG Blob via the callback-based toBlob API.
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob returned null'));
        }
      },
      'image/png',
      1.0
    );
  });
}

/**
 * Convert polar coordinates to cartesian, with angle 0 at top (12 o'clock).
 */
function polar(
  cx: number,
  cy: number,
  angle: number,
  r: number
): { x: number; y: number } {
  return {
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  };
}

const FONT_BODY = "'IBM Plex Sans', sans-serif";
const FONT_MONO = "'JetBrains Mono', monospace";

// ============================================================
// Glasgow Radar Drawing (shared by composite and standalone)
// ============================================================

function drawRadar(
  ctx: CanvasRenderingContext2D,
  glasgow: GlasgowComponents,
  cx: number,
  cy: number,
  maxR: number
): void {
  const n = AXES.length;
  const angleStep = (2 * Math.PI) / n;
  const maxVal = 1.5; // Scale ceiling for visual clarity

  // Grid rings at 25%, 50%, 75%, 100%
  for (const frac of [0.25, 0.5, 0.75, 1.0]) {
    const r = frac * maxR;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const { x, y } = polar(cx, cy, i * angleStep, r);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Axis lines
  for (let i = 0; i < n; i++) {
    const { x, y } = polar(cx, cy, i * angleStep, maxR);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x, y);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }

  // Normal range reference polygon (dashed, green)
  const normalVal = 0.3;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const r = (normalVal / maxVal) * maxR;
    const { x, y } = polar(cx, cy, i * angleStep, r);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = COLORS.good;
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(34, 197, 94, 0.08)';
  ctx.fill();
  ctx.stroke();
  ctx.setLineDash([]);

  // Data polygon
  const dataVals = AXES.map((a) => a.key === 'overall' ? 0 : (glasgow[a.key] as number));
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const v = dataVals[i];
    const r = (Math.min(v, maxVal) / maxVal) * maxR;
    const { x, y } = polar(cx, cy, i * angleStep, r);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
  ctx.fill();
  ctx.strokeStyle = '#6366f1';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Data points
  for (let i = 0; i < n; i++) {
    const v = dataVals[i];
    const r = (Math.min(v, maxVal) / maxVal) * maxR;
    const { x, y } = polar(cx, cy, i * angleStep, r);
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2 * Math.PI);
    ctx.fillStyle = '#6366f1';
    ctx.fill();
  }

  // Axis labels
  ctx.fillStyle = COLORS.muted;
  ctx.font = `11px ${FONT_BODY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < n; i++) {
    const { x, y } = polar(cx, cy, i * angleStep, maxR + 20);
    ctx.fillText(AXES[i].label, x, y);
  }
}

// ============================================================
// Metric Row Drawing
// ============================================================

interface MetricDef {
  label: string;
  value: string;
  thresholdKey: string;
  numericValue: number;
}

function drawMetricRow(
  ctx: CanvasRenderingContext2D,
  metric: MetricDef,
  x: number,
  y: number,
  width: number
): void {
  const light = getTrafficLight(metric.numericValue, metric.thresholdKey);
  const color = trafficColor(light);
  const badge = trafficLabel(light);

  // Label
  ctx.fillStyle = COLORS.muted;
  ctx.font = `13px ${FONT_BODY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(metric.label, x, y);

  // Value
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `14px ${FONT_MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(metric.value, x + width - 30, y);

  // Traffic light indicator circle + badge
  const circleX = x + width - 12;
  ctx.beginPath();
  ctx.arc(circleX, y, 8, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();

  ctx.fillStyle = COLORS.background;
  ctx.font = `bold 9px ${FONT_BODY}`;
  ctx.textAlign = 'center';
  ctx.fillText(badge, circleX, y + 1);
}

// ============================================================
// Watermark
// ============================================================

function drawWatermark(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  y: number
): void {
  ctx.fillStyle = COLORS.muted;
  ctx.font = `11px ${FONT_BODY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('airwaylab.app — free, open-source airway analysis', centerX, y);
  ctx.fillText(
    'Not medical advice — discuss with your clinician',
    centerX,
    y + 16
  );
}

// ============================================================
// Exported Functions
// ============================================================

/**
 * Render composite analysis image — 1200x1000 @ 2x.
 * Shows Glasgow radar, key metrics with traffic lights, device info, and watermark.
 */
export async function renderCompositeImage(night: NightResult): Promise<Blob> {
  await waitForFonts();

  const W = 1200;
  const H = 1000;
  const { canvas, ctx } = createScaledCanvas(W, H);

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  // Header
  const headerY = 40;
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold 20px ${FONT_BODY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`AirwayLab Analysis — ${night.dateStr}`, 40, headerY);

  // Subheader: device info
  const settings = night.settings;
  const subParts: string[] = [];
  if (settings.deviceModel) subParts.push(settings.deviceModel);
  if (settings.papMode) subParts.push(settings.papMode);
  if (settings.epap || settings.ipap) {
    subParts.push(`EPAP ${settings.epap} / IPAP ${settings.ipap}`);
  }
  subParts.push(`${night.durationHours.toFixed(1)}h`);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `14px ${FONT_BODY}`;
  ctx.fillText(subParts.join('  |  '), 40, headerY + 28);

  // Divider
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, headerY + 50);
  ctx.lineTo(W - 40, headerY + 50);
  ctx.stroke();

  // Layout: left = radar, right = metrics
  const contentTop = headerY + 70;
  const radarCx = 280;
  const radarCy = contentTop + 280;
  const radarR = 180;

  drawRadar(ctx, night.glasgow, radarCx, radarCy, radarR);

  // Overall score below radar
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold 16px ${FONT_BODY}`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `Overall: ${night.glasgow.overall.toFixed(1)}  |  Dashed = normal range`,
    radarCx,
    radarCy + radarR + 40
  );

  // Right panel: metrics
  const metricsX = 580;
  const metricsW = 520;
  let metricY = contentTop + 30;
  const rowHeight = 48;

  const metrics: MetricDef[] = [
    {
      label: 'Glasgow Overall',
      value: night.glasgow.overall.toFixed(1),
      thresholdKey: 'glasgowOverall',
      numericValue: night.glasgow.overall,
    },
    {
      label: 'FL Score',
      value: `${night.wat.flScore.toFixed(0)}%`,
      thresholdKey: 'flScore',
      numericValue: night.wat.flScore,
    },
    {
      label: 'NED Mean',
      value: `${night.ned.nedMean.toFixed(0)}%`,
      thresholdKey: 'nedMean',
      numericValue: night.ned.nedMean,
    },
    {
      label: 'RERA Index',
      value: `${night.ned.reraIndex.toFixed(1)}/hr`,
      thresholdKey: 'reraIndex',
      numericValue: night.ned.reraIndex,
    },
    {
      label: 'Regularity',
      value: `${night.wat.regularityScore.toFixed(0)}%`,
      thresholdKey: 'regularityScore',
      numericValue: night.wat.regularityScore,
    },
    {
      label: 'Combined FL',
      value: `${night.ned.combinedFLPct.toFixed(0)}%`,
      thresholdKey: 'combinedFLPct',
      numericValue: night.ned.combinedFLPct,
    },
  ];

  // Add oximetry metrics if available
  if (night.oximetry) {
    metrics.push({
      label: 'ODI-3',
      value: `${night.oximetry.odi3.toFixed(1)}/hr`,
      thresholdKey: 'odi3',
      numericValue: night.oximetry.odi3,
    });
    metrics.push({
      label: 'SpO\u2082 Mean',
      value: `${night.oximetry.spo2Mean.toFixed(1)}%`,
      thresholdKey: 'spo2Mean',
      numericValue: night.oximetry.spo2Mean,
    });
  }

  // Section header
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold 16px ${FONT_BODY}`;
  ctx.textAlign = 'left';
  ctx.fillText('Key Metrics', metricsX, metricY);
  metricY += 36;

  // Divider under header
  ctx.strokeStyle = COLORS.border;
  ctx.beginPath();
  ctx.moveTo(metricsX, metricY - 10);
  ctx.lineTo(metricsX + metricsW, metricY - 10);
  ctx.stroke();

  for (const metric of metrics) {
    drawMetricRow(ctx, metric, metricsX, metricY, metricsW);
    metricY += rowHeight;
  }

  // Footer divider
  const footerY = H - 60;
  ctx.strokeStyle = COLORS.border;
  ctx.beginPath();
  ctx.moveTo(40, footerY - 20);
  ctx.lineTo(W - 40, footerY - 20);
  ctx.stroke();

  drawWatermark(ctx, W / 2, footerY);

  return canvasToBlob(canvas);
}

/**
 * Render Glasgow radar chart image — 1200x800 @ 2x.
 * Standalone radar with overall score and watermark.
 */
export async function renderGlasgowRadarImage(
  glasgow: GlasgowComponents
): Promise<Blob> {
  await waitForFonts();

  const W = 1200;
  const H = 800;
  const { canvas, ctx } = createScaledCanvas(W, H);

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold 20px ${FONT_BODY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Glasgow Index — Breath Shape Analysis', W / 2, 40);

  // Radar
  const radarCx = W / 2;
  const radarCy = 360;
  const radarR = 220;
  drawRadar(ctx, glasgow, radarCx, radarCy, radarR);

  // Overall score
  const light = getTrafficLight(glasgow.overall, 'glasgowOverall');
  const color = trafficColor(light);

  ctx.fillStyle = color;
  ctx.font = `bold 48px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(glasgow.overall.toFixed(1), W / 2, radarCy + radarR + 55);

  ctx.fillStyle = COLORS.muted;
  ctx.font = `14px ${FONT_BODY}`;
  ctx.fillText('Overall Score  |  Dashed = normal range', W / 2, radarCy + radarR + 80);

  // Watermark
  drawWatermark(ctx, W / 2, H - 40);

  return canvasToBlob(canvas);
}

/**
 * Render flow waveform image — 1600x600 @ 2x.
 * Shows the flow envelope (min/max area) for the visible viewport slice.
 */
export async function renderFlowWaveformImage(
  waveform: WaveformData,
  viewStart: number,
  viewEnd: number
): Promise<Blob> {
  await waitForFonts();

  const W = 1600;
  const H = 600;
  const { canvas, ctx } = createScaledCanvas(W, H);

  // Background
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.fillStyle = COLORS.foreground;
  ctx.font = `bold 16px ${FONT_BODY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Flow Waveform — ${waveform.dateStr}`, 40, 30);

  // Viewport time range label
  const startMin = Math.floor(viewStart / 60);
  const endMin = Math.ceil(viewEnd / 60);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `13px ${FONT_BODY}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${startMin}min – ${endMin}min`, W - 40, 30);

  // Plot area
  const pad = { top: 60, right: 60, bottom: 80, left: 80 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  // Filter flow data within viewport
  const viewPoints = waveform.flow.filter(
    (p) => p.t >= viewStart && p.t <= viewEnd
  );

  if (viewPoints.length === 0) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = `16px ${FONT_BODY}`;
    ctx.textAlign = 'center';
    ctx.fillText('No data in viewport', W / 2, H / 2);
    drawWatermark(ctx, W / 2, H - 40);
    return canvasToBlob(canvas);
  }

  // Determine Y range from visible data
  let flowMin = Infinity;
  let flowMax = -Infinity;
  for (const p of viewPoints) {
    if (p.min < flowMin) flowMin = p.min;
    if (p.max > flowMax) flowMax = p.max;
  }
  // Add 10% padding
  const yRange = flowMax - flowMin || 1;
  flowMin -= yRange * 0.1;
  flowMax += yRange * 0.1;

  const timeRange = viewEnd - viewStart || 1;

  function toCanvasX(t: number): number {
    return pad.left + ((t - viewStart) / timeRange) * plotW;
  }

  function toCanvasY(v: number): number {
    return pad.top + plotH - ((v - flowMin) / (flowMax - flowMin)) * plotH;
  }

  // Zero line
  if (flowMin < 0 && flowMax > 0) {
    const zeroY = toCanvasY(0);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(pad.left, zeroY);
    ctx.lineTo(pad.left + plotW, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Flow envelope (filled area between min and max)
  ctx.beginPath();
  // Top edge (max values, left to right)
  for (let i = 0; i < viewPoints.length; i++) {
    const x = toCanvasX(viewPoints[i].t);
    const y = toCanvasY(viewPoints[i].max);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  // Bottom edge (min values, right to left)
  for (let i = viewPoints.length - 1; i >= 0; i--) {
    const x = toCanvasX(viewPoints[i].t);
    const y = toCanvasY(viewPoints[i].min);
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(33, 150, 243, 0.25)';
  ctx.fill();

  // Envelope outline
  ctx.strokeStyle = COLORS.primary;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < viewPoints.length; i++) {
    const x = toCanvasX(viewPoints[i].t);
    const y = toCanvasY(viewPoints[i].max);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(33, 150, 243, 0.6)';
  ctx.beginPath();
  for (let i = 0; i < viewPoints.length; i++) {
    const x = toCanvasX(viewPoints[i].t);
    const y = toCanvasY(viewPoints[i].min);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  // X-axis: time labels
  const tickInterval = bestTickInterval(timeRange);
  const firstTick = Math.ceil(viewStart / tickInterval) * tickInterval;

  ctx.fillStyle = COLORS.muted;
  ctx.font = `12px ${FONT_MONO}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let t = firstTick; t <= viewEnd; t += tickInterval) {
    const x = toCanvasX(t);
    const minutes = Math.floor(t / 60);
    const seconds = Math.round(t % 60);
    const label = seconds === 0 ? `${minutes}m` : `${minutes}:${String(seconds).padStart(2, '0')}`;

    // Tick mark
    ctx.strokeStyle = COLORS.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, pad.top + plotH);
    ctx.lineTo(x, pad.top + plotH + 6);
    ctx.stroke();

    ctx.fillText(label, x, pad.top + plotH + 10);
  }

  // Y-axis: flow labels (L/min)
  const yTickCount = 5;
  const yStep = (flowMax - flowMin) / yTickCount;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= yTickCount; i++) {
    const val = flowMin + i * yStep;
    const y = toCanvasY(val);

    ctx.fillStyle = COLORS.muted;
    ctx.font = `11px ${FONT_MONO}`;
    ctx.fillText(val.toFixed(0), pad.left - 10, y);

    // Grid line
    ctx.strokeStyle = '#1a2235';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(pad.left + plotW, y);
    ctx.stroke();
  }

  // Y-axis label
  ctx.save();
  ctx.translate(20, pad.top + plotH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = COLORS.muted;
  ctx.font = `12px ${FONT_BODY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Flow (L/min)', 0, 0);
  ctx.restore();

  // Axes
  ctx.strokeStyle = COLORS.muted;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad.left, pad.top);
  ctx.lineTo(pad.left, pad.top + plotH);
  ctx.lineTo(pad.left + plotW, pad.top + plotH);
  ctx.stroke();

  // Watermark
  drawWatermark(ctx, W / 2, H - 30);

  return canvasToBlob(canvas);
}

/**
 * Pick a sensible tick interval for the time axis based on visible range.
 */
function bestTickInterval(rangeSeconds: number): number {
  const targets = [5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600];
  const idealCount = 8;
  const idealStep = rangeSeconds / idealCount;

  for (const t of targets) {
    if (t >= idealStep) return t;
  }
  return targets[targets.length - 1];
}

/**
 * Generate a standardised filename for exported chart images.
 */
export function generateFilename(type: string, dateStr: string): string {
  return `airwaylab-${type}-${dateStr}.png`;
}

/**
 * Share via Web Share API if available and supported, otherwise download.
 */
export async function shareOrDownload(
  blob: Blob,
  filename: string
): Promise<void> {
  // Try Web Share API with File support
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    typeof File !== 'undefined'
  ) {
    try {
      const file = new File([blob], filename, { type: 'image/png' });
      // Check if sharing files is supported
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'AirwayLab Analysis',
        });
        return;
      }
    } catch (err) {
      // AbortError means user cancelled — that's fine, don't fall through to download
      if (err instanceof Error && err.name === 'AbortError') return;
      // Other errors: fall through to download
    }
  }

  downloadBlob(blob, filename);
}

/**
 * Download a blob by creating a temporary anchor element.
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Clean up after a short delay to allow download to start
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 100);
}
