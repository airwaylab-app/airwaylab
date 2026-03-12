# AirwayLab

Open-core sleep/airway analysis tool for CPAP/BiPAP users. Parses ResMed SD card data (EDF format), runs four independent analysis engines entirely in the browser, and provides AI-powered therapy insights via Claude Haiku.

## Stack

Next.js 14 (App Router) · TypeScript (strict) · Tailwind CSS 3.4 · shadcn/ui with @base-ui/react · Recharts 3.8 · Supabase (EU region, RLS always on) · Vercel · Anthropic Claude Haiku · Vitest · Web Workers

## Privacy Architecture

AirwayLab has a two-tier architecture:

**Tier 1 — Browser-only (default):** All core analysis runs client-side in a Web Worker. EDF files are parsed, flow data extracted, and all four engines execute without any network request. Results persist in localStorage (`airwaylab_` prefix, 30-day expiry, 4MB cap). No data leaves the browser. Ever.

**Tier 2 — Server-enhanced (opt-in):** Users can explicitly opt in to features that require server communication: AI-powered insights (sends metrics, never raw waveforms), data contribution (anonymised aggregate metrics to Supabase), and premium features behind the `ailab-beta-2026` gate. Every server interaction requires informed, affirmative consent.

The distinction matters for every feature decision: if it touches user health data and doesn't have explicit consent, it must stay in Tier 1.

## Build & Verify

```bash
npm run dev          # Dev server (localhost:3000)
npx tsc --noEmit     # Type check (run before every commit)
npm run lint         # ESLint
npm run build        # Full production build
npm test             # Vitest (unit tests)
```

Always run `npx tsc --noEmit` and `npm run build` before considering work done.

## Directory Structure

```
airwaylab/
├── app/                    → Next.js App Router pages + API routes
│   ├── page.tsx            → Landing page
│   ├── layout.tsx          → Root layout (fonts, meta, providers)
│   ├── globals.css         → Tailwind base + CSS variables
│   ├── analyze/            → Analysis dashboard (upload + results)
│   ├── about/              → About page with methodology docs
│   ├── pricing/            → Pricing page
│   ├── blog/               → Blog with MDX-style posts
│   ├── changelog/          → Version changelog
│   ├── supporters/         → Supporter acknowledgements
│   ├── auth/               → Auth callback handlers
│   └── api/                → API routes (all require auth middleware)
│       ├── ai-insights/    → Claude Haiku analysis endpoint
│       ├── contribute-data/→ Anonymised data contribution
│       ├── create-checkout-session/ → Stripe checkout session
│       ├── customer-portal/→ Stripe customer portal
│       ├── webhooks/stripe/ → Stripe webhook handler
│       ├── feedback/       → User feedback submission
│       ├── files/          → File management endpoints
│       ├── github-stars/   → GitHub star count proxy (cached)
│       ├── health/         → Health check
│       ├── submit-error-data/ → Parse failure data submission
│       └── stats/          → Aggregate statistics
├── components/
│   ├── auth/               → Auth modal, user menu, upgrade prompt, storage
│   ├── charts/             → Recharts visualisations (trend, radar, heatmap, waveform)
│   ├── common/             → Shared UI (metric cards, explanations, badges, disclaimers)
│   ├── dashboard/          → Dashboard tabs (overview, Glasgow, flow, oximetry, trends, waveform)
│   ├── layout/             → Header + Footer
│   ├── ui/                 → shadcn/ui primitives (button, card, tabs, tooltip, etc.)
│   └── upload/             → File upload, validation, consent dialogs
├── lib/
│   ├── analyzers/          → ⚠️ PROTECTED — Analysis engines (do not modify logic)
│   │   ├── glasgow-index.ts → 9-component breath shape scoring (0–8 scale)
│   │   ├── wat-engine.ts    → FL Score, Regularity (SampEn), Periodicity (FFT)
│   │   ├── ned-engine.ts    → NED, FI, M-shape, RERA detection, EAI
│   │   └── oximetry-engine.ts → 17-metric SpO2/HR framework
│   ├── parsers/            → ⚠️ PROTECTED — File parsers
│   │   ├── edf-parser.ts   → EDF (European Data Format) binary parser
│   │   ├── night-grouper.ts → Groups EDF sessions into clinical nights
│   │   ├── settings-extractor.ts → Machine settings from STR.edf
│   │   └── oximetry-csv-parser.ts → Viatom/Checkme O2 Max CSV parser
│   ├── auth/               → Supabase auth context, feature gating
│   ├── insights.ts         → Rule-based insight generator (6 categories, capped at 6/night)
│   ├── thresholds.ts       → Traffic light system (green/amber/red)
│   ├── persistence.ts      → localStorage save/load with size guards
│   ├── export.ts           → CSV and JSON export
│   ├── forum-export.ts     → Reddit/ApneaBoard formatted export
│   ├── pdf-report.ts       → PDF report generation
│   ├── ai-insights-client.ts → Client-side AI insights fetcher
│   ├── analytics.ts        → Plausible event helpers
│   ├── metric-explanations.ts → Human-readable metric descriptions
│   └── utils.ts            → cn() utility (clsx + tailwind-merge)
├── workers/
│   └── analysis-worker.ts  → ⚠️ PROTECTED — Web Worker orchestrator
├── hooks/                  → Custom React hooks (client-side only)
├── __tests__/              → Vitest test files
│   ├── setup.ts            → Test setup (@testing-library/jest-dom)
│   └── *.test.ts           → 16 test files covering engines, exports, insights, etc.
├── supabase/
│   └── migrations/         → Database migrations (append-only, never edit existing)
└── public/                 → Static assets (OG image, favicons)
```

