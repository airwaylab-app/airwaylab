# Codebase Refactor Evaluation — Handoff Document

**Date:** 2026-03-17
**Scope:** Full codebase audit of `lib/`, `components/`, `app/`, `hooks/`, `workers/`, `__tests__/`, and config files.

---

## Executive Summary

The codebase is well-structured overall, with clear separation of concerns and strong privacy architecture. However, there are significant opportunities for reducing duplication, improving consistency, and strengthening test coverage. The findings below are grouped by priority tier.

**Key numbers:**
- ~7 duplicate `fmt()` helper functions across lib files
- ~9 duplicate `webkitRelativePath` type assertions
- 3 dashboard tabs over 400 lines each (OverviewTab: 621 lines)
- 20+ API routes with duplicated error/auth/rate-limit boilerplate
- 930 lines of hook code with 0% test coverage
- 3 engine test files duplicating waveform generator helpers

---

## TIER 1 — Must Do (High impact, low risk)

### 1.1 Extract `lib/format-utils.ts`

**Problem:** `fmt(n, dp)` is duplicated in 7 files: `insights.ts`, `forum-export.ts`, `metric-explanations.ts`, `pdf-report.ts`, `clinician-questions.ts`, and others.

**Fix:** Create `lib/format-utils.ts` exporting:
```typescript
export function fmt(n: number, dp = 1): string { return n.toFixed(dp); }
export function fmtHrs(h: number): string { /* hours:minutes */ }
```

Replace all local definitions with imports. ~30 minutes, zero logic change.

---

### 1.2 Extract `lib/file-path-utils.ts`

**Problem:** 9 instances of `(file as unknown as { webkitRelativePath?: string }).webkitRelativePath` across `analysis-orchestrator.ts`, `file-manifest.ts`, `upload-validation.ts`, `storage/upload-orchestrator.ts`, `contribute-waveforms.ts`, and others.

**Fix:** Create:
```typescript
export function getFilePath(file: File): string {
  return (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name;
}
```

Single cast in one place. ~20 minutes.

---

### 1.3 Extract `lib/stats-utils.ts`

**Problem:** `mean()`, `trend()`, and `trendLowerBetter()` are defined locally in `insights.ts` and repeated in concept elsewhere.

**Fix:** Centralize statistical helpers. ~20 minutes.

---

### 1.4 Extract shared test waveform generators

**Problem:** `makeSineWave()` and `makeFlatToppedWave()` are duplicated across `glasgow-index.test.ts`, `wat-engine.test.ts`, and `ned-engine.test.ts` with slightly different implementations.

**Fix:** Create `__tests__/helpers/waveform-generators.ts` with unified implementations. ~30 minutes.

---

### 1.5 Fix `console.error` misuse in worker

**Problem:** `workers/analysis-worker.ts` uses `console.error` for success/info messages (lines 234, 248, 264, 266), polluting error logs and Sentry.

**Fix:** Change to `console.info` or conditional dev-only logging. ~10 minutes.

---

## TIER 2 — Should Do (Moderate impact, moderate effort)

### 2.1 API route middleware extraction

**Problem:** 20+ API routes duplicate these patterns:
- Auth check boilerplate (8+ routes): `getSupabaseServer()` → `getUser()` → error responses
- Payload size guards (4 routes): content-length check with `MAX_PAYLOAD_BYTES`
- Rate limiter init + check (15+ routes)
- Origin validation (15+ routes)
- Error response with Sentry capture

**Fix:** Create shared utilities:
- `lib/api/require-auth.ts` — returns `{ user, serviceRole }` or error response
- `lib/api/validate-body.ts` — Zod validation + error response
- `lib/api/check-payload-size.ts` — size guard
- Consider a `withApiMiddleware()` wrapper composing these

**Effort:** 4-6 hours. Reduces each route by ~20-30 lines.

---

### 2.2 Split `OverviewTab` (621 lines)

**Problem:** `components/dashboard/overview-tab.tsx` handles 12+ responsibilities: summary hero, symptom rating, device settings, IFL grid, Glasgow breakdown, AI insights, secondary metrics, oximetry, heatmap, upgrade prompt, and metric detail modal.

**Fix:** Extract sub-components:
- `OverviewMetricsGrid.tsx` — IFL + primary metrics
- `OverviewSecondaryMetrics.tsx` — secondary metrics grid
- `OximetryQuickView.tsx` — oximetry section
- `DeviceSettingsPanel.tsx` — collapsible device settings

