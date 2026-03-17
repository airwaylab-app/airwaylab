# AirwayLab Codebase Handoff — Audit Report

**Date:** 2026-03-17
**Scope:** Full codebase audit — 376 source files, 82 test files, 40 API routes
**Purpose:** Identify systemic inefficiencies, bugs, and architectural debt accumulated since project start

---

## Executive Summary

AirwayLab is a well-structured project with strong privacy architecture and clear domain separation. However, rapid feature development has introduced several categories of technical debt:

1. **Two critical algorithm bugs** in protected engines that affect clinical accuracy
2. **Pervasive silent error swallowing** (145 empty `catch {}` blocks across 72 files)
3. **God component anti-pattern** in the main analyze page (967 lines, 14 useState, 9 useEffect)
4. **No shared auth middleware** — auth logic copy-pasted across 40 API routes
5. **Broken toolchain** — ESLint config incompatible with installed ESLint version
6. **Missing TypeScript test config** — `tsc --noEmit` fails on all 82 test files

---

## P0 — Critical Bugs (Clinical Accuracy)

> These are in **protected modules** (`lib/analyzers/`). Changes require clinical understanding per CLAUDE.md. Do not fix without discussion.

### 1. WAT Engine: FFT Frequency Misalignment
- **File:** `lib/analyzers/wat-engine.ts:164-170`
- **Bug:** After zero-padding to next power of 2, frequency bins are computed using the padded length `n` instead of the actual data duration. This shifts the periodic breathing detection band (0.01-0.03 Hz), producing incorrect Periodicity Index values.
- **Fix:** Use `detrended.length * dt` for the frequency denominator, not `n * dt`.
- **Impact:** Every Periodicity Index value in production is slightly off. The magnitude depends on how much padding was added (worst case: data length just over a power of 2).

### 2. NED Engine: Division-by-Zero in RERA Detection
- **File:** `lib/analyzers/ned-engine.ts:362`
- **Bug:** NED slope calculation: `(breathCount * sumXX - sumX * sumX)` can equal zero when all breaths in a sequence have identical NED values. This produces `Infinity`, which then passes the `nedSlope > 0.5` check, falsely triggering RERA criteria.
- **Fix:** Guard the denominator: `if (denom === 0) return 0;`
- **Impact:** False positive RERA detections in sequences with uniform NED values.

### 3. NED Engine: Float Equality in M-shape Detection
- **File:** `lib/analyzers/ned-engine.ts:277`
- **Bug:** Uses `===` to compare Float32Array values. Floating-point equality is unreliable and may fail to find the correct valley index.
- **Fix:** Use epsilon comparison: `Math.abs(inspFlow[i] - minInMiddle) < 1e-6`
- **Impact:** Edge case — could misclassify M-shape breaths.

### 4. Glasgow Index: Off-by-One in findMins()
- **File:** `lib/analyzers/glasgow-index.ts:151`
- **Bug:** Loop condition `winPtr < ptr + MIN_WINDOW - 1` skips the last sample in the search window.
- **Impact:** May miss valid minimum peaks at window boundaries, affecting breath segmentation.

---

## P1 — High-Priority Issues

### 5. Oximetry Engine: Hardcoded Sample Interval
- **File:** `lib/analyzers/oximetry-engine.ts:95-96`
- **Issue:** `SAMPLE_INTERVAL = 2` is hardcoded for Checkme O2 Max. Any device with a different sampling rate (e.g., 1-second intervals) will produce incorrect ODI counts and cooldown windows.
- **Fix:** Accept sample interval as a parameter or infer from data.

### 6. Analysis Worker: No Sampling Rate Validation
- **File:** `workers/analysis-worker.ts:332`
- **Issue:** If all sessions report sampling rate 0, `avgSamplingRate = 0` is passed to engines. NED engine divides by sampling rate (line ~428), causing runtime divide-by-zero.
- **Fix:** Validate `avgSamplingRate > 0` before passing to engines.

### 7. Analysis Worker: Silent Parse Failures
- **File:** `workers/analysis-worker.ts:155-160`
- **Issue:** When `parseEDF()` throws, the file is silently skipped. No warning is posted to the main thread. Users never learn that data was discarded.
- **Fix:** Post a warning message to the main thread with the filename and error.

### 8. ESLint Configuration Broken
- **State:** ESLint 10.0.0 installed but `eslint-config-next@^16.1.6` expects ESLint 9.x. Running `npm run lint` crashes immediately.
- **Fix:** Either pin ESLint to 9.x or update `eslint-config-next` to a version compatible with ESLint 10.

### 9. TypeScript Test Configuration Missing
- **State:** Single `tsconfig.json` includes test files (`**/*.ts`) but doesn't reference vitest types. Running `npx tsc --noEmit` produces errors for all 82 test files.
- **Fix:** Either exclude `__tests__/` from the main tsconfig and add a `tsconfig.test.json`, or add vitest types to the main config.

---

## P2 — Architectural Debt

