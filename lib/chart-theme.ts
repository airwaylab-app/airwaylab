// ============================================================
// AirwayLab — Centralized Chart Color Theme
// Single source of truth for all Recharts color values.
// CSS variable equivalents are defined in globals.css (:root).
// ============================================================

/** Ordered chart palette — 6 accessible, distinguishable colors on dark backgrounds. */
export const CHART_COLORS = [
  'hsl(213 94% 56%)',  // chart-1: blue (primary series, Glasgow)
  'hsl(142 71% 45%)',  // chart-2: emerald (good/healthy, FL Score)
  'hsl(38 92% 50%)',   // chart-3: amber (monitor, NED)
  'hsl(262 83% 58%)',  // chart-4: purple (supplementary)
  'hsl(0 84% 60%)',    // chart-5: rose (elevated, RERA)
  'hsl(188 94% 43%)',  // chart-6: cyan (6th series)
] as const;


/**
 * Apply alpha to an HSL color string.
 * Converts 'hsl(H S% L%)' → 'hsl(H S% L% / alpha)'.
 */
export function withAlpha(hsl: string, alpha: number): string {
  return hsl.replace(')', ` / ${alpha})`);
}

// ── Shared Recharts style constants ────────────────────────────

/** Grid stroke for CartesianGrid */
export const GRID_STROKE = 'hsl(217 33% 15% / 0.3)';

/** Axis tick fill */
export const AXIS_TICK_FILL = 'hsl(215 20% 55%)';

/** Axis line stroke */
export const AXIS_LINE_STROKE = 'hsl(217 33% 15%)';

/** Tooltip container styles */
export const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(217 33% 8%)',
  border: '1px solid hsl(217 33% 15%)',
  borderRadius: '0.5rem',
  fontSize: 12,
  color: 'hsl(210 40% 93%)',
} as const;
