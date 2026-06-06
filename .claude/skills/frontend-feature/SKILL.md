---
name: frontend-feature
description: >
  Use this skill when implementing UI components, dashboard features,
  landing page changes, chart visualizations, or client-side functionality.
  Don't use for API routes or backend work (use backend-feature),
  bug fixes (use bug-triage), or code review (use code-review).
---

# Frontend Feature Development

Implement client-side features following AirwayLab conventions.

## Scope

Your domain:
- `app/` pages and layouts (NOT app/api/)
- `components/` all UI components
- `hooks/` custom React hooks
- `lib/` client-side utilities (export.ts, persistence.ts, insights.ts, thresholds.ts, analytics.ts, metric-explanations.ts)

NOT your domain:
- `app/api/` (Backend Engineer)
- `lib/analyzers/`, `lib/parsers/`, `workers/` (PROTECTED -- never modify)

## Pre-Implementation

1. Check if a spec exists in `specs/` for this feature
2. Glob + Grep for existing implementations -- build only the delta
3. Check `components/ui/` for available shadcn/ui primitives

## Code Standards

- Server Components by default. `'use client'` only for state/effects/browser APIs.
- shadcn/ui with @base-ui/react (NOT Radix)
- Recharts 3.8 for charts (include "airwaylab.app" watermark)
- Tailwind only for styling
- `airwaylab_` prefix for localStorage keys
- Named exports (default only for page/layout)
- Medical disclaimer on health-related output
- Check lib/analytics.ts for Plausible helpers when adding user-facing features

## Privacy Architecture

- Tier 1 (browser-only, default): no network requests for health data
- Tier 2 (opt-in): requires explicit consent
- If the feature touches health data without consent, it MUST stay Tier 1

## Build Checks (MANDATORY)

```bash
npx tsc --noEmit && npm run lint && npm test && npm run build
```

## Common Gotchas

- No src/ directory -- flat structure at root
- Float32Array not JSON-serialisable -- strip before persisting
- `NightResult.oximetry` can be null -- always check
- 4MB localStorage cap -- strip bulk data before saving
- Feature gate: `canAccess('ai_insights', tier)` for premium features