**⚠️ PROTECTED modules** (`lib/parsers/`, `lib/analyzers/`, `workers/`): These contain clinically validated algorithms. String changes (comments, logs) are fine, but never modify logic without explicit discussion and clinical understanding.

## Analysis Engines

### Glasgow Index (`lib/analyzers/glasgow-index.ts`)
Ported from DaveSkvn/Glasgow-Index (GPL-3.0). Scores inspiratory flow shapes on 9 components (0–1 each): skew, spike, flatTop, topHeavy, multiPeak, noPause, inspirRate, multiBreath, variableAmp. Overall score = sum of 8 (excludes topHeavy), range 0–8. Pipeline: findMins → findInspirations → calcCycleBasedIndicators → inspirationAmplitude → prepIndices. Multi-session nights use duration-weighted averaging.

### WAT — Wobble Analysis Tool (`lib/analyzers/wat-engine.ts`)
Three metrics: FL Score (inspiratory flatness, 0–100, higher = worse), Regularity (Sample Entropy on minute ventilation, higher = more irregular), Periodicity Index (FFT power in 0.01–0.03 Hz band, detects periodic breathing at 30–100s cycles). Includes a Cooley-Tukey radix-2 FFT implementation.

### NED — Negative Effort Dependence (`lib/analyzers/ned-engine.ts`)
Per-breath analysis: NED = (Qpeak − Qmid) / Qpeak × 100, Flatness Index = mean/peak, Tpeak/Ti ratio, M-shape detection (valley < 80% Qpeak in middle 50% of inspiration). RERA detection: runs of 3–15 breaths with progressive FL features evaluated by NED slope, recovery breath, and sigh detection. Estimated Arousal Index (EAI): respiratory rate + tidal volume spikes vs 120s rolling baseline. Night summary includes H1/H2 split and combined FL percentage.

### Oximetry Pipeline (`lib/analyzers/oximetry-engine.ts`)
17-metric framework from Viatom/Checkme O2 Max CSV data. Cleaning pipeline: buffer zone trimming (15min start, 5min end), motion filter, invalid sample removal, SpO2 range validation (50–100), HR double-tracking correction. Metrics: ODI-3/ODI-4 (2min rolling baseline), HR Clinical surges (30s baseline, 8/10/12/15 bpm thresholds), HR Rolling Mean surges (5min baseline, 5s sustain), coupled events (ODI + HR within ±30s), desaturation time, summary stats, H1/H2 splits.