### 10. God Component: `app/analyze/page.tsx`
- **Size:** 967 lines, 14 `useState` hooks, 9 `useEffect` hooks, 46 imports
- **Problem:** Single component manages upload state, analysis orchestration, night selection, tab rendering, consent flows, demo mode, persisted data loading, cloud sync nudging, and error data submission. This is the root cause of many integration bugs — any state change can cascade unpredictably.
- **Recommendation:** Extract into composable hooks:
  - `useAnalysisOrchestrator()` — manages analysis state machine
  - `usePersistedData()` — handles localStorage load/save
  - `useContributionFlow()` — manages consent + data contribution
  - `useCloudSync()` — handles cloud storage nudging
  - Keep the page component as a thin shell that composes these hooks.

### 11. No Auth Middleware
- **State:** 40 API routes each independently call `supabase.auth.getUser()` with inconsistent error handling patterns. Some destructure `authError`, some don't. Some return 401, some return 403.
- **Fix:** Create a shared `withAuth()` wrapper or Next.js middleware that validates the session once and passes the user to the handler. This eliminates ~80 lines of duplicated auth boilerplate and ensures consistent error responses.

### 12. Silent Error Swallowing (145 instances across 72 files)
- **Pattern:** `catch { /* noop */ }` or `catch { return fallback; }`
- **Breakdown:**
  - ~40 instances in localStorage wrappers — **acceptable** (private browsing throws)
  - ~30 instances in API routes — **concerning** (errors should be logged to Sentry)
  - ~25 instances in component event handlers — **concerning** (user never learns something failed)
  - ~20 instances in lib utilities — **mixed** (some are appropriate fallbacks, some hide bugs)
  - ~15 instances in workers — **concerning** (silent data loss)
  - ~15 instances in other locations
- **Recommendation:** Audit each catch block. Add `Sentry.captureException()` or `console.error()` to non-localStorage catches. For localStorage catches, the current pattern is correct.

### 13. 100 Client Components
- **State:** 100 files have `'use client'`. While many genuinely need client-side interactivity, some may be client components only because they import from a client component chain.
- **Recommendation:** Audit the component tree to identify components that could be server components if their client dependencies were restructured. Priority targets: layout components, static content components.

### 14. `@testing-library/dom` in Production Dependencies
- **File:** `package.json:23`
- **Issue:** `@testing-library/dom` is listed under `dependencies` instead of `devDependencies`. This inflates the production bundle.
- **Fix:** Move to `devDependencies`.

---

## P3 — Performance Inefficiencies

### 15. WAT Engine: O(n^2) Sample Entropy
- **File:** `lib/analyzers/wat-engine.ts:203-217`
- **Issue:** Nested loop compares every pair of templates. For 720 samples (60-minute window at 5-second steps), this is 259K comparisons.
- **Mitigation:** Acceptable for current usage but will become a bottleneck if recording lengths increase. Consider approximation algorithms if performance becomes an issue.

### 16. WAT Engine: Recursive FFT Array Allocation
- **File:** `lib/analyzers/wat-engine.ts:241-244`
- **Issue:** Creates new `even` and `odd` arrays on every recursive call. For 2^16 samples, this creates ~2M temporary arrays, causing GC pressure.
- **Fix:** Implement iterative Cooley-Tukey FFT with bit-reversal permutation.

### 17. Oximetry Engine: Redundant HR Baseline Calculations
- **File:** `lib/analyzers/oximetry-engine.ts:249-266`
- **Issue:** For each ODI event, recomputes HR baseline for every sample in the +/-30s window. Should pre-compute baseline array once.

### 18. Analysis Worker: Repeated Sort on SA2 Concatenation
- **File:** `workers/analysis-worker.ts:227`
- **Issue:** Sorts the entire samples array after each SA2 file is appended. Should collect all files first, then sort once.

### 19. Persistence: Binary Search Re-serializes on Every Iteration
- **File:** `lib/persistence.ts:94-103`
- **Issue:** When data exceeds 4MB, the binary search calls `trySerialise()` up to log(n) times, each time re-stripping bulk data and re-serializing. The stripped data could be cached.

### 20. Persistence: Only Validates First Night
- **File:** `lib/persistence.ts:197-208`
- **Issue:** `loadPersistedResults()` validates the shape of `data.nights[0]` but returns all nights. Corrupted nights after the first pass through unchecked.

---

## P3 — Code Quality & Maintenance

### 21. Console.error Misused for Info Logging
- **File:** `workers/analysis-worker.ts:234, 264`
- **Issue:** Uses `console.error` for successful parse diagnostics. Per CLAUDE.md, `console.error` should be for actual errors. This pollutes Vercel logs and Sentry with false positives.

### 22. No Shared Statistics Utilities
- **Files:** `lib/analyzers/ned-engine.ts:833-859`, `lib/analyzers/oximetry-engine.ts:295-327`
- **Issue:** `mean()`, `std()`, `median()` functions are duplicated across engines.
- **Note:** Engines are intentionally self-contained (protected modules), so this is a conscious trade-off. But a shared `lib/utils/statistics.ts` could be imported by both without breaking encapsulation.

### 23. HR Baseline Calculation Duplicated 3x
- **File:** `lib/analyzers/oximetry-engine.ts:145-155, 192-201, 250-261`
- **Issue:** Same "rolling mean over preceding window" logic copied three times within a single file.