Keep `OverviewTab` as orchestrator at ~200 lines. **Effort:** 4 hours.

---

### 2.3 Split `app/analyze/page.tsx` (967 lines)

**Problem:** Single component with 14 `useState` calls managing analysis orchestration, file upload, demo mode, contribution nudging, cloud sync, persistence, auth modal, and 8 tabs.

**Fix:** Extract custom hooks:
- `useAnalysisState()` — orchestrator subscription + persistence
- `useDemoMode()` — demo loading/reset
- `useContribution()` — contribution flow state
- `<ContributionManager>` — contribution UI logic

**Effort:** 6-8 hours.

---

### 2.4 Refactor `singleNightInsights()` (450+ lines)

**Problem:** `lib/insights.ts` has a 450+ line function with 30+ inline insight generators and deeply nested conditionals.

**Fix:** Refactor into modular insight generators:
```typescript
const generators: InsightGenerator[] = [
  glasgowInsight,
  watInsight,
  nedInsight,
  oximetryInsight,
  therapyInsight,
  trendInsight,
];
```

Each generator is a pure function returning `Insight[]`. **Effort:** 3 hours.

---

### 2.5 Standardize error handling patterns

**Problem:** Three inconsistent patterns across the codebase:
- **Pattern A:** `console.error` + `Sentry.captureException` (hooks, some API routes)
- **Pattern B:** Silent `catch {}` (worker parse failures, file-manifest, night-notes)
- **Pattern C:** `console.error` only (auth-context)

**Fix:** Create `lib/error-utils.ts`:
```typescript
export function captureError(err: unknown, context: string, extra?: Record<string, unknown>): void {
  console.error(`[${context}]`, err);
  Sentry.captureException(err, { tags: { context }, extra });
}
```

Apply consistently. Never use silent catches without a documented reason. **Effort:** 2-3 hours.

---

### 2.6 Create `useAsyncForm()` hook

**Problem:** `email-opt-in.tsx`, `auth-modal.tsx`, and `feedback-widget.tsx` all implement identical form state: `status: 'idle' | 'loading' | 'success' | 'error'` + `error: string | null` + submit handler.

**Fix:**
```typescript
function useAsyncForm<T>(onSubmit: (data: T) => Promise<void>) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  // ... handle submit, reset
  return { status, error, isLoading: status === 'loading', handleSubmit, reset };
}
```

**Effort:** 2 hours (hook + migrate 3 components).

---

### 2.7 Create shared `H1H2ComparisonTable`

**Problem:** `flow-analysis-tab.tsx` (3-column grid) and `oximetry-tab.tsx` (HTML table) display H1/H2 split data with different layouts for the same concept.

**Fix:** Single `H1H2ComparisonTable.tsx` component used by both tabs. **Effort:** 1 hour.

---

### 2.8 Flatten promise chains in `use-waveform.ts`

**Problem:** Lines 32-96 have deeply nested `.then().then().catch().finally()` chains with 7+ cancellation checks creating visual noise.

**Fix:** Refactor to `async/await` with early returns. Extract cloud loading logic to a helper function. **Effort:** 1 hour.

---

## TIER 3 — Nice to Have (Lower impact or higher risk)

### 3.1 Add test coverage for hooks (930 LOC, 0% covered)

**Gap:** `use-chart-viewport.ts` (373 lines), `use-waveform.ts` (127 lines), `use-shared-waveform.ts` (119 lines), `use-focus-trap.ts` (67 lines) — all untested.

**Priority:** `use-chart-viewport.ts` (complex event handling), then `use-waveform.ts` (promise chain logic).

---

### 3.2 Add vitest coverage configuration

**Gap:** `vitest.config.ts` has no `coverage` block. No threshold enforcement.

**Fix:** Add coverage provider + thresholds.

---

### 3.3 Export private helpers for testing

**Problem:** `__tests__/analysis-orchestrator.test.ts` duplicates `mergeNights()` and `detectTherapyChange()` inline because they aren't exported from the source module.