## Component Patterns

- **Server Components by default.** Only add `'use client'` when state, effects, or browser APIs are needed.
- **shadcn/ui with @base-ui/react** — NOT Radix primitives. Check `components/ui/` for available primitives.
- **Dashboard tabs** use the shared `Tabs` component. Each tab receives `NightResult` data and renders independently.
- **Metric cards** use `MetricCard` with traffic light colours from `thresholds.ts`.
- **Charts** use Recharts 3.8. All chart components include an "airwaylab.app" watermark.
- **Auth state** flows through `AuthProvider` (context) → `useAuth()` hook. Feature gating via `canAccess()` and the `ailab-beta-2026` gate.
- **Insights** are generated by `generateInsights()` — rule-based, 6 categories (glasgow, wat, ned, oximetry, therapy, trend), 4 types (positive, warning, actionable, info), sorted by priority, capped at 6 per night.
- **Threshold system**: `THRESHOLDS` defines green/amber/red boundaries per metric. `getTrafficLight(value, threshold)` returns the colour tier. All threshold colours use Tailwind classes (`text-emerald-500`, `text-amber-500`, `text-red-500`).

## Testing Conventions

- **Framework:** Vitest 4.0 with jsdom environment and `@testing-library/jest-dom` matchers.
- **Location:** `__tests__/*.test.ts(x)` — flat directory, one file per module.
- **Naming:** `{module-name}.test.ts` matching the source file name.
- **Pattern:** Each test file creates synthetic data via helper functions (e.g., `makeSineWave`, `makeFlatToppedWave`) rather than using fixture files. This keeps tests self-contained and fast.
- **What's tested:** All four analysis engines, insights generator, export functions, persistence, thresholds, upload validation, metric explanations. Focus is on value ranges, boundary conditions, and comparative behaviour (e.g., "flow-limited data scores higher than normal").
- **Path alias:** Tests use `@/` imports resolved to project root.
- **Run:** `npm test` (single run) or `npx vitest` (watch mode).

## Key Design Decisions

1. **Privacy-first with opt-in sharing.** Core analysis is browser-only. Server features require explicit consent. This is a non-negotiable architectural constraint, not a preference.

2. **Two-tier architecture.** Free tier (Tier 1) is complete — all engines, insights, exports, persistence. Premium tier (Tier 2) adds AI-powered analysis via Claude Haiku behind the `ailab-beta-2026` feature gate. Premium funds development; it does not gate essential analysis.

3. **Haiku over Sonnet/Opus.** Cost constraint for a side project with a 2hr/week maintenance budget. Haiku is sufficient for structured sleep data analysis. Do not upgrade model without discussion.

4. **localStorage persistence.** Results persist for 30 days under `airwaylab_results` key with a 4MB cap. Bulk data (per-breath arrays) is stripped before serialisation. Date objects are restored on load. Migration guards handle schema evolution (e.g., `estimatedArousalIndex` added in v0.6.0).

5. **Web Workers for analysis.** The analysis worker (`workers/analysis-worker.ts`) runs all parsing and engine computation off the main thread. It yields control periodically (every 25 EDF files parsed, every 10 nights analysed) to prevent browser lockup on large SD cards.

6. **EDF parsing quirks.** ResMed EDF files use 2-digit years (year < 85 → 2000s, else 1900s). BRP.edf files contain flow waveforms. STR.edf contains machine settings. Identification.tgt contains device model. Sampling rates vary by device (typically 25 Hz for AirSense 10).

7. **Supabase EU region.** GDPR requirement. RLS must be enabled on every table before use. Auth is Supabase Auth only — no OAuth/social login.

8. **Open-core model (GPL-3.0).** The Glasgow Index engine is ported from DaveSkvn/Glasgow-Index (GPL-3.0), which requires the entire project to be GPL-3.0. This aligns with the mission: open data, open code, verifiable trust.

