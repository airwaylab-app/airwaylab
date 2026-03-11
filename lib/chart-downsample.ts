// ============================================================
// AirwayLab — Chart Data Downsampling
// Reduces large datasets to prevent browser OOM crashes
// when Recharts renders too many SVG elements.
// Uses Largest-Triangle-Three-Buckets (LTTB) inspired approach
// that preserves visual shape while reducing point count.
// ============================================================

/**
 * Maximum number of data points to pass to a single Recharts chart.
 * At typical chart widths (~600–1200px), more than this many points
 * creates SVG elements that exceed browser memory limits, especially
 * when 6+ charts are rendered simultaneously in the Graphs tab.
 */
export const MAX_CHART_POINTS = 1500;

/**
 * Downsample a time-series array for chart rendering.
 * Keeps first and last points, then selects evenly-spaced samples
 * from the interior. This preserves the overall shape and ensures
 * the time axis endpoints are accurate.
 *
 * Returns the original array if it's already within the limit.
 */
export function downsampleForChart<T>(data: T[], maxPoints = MAX_CHART_POINTS): T[] {
  if (data.length <= maxPoints) return data;

  const result: T[] = new Array(maxPoints);
  result[0] = data[0];
  result[maxPoints - 1] = data[data.length - 1];

  const step = (data.length - 1) / (maxPoints - 1);
  for (let i = 1; i < maxPoints - 1; i++) {
    result[i] = data[Math.round(i * step)];
  }

  return result;
}

/**
 * Sanitize a numeric value for SVG rendering.
 * Replaces NaN, Infinity, and -Infinity with a fallback value.
 */
export function sanitizeNumber(value: number, fallback = 0): number {
  if (!Number.isFinite(value)) return fallback;
  return value;
}
