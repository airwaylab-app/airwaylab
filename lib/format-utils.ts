/** Shared formatting and statistical helpers used across insights, exports, and dashboard components. */

/** Format a number to fixed decimal places. */
export function fmt(n: number, dp = 1): string {
  return n.toFixed(dp);
}

/** Format hours as "Xh Ym". */
export function fmtHrs(h: number): string {
  const hrs = Math.floor(h);
  const mins = Math.round((h - hrs) * 60);
  return `${hrs}h ${mins}m`;
}

/** Arithmetic mean. Returns 0 for empty arrays. */
export function mean(vals: number[]): number {
  if (vals.length === 0) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
