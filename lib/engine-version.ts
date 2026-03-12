// ============================================================
// AirwayLab — Engine Version
// Bumped when any analysis engine logic changes.
// Used to invalidate cached results and trigger re-contribution.
// ============================================================

/**
 * Current engine version. Bump this when any engine logic changes:
 * - lib/analyzers/glasgow-index.ts
 * - lib/analyzers/wat-engine.ts
 * - lib/analyzers/ned-engine.ts
 * - lib/analyzers/oximetry-engine.ts
 * - lib/parsers/night-grouper.ts (affects which data goes to which night)
 */
export const ENGINE_VERSION = '0.7.0';
