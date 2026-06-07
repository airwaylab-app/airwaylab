// ============================================================
// AirwayLab — Engine Version
// Bumped when any analysis engine logic changes.
// Used to invalidate cached results and trigger re-contribution.
// ============================================================

/**
 * Current engine version. Bump this when any non-oximetry engine logic changes:
 * - lib/analyzers/glasgow-index.ts
 * - lib/analyzers/wat-engine.ts
 * - lib/analyzers/ned-engine.ts
 * - lib/parsers/night-grouper.ts (affects which data goes to which night)
 *
 * Oximetry has its own version below so an oximetry-only change does not
 * invalidate every user's CPAP results — see OXIMETRY_ENGINE_VERSION.
 */
export const ENGINE_VERSION = '0.9.0';

/**
 * Oximetry analysis version, decoupled from ENGINE_VERSION. Bump ONLY when
 * oximetry analysis changes:
 * - lib/analyzers/oximetry-engine.ts
 * - the oximetry attach / SA2-vs-CSV logic in workers/analysis-worker.ts
 * - lib/oximetry-trace.ts (trace shape)
 *
 * Bumping this re-prompts ONLY users who have oximetry data (their CPAP results
 * are preserved) and re-tags oximetry IDB traces + research contributions.
 * Initialised to the current ENGINE_VERSION value so introducing it is seamless
 * (existing oximetry traces tagged with ENGINE_VERSION still match).
 */
export const OXIMETRY_ENGINE_VERSION = '0.9.0';