**Fix:** Export as named functions (they're pure, no side effects).

---

### 3.4 Refactor `use-chart-viewport.ts` event handlers

**Problem:** 7 refs tracking drag/pinch/pan state, mixed touch/mouse logic, no state machine. Complex ref-sync pattern (`zoomInRef.current = zoomIn` on every render).

**Fix:** Introduce explicit `mode: 'idle' | 'dragging' | 'pinching'` state machine. Extract touch/mouse handlers to separate module.

---

### 3.5 Add missing accessibility attributes

**Gaps:**
- `oximetry-tab.tsx` toggle buttons: missing `aria-label`
- `feedback-widget.tsx`: no focus trap (unlike `auth-modal.tsx` which uses one)
- Charts: no keyboard navigation or data table alternatives

---

### 3.6 Memoize expensive dashboard components

**Problem:** `OverviewTab`, `FlowAnalysisTab`, `OximetryTab` are not wrapped in `React.memo()`. Chart data is recomputed on every render in `metric-detail-modal.tsx`.

**Fix:** Add `React.memo()` to tab components, `useMemo()` for chart data arrays.

---

### 3.7 Remove deprecated functions in `waveform-utils.ts`

**Problem:** `downsampleFlow()` and `downsamplePressure()` are marked `@deprecated` but still exported.

**Fix:** Verify no imports exist, then remove.

---

### 3.8 Fix silent data loss in persistence

**Problem:** `persistence.ts` binary-searches for max-fitting nights, silently dropping oldest data. No explicit warning during the search (only after).

**Fix:** Emit a warning to the user when nights are dropped.

---

### 3.9 Validate cached waveforms from IndexedDB

**Problem:** `use-waveform.ts` loads cached waveforms without validating integrity. Corrupted data from failed writes is silently used.

**Fix:** Include version/checksum metadata in IDB store.

---

### 3.10 Clear waveform cache on extraction failure

**Problem:** `use-shared-waveform.ts` caches downloaded files but doesn't clear cache on extraction failure. Retry reuses the cached (failing) files.

**Fix:** Clear `filesCache.current = []` in catch block.

---

### 3.11 Tighten CSP for Sentry

**Problem:** `next.config.mjs` uses `https://*.ingest.de.sentry.io` — overly broad wildcard.

**Fix:** Replace with specific subdomain `https://airwaylab.ingest.de.sentry.io`.

---

### 3.12 Missing user attribution in data routes

**Problem:** `/api/contribute-data/route.ts` and `/api/track-analysis/route.ts` accept data without any authentication or user attribution. No audit trail for research data.

**Fix:** Add optional auth check + user_id field. At minimum, log IP hash for audit.

---

## Architecture Notes (No Action Required)

These are observations, not issues:

1. **Protected modules** (`lib/analyzers/`, `lib/parsers/`, `workers/`) — correctly marked as protected. None of the refactoring proposals touch engine logic.

2. **Two-tier privacy architecture** — well enforced. All proposed extractions maintain the Tier 1/Tier 2 boundary.

3. **Dark-only theme** — consistent throughout. No light mode leaks.

4. **Insight cap (6/night)** — correctly implemented with dedup + priority sort. The modular refactor proposal preserves this behavior.

5. **Worker yield pattern** — functional but could benefit from `scheduler.yield()` when browser support improves. Not a current issue.

---

## Recommended Execution Order

If tackling these as PRs (one concern per PR, max 400 lines per CLAUDE.md):

| PR | Tier | Description | Est. Lines Changed |
|----|------|-------------|-------------------|
| 1 | 1.1 | Extract `lib/format-utils.ts` | ~80 |
| 2 | 1.2 | Extract `lib/file-path-utils.ts` | ~50 |
| 3 | 1.3 | Extract `lib/stats-utils.ts` | ~40 |
| 4 | 1.4 | Shared test waveform generators | ~100 |
| 5 | 1.5 | Fix console.error misuse in worker | ~15 |
| 6 | 2.5 | Standardize error handling | ~150 |
| 7 | 2.6 | Create `useAsyncForm` hook | ~120 |
| 8 | 2.1 | API route middleware (auth) | ~200 |
| 9 | 2.1 | API route middleware (validation + size) | ~200 |
| 10 | 2.4 | Modularize `singleNightInsights()` | ~300 |
| 11 | 2.2 | Split OverviewTab (part 1) | ~350 |
| 12 | 2.2 | Split OverviewTab (part 2) | ~300 |
| 13 | 2.7 | Shared H1/H2 comparison table | ~100 |
| 14 | 2.3 | Extract analyze page hooks | ~350 |
| 15 | 2.8 | Flatten use-waveform promises | ~80 |