9. **Dark-only theme.** No light mode. Clinical aesthetic with HSL CSS variables defined in `globals.css` and referenced in `tailwind.config.ts`.

10. **Rule-based insights before AI.** The insight generator (`lib/insights.ts`) uses deterministic rules and clinical thresholds, not ML. AI insights (Claude Haiku) are an optional enhancement, not a replacement.

## Conventions

- TypeScript strict — no `any`, no `@ts-ignore` unless documented why
- Server Components by default, `'use client'` only when state/effects are needed
- Zod for all external data validation (API inputs, file uploads, env vars)
- Named exports — default exports only for page/layout components (Next.js requirement)
- Tailwind only — no CSS modules, no styled-components, no inline styles
- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- Branch per feature (`feat/`, `fix/`, `chore/`), never commit directly to main
- `airwaylab_` prefix for all localStorage keys
- Plus Jakarta Sans (body) + JetBrains Mono (code/data)
- Error messages: never expose raw errors to users; map to user-friendly text
- Medical compliance: all AI-generated insights must include "discuss with your clinician" language
- Legal pages: Privacy Policy (`/privacy`), Terms of Service (`/terms`), Accessibility (`/accessibility`), Contact (`/contact`) — keep updated when data flows change
- Every page that collects or displays health data must include the medical disclaimer component
- Every server feature that sends data externally must have an explicit consent step — no implicit consent via feature gates alone
- Every new API route must log the action type + user ID (anonymised if unauthenticated) for audit purposes
- Account deletion requests must be fulfillable within 30 days — any new data store must have a documented deletion path
- Any new third-party integration must be added to the Privacy Policy's processor list before deployment

## Development Workflow

**This workflow is mandatory. Every feature and fix must follow it. No exceptions.**

The root failure mode is: AI-generated code passes automated checks but introduces subtle UI, integration, and logic bugs that compound across features. The fix is friction between "code generated" and "code in production."

### Pipeline: spec → build → verify → review → merge

**1. Spec** (`/spec`)
- Define the problem and simplest solution
- List **failure modes and edge cases** explicitly — not just the happy path
- List **affected existing components** (blast radius analysis)
- Include a **manual test checklist** — specific things to click/verify on the preview deploy
- Wait for approval before proceeding to build

**2. Build** (`/build`)
- Implement the spec. One concern per PR — never bundle unrelated changes.
- Must pass full pipeline: `npm run lint` → `npx tsc --noEmit` → `npm test` → `npm run build`
- Must include tests for the specific edge cases identified in the spec
- E2e tests must pass locally (`npx playwright test`) for any UI-facing change

**3. Verify** (new gate — before requesting merge)
- Push to branch. Vercel creates a preview deploy automatically.
- Report the preview URL and the manual test checklist from the spec.
- **Demian verifies on the preview.** No merge without this step.
- If verification fails → fix on the same branch, re-verify.

**4. Review** (self-review of diff against spec)
- Check: does the diff introduce regressions in existing components?
- Check: null checks, loading states, error states for all new UI
- Check: display formatting with real data, not just synthetic test data
- Check: no hardcoded values, no bundled unrelated changes
- Check: e2e selectors match actual rendered DOM

**5. Merge**
- Only after verify + review pass
- Squash merge to main
- Monitor Vercel deploy + Sentry for 5 minutes post-deploy

### PR Discipline

- **One concern per PR.** A feature is one PR. A bug fix is one PR. Never combine.
- **Max 3 feature PRs per session.** Prevents avalanche deployments where bugs compound.
- **Fix-on-fix = red flag.** If a fix needs a follow-up fix, the original spec missed edge cases. Stop and re-spec before continuing.
- **No orphan e2e tests.** E2e tests ship in the same PR as the feature they test, not in separate PRs and not bundled into unrelated PRs.
- **Green CI before merge.** All pipeline stages must pass. If e2e is flaky, fix the flake — don't merge around it.

### Pre-Merge Checklist (copy into every PR)