### 24. Email Routes Missing Rate Limiting
- **Files:** `app/api/email/unsubscribe/route.ts`, `app/api/email/trigger/route.ts`, `app/api/email/opt-in/route.ts`
- **Issue:** These routes lack rate limiting, unlike the other 36 API routes that use `RateLimiter`.

### 25. Inconsistent Auth Error Responses
- **State:** Some routes return `{ error: 'Unauthorized' }` with 401, others return `{ error: 'Authentication required' }` with 401, others return 403. No standard error shape.

---

## Toolchain & Configuration

### 26. Node Modules Not Installed
- **State:** `node_modules/` directory is missing. All `npm run` commands fail (`vitest: not found`, `next: not found`).
- **Fix:** Run `npm install` before any development work.

### 27. ESLint Version Mismatch
- **State:** ESLint 10.0.0 installed in `package.json` but `eslint-config-next@^16.1.6` is designed for ESLint 9.x. The config uses flat config format (`eslint.config.mjs`) but the package import fails.
- **Fix:** Align ESLint and config versions.

### 28. Single tsconfig for App + Tests
- **State:** No `tsconfig.test.json`. The main tsconfig includes `**/*.ts` which pulls in test files that reference `vitest` types not available to the main config.
- **Fix:** Add vitest types to the main tsconfig or create a separate test tsconfig.

---

## Test Coverage Gaps

### What's Tested (82 test files)
- All four analysis engines (glasgow, WAT, NED, oximetry)
- Insights generator, export functions, persistence, thresholds
- Upload validation, metric explanations, forum export
- API routes (files, stripe webhooks)
- Some component tests (data contribution, guided walkthrough, glossary page)

### What's NOT Tested
- **`app/analyze/page.tsx`** — The god component has zero tests. This is the most complex and bug-prone file in the codebase.
- **Auth flow** — `lib/auth/auth-context.tsx`, `lib/auth/feature-gate.ts` have no unit tests.
- **Cloud storage orchestration** — `lib/storage/upload-orchestrator.ts` (576 lines) has no tests.
- **AI insights client** — `lib/ai-insights-client.ts` has no tests.
- **PDF report generation** — `lib/pdf-report.ts` has no tests.
- **Chart components** — No visual regression tests for any chart.
- **Error boundaries** — `components/common/error-boundary.tsx` has no tests.
- **Consent flows** — Complex multi-step consent dialogs have no integration tests.
- **E2E tests** — No Playwright tests found (referenced in CLAUDE.md but not present).

---

## Recommended Fix Priority

| Priority | Issue # | Effort | Impact |
|----------|---------|--------|--------|
| **Now** | 26 | 1 min | Unblocks all development |
| **Now** | 8, 9, 27, 28 | 30 min | Restores CI pipeline |
| **Now** | 14 | 1 min | Removes test lib from prod bundle |
| **This week** | 1, 2 | 1 hr | Fixes clinical accuracy bugs (needs clinical review) |
| **This week** | 6 | 15 min | Prevents runtime crashes |
| **This week** | 7 | 30 min | Surfaces data loss to users |
| **Next sprint** | 10 | 4 hr | Reduces integration bug surface area |
| **Next sprint** | 11 | 2 hr | Eliminates auth boilerplate + inconsistencies |
| **Next sprint** | 12 | 3 hr | Improves debuggability (audit each catch block) |
| **Ongoing** | 24, 25 | 1 hr | Hardens API routes |
| **Backlog** | 3, 4, 5 | 2 hr | Edge case fixes in protected engines |
| **Backlog** | 15-19 | 4 hr | Performance optimizations |
| **Backlog** | 20-23 | 2 hr | Code quality improvements |

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Total source files | 376 |
| Total test files | 82 |
| Client components (`'use client'`) | 100 |
| API routes | 40 |
| Silent `catch {}` blocks | 145 across 72 files |
| `@ts-expect-error` / `as any` | 9 (all in tests — acceptable) |
| `TODO` / `FIXME` comments | 1 |
| Production dependencies | 22 |
| Dev dependencies | 16 |
| Largest file | `app/blog/posts/how-pap-therapy-works.tsx` (1046 lines) |
| Largest logic file | `app/analyze/page.tsx` (967 lines) |
| `useState` in analyze page | 14 |
| `useEffect` in analyze page | 9 |

---

## Notes for New Contributors

1. **Protected modules are sacred.** `lib/analyzers/`, `lib/parsers/`, and `workers/` implement clinically validated algorithms. Read the methodology docs before touching them.
2. **Privacy architecture is non-negotiable.** If data leaves the browser, the user must have opted in. No exceptions.
3. **Install dependencies first.** `npm install` is required — `node_modules/` is not committed.
4. **The analyze page is the dragon.** Most bugs originate here due to its complexity. The recommended decomposition (issue #10) should be the top refactoring priority.
5. **Check Sentry after deploys.** The silent error swallowing means many issues only surface in production logs.
6. **Run all 5 checks before PR.** `npx tsc --noEmit && npm run lint && npm test && npm run build` — though note that lint and typecheck currently have configuration issues (#8, #9).
