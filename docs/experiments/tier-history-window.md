# Experiment: Community Tier History Window

## Overview

Tests whether expanding the community tier's history window beyond the default increases
retention and upgrade conversion among free users who hit the cap.

## Flag

**Name:** `tier_history_window_days`  
**Type:** String (number as string, e.g. `"7"`, `"14"`, `"30"`)  
**Created:** 2026-05-15  
**Status:** Not yet active (100% control)

## Variants

| Variant | Value | Description |
|---------|-------|-------------|
| control | *(flag absent / null)* | Default — uses `getAnalysisWindowDays('community')` (currently 14 days) |
| 7d | `"7"` | Restrict to 7-day window (regression baseline) |
| 30d | `"30"` | Expand to 30-day window |

## Code Implementation

- **`lib/analysis-orchestrator.ts`** — `filterNightsToTierWindow` accepts `overrideWindowDays?: number`; used only when `tier === 'community'`
- **`hooks/use-tier-history-window-days.ts`** — reads `tier_history_window_days` flag via `posthog.getFeatureFlag()`; returns `undefined` on fallback (caller uses default)
- **`app/analyze/page.tsx`** — passes resolved days to `orchestrator.analyze()`; fires `tier_window_hit` event after analysis

## Events & Properties

### `tier_window_hit`
Fired when a community user's analysis results are capped by the tier window.

| Property | Type | Description |
|----------|------|-------------|
| `cohort` | string | Flag variant value or `"control"` |
| `nights_total` | number | Total nights before window filter |
| `nights_capped` | number | Nights excluded by the window |
| `tier_window_days` | number | Effective window in days |
| `is_free_user` | boolean | Always `true` (community tier only) |

### `cap_encountered_at` (person property)
ISO timestamp of first cap encounter. Written once per device (guarded by
`airwaylab_cap_first_encounter` localStorage key).

## Metrics

**Primary:** 7-day upgrade rate for users who triggered `tier_window_hit`  
**Secondary:** Session retention (return visits within 14 days), nights analysed per session

## Expected Effect

Hypothesis: users on a 30-day window see more historical context, reducing friction and
increasing the perceived value of the premium tier, leading to higher upgrade conversion.

## Launch Checklist

- [ ] Flag created in PostHog dashboard with variants `7`, `14`, `30`
- [ ] Start with 100% control; validate `tier_window_hit` event appearing in PostHog
- [ ] Roll out to 10% traffic in each variant for 2 weeks minimum
- [ ] Read date: 2026-06-15 (4 weeks minimum for statistical significance)
- [ ] Minimum detectable effect: 2pp lift in 7-day upgrade rate

## MDR Note

Event payloads contain only metadata (counts, flags, cohort labels). No raw sleep data,
no dates, no personally identifiable health information is transmitted.