```markdown
- [ ] Full pipeline passes (lint, typecheck, test, build)
- [ ] E2e tests pass locally for UI changes
- [ ] Vercel preview deploy verified by Demian
- [ ] Self-review: no regressions in existing components
- [ ] Self-review: loading, error, and empty states handled
- [ ] PR contains one concern only — no bundled changes
```

## Anti-Patterns

- **Never send health data without consent.** No analytics on waveform data, no silent uploads, no background syncing. If data leaves the browser, the user must have opted in.
- **Never exceed the 4MB localStorage cap.** Strip bulk data (per-breath arrays, raw waveforms) before persisting. Pre-flight size check in `persistence.ts`.
- **Never modify engine logic without clinical understanding.** The engines implement published respiratory analysis methodologies. A "refactoring" that changes threshold values or algorithm steps can produce clinically incorrect results.
- **Never modify, rescale, or transform Glasgow scores.** The Glasgow component scores (0–1 per component, 0–8 overall) are clinically validated metrics from the Glasgow Index methodology. Visualisation code must adapt the chart scale to fit the data — never change the data to fit the chart. This applies to all presentation layers (charts, tooltips, exports, reports).
- **Never create API routes without auth middleware.** Every `app/api/` route must validate authentication.
- **Never use `console.log` in production.** Use `console.error` with structured context for debugging; these flow to Vercel logs + Sentry.
- **Never hardcode secrets.** Use `process.env` with Zod validation. Add new vars to `.env.example`.
- **Never install dependencies without discussion.** Each dependency is maintenance cost against the 2hr/week budget.
- **Never use `any` or `@ts-ignore`.** If TypeScript complains, the types are wrong — fix them.
- **Never present analysis as medical advice.** Always include "discuss with your clinician" language. This is a consumer health tool, not a medical device.
- **Never deploy a new third-party data integration without updating the Privacy Policy.** The processor table in `/privacy` must reflect all services that receive user data.
- **Never store health data server-side without documenting retention period and deletion mechanism.** Every table with health-related data must have a documented retention schedule and a path to deletion for DSAR requests.
- **Never add automated decision-making (AI/ML) features without an explicit user consent step.** GDPR requires informed consent for automated processing of health data. Use the `AIConsentModal` pattern or similar.
- **Never remove or weaken medical disclaimers from any output.** All exports (CSV, JSON, PDF, forum), reports, AI insights, and chart images must include the standard disclaimer language.
- **Never merge without Vercel preview verification.** Passing CI is necessary but not sufficient. Demian must verify the preview deploy before merge.
- **Never bundle unrelated changes in one PR.** Each PR addresses exactly one concern. A feature + unrelated e2e tests = two PRs. A bug fix + a refactor = two PRs.
- **Never ship more than 3 feature PRs in a single session.** If bugs compound across features, the cost of debugging exceeds the value of shipping fast.

## Common Gotchas

- **Flat directory structure.** There is no `src/` directory. `app/`, `components/`, `lib/`, `workers/` are at the project root.
- **EDF date parsing.** 2-digit years: < 85 → 2000s, ≥ 85 → 1900s. Date format is `dd.MM.yy`.
- **Float32Array vs number[].** Flow data uses `Float32Array` for memory efficiency. These are not serialisable to JSON — `persistence.ts` strips them before saving.
- **Duration-weighted averaging.** Glasgow Index uses duration-weighted averaging across sessions within a night. Don't simple-average multi-session results.
- **H1/H2 split.** NED and Oximetry results include first-half / second-half comparisons. The split point is the midpoint of the concatenated data, not midnight.
- **Sampling rate varies.** Don't hardcode 25 Hz. Use the rate from the parsed EDF header.
- **Oximetry is optional.** `NightResult.oximetry` can be `null`. Always null-check before rendering oximetry metrics.
- **Duplicate files.** The repo contains macOS-created duplicates (e.g., "file 2.tsx"). These should be cleaned up when encountered but are not functional files.
- **Feature gate check.** Premium features use `canAccess('ai_insights', tier)` — always check before exposing premium functionality.
