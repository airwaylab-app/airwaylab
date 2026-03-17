# AirwayLab Codebase Handoff

**Date:** 2026-03-17
**Codebase version:** 1.2.0
**Total LOC:** ~53,600 (app/components/lib/workers/hooks)

---

## 1. Architecture Overview

AirwayLab is an open-core (GPL-3.0) sleep/airway analysis tool for CPAP/BiPAP users. It runs entirely in the browser by default (Tier 1) with opt-in server features (Tier 2).

**Stack:** Next.js 16.1 (App Router), React 19, TypeScript (strict), Tailwind 3.4, shadcn/ui + @base-ui/react, Recharts 3.8, Supabase (EU region), Stripe, Anthropic Claude Haiku, Sentry, Vitest + Playwright.

**Key architectural constraint:** All core analysis (4 engines + parsers) runs in a Web Worker. No health data leaves the browser without explicit user consent. This is non-negotiable.

---

## 2. Audit Summary

| Area | Grade | Notes |
|------|-------|-------|
| **Project structure** | A | Matches CLAUDE.md exactly. No orphaned/duplicate files |
| **TypeScript** | A | Strict mode, zero `any` or `@ts-ignore` |
| **Privacy architecture** | A | Two-tier model properly enforced |
| **API security** | A- | Auth + rate limiting + CSRF on all routes; minor Zod gaps |
| **Test coverage** | B+ | 73 test files, 1,059 tests; critical gaps in orchestrator + Stripe |
| **CI/CD** | A | 5 required checks, E2E, security gate on auto-fixes |
| **Dependencies** | A | 38 deps, all current; potential duplicate animation plugin |
| **Legal compliance** | A | All required pages present |
| **Logging** | A | Zero `console.log` in production; 174 `console.error` with prefixes |

**Overall: A- (strong, production-ready codebase with a few addressable gaps)**

---

## 3. Findings — Issues to Address

### Critical

**C1. No unit tests for `lib/analysis-orchestrator.ts`**
This is the most complex coordination layer — handles merge logic, therapy change detection, manifest diffing, and multi-session aggregation. A bug here silently corrupts all downstream results. Needs dedicated tests covering session merging, H1/H2 splits, and duration-weighted averaging.

**C2. No tests for Stripe webhook handler (`app/api/webhooks/stripe/route.ts`)**
Revenue-critical path. Idempotency checks, tier transitions, compensating deletes, and event replay are all untested. A regression here could silently break subscription management.

### High Priority

**H1. Missing Zod validation on 8+ public API routes**
CLAUDE.md mandates "Zod for all external data validation." These routes use manual validation instead:
- `contribute-data` — uses loose `isValidNight()` type guard
- `contribute-waveforms` — header-based metadata, no schema
- `contribute-oximetry-trace` — header-based metadata, no schema
- `submit-error-data` — manual validation
- `feedback` — manual validation
- `contact` — manual validation
- `subscribe` — regex email validation
- `track-analysis` — manual validation
- `provider-interest` — manual validation

While these are intentionally unauthenticated, Zod schemas would prevent malformed data from reaching Supabase and improve consistency.

**H2. `email/opt-in` route missing CSRF protection**
The POST handler at `app/api/email/opt-in/route.ts` does not call `validateOrigin()`. All other POST routes do.

**H3. `email/opt-in` route missing rate limiting**
No rate limiter configured, unlike every other state-changing endpoint.

**H4. `provider_interest` Supabase RLS policy too permissive**
INSERT policy uses `WITH CHECK (true)` instead of restricting to `service_role`. Needs a migration to tighten.

### Medium Priority

**M1. No tests for cloud storage API routes (`app/api/files/*`)**
8 routes (presign, delete, download, list, confirm, consent, usage, check-hashes) have zero unit tests. The presign/confirm flow has race condition handling that should be verified.

**M2. No tests for `lib/storage/upload-orchestrator.ts`**
Retry logic and presign/confirm flow are invisible to the test suite.

**M3. `feature-gate.ts` only has indirect test coverage**
The monetization boundary (free vs. supporter vs. champion) is tested only through integration paths. Direct unit tests on `canAccess()` with each tier would prevent gate bugs.

**M4. Potential duplicate animation dependency**
Both `tailwindcss-animate` (1.0.7) and `tw-animate-css` (1.4.0) are in package.json. Check if both are needed; remove the unused one.

### Low Priority

**L1. One TODO remaining in codebase**
`app/page.tsx:739` — community links section waiting for actual thread URLs. Cosmetic.

**L2. Some test files use file-read assertions instead of behavioral tests**
`community-benchmarks.test.ts:17` and `contextual-upgrade-nudges.test.ts:13` assert that strings exist in source files rather than testing behavior. These pass but provide limited confidence.

**L3. Soft E2E assertion**
`e2e/upload-and-analyze.spec.ts:101-110` has an assertion that silently passes. Could mask regressions.

**L4. Unprefixed localStorage keys for consent state**
A few consent-related keys in `cloud-sync-nudge.tsx`, `storage-consent.tsx`, and `contribution-consent-utils.ts` don't use the `airwaylab_` prefix. May be intentional for GDPR audit trails but should be documented.

---

## 4. What Works Well

1. **Privacy-first architecture is bulletproof.** All 4 analysis engines run in a Web Worker. Raw waveforms never leave the browser. `Float32Array` data and per-breath arrays are stripped before localStorage persistence. 4MB cap enforced via binary search algorithm.

2. **Analysis engines are clinically validated and well-tested.** Glasgow Index, WAT, NED, and Oximetry engines all have unit + integration tests with synthetic data generators. Protected module boundaries are respected.

3. **API security is comprehensive.** Every authenticated route validates auth, uses CSRF protection, implements rate limiting (Upstash Redis), and returns user-friendly errors. Sentry integration provides structured logging with `[route-name]` prefixes.

4. **CI/CD pipeline is robust.** 5 required checks (lint, typecheck, test, build, E2E), security gate blocking auto-merge on sensitive paths, Vercel incremental builds.

5. **Supabase migrations are append-only with RLS enforced.** 31 migrations, all tables have row-level security. Service-role-only policies on data tables.

6. **Medical disclaimers are consistently present** across all output channels: web UI, CSV export, JSON export, PDF reports, and forum export.

7. **Error handling never exposes raw errors to users.** All API errors are mapped to user-friendly messages. Sentry captures the full context server-side.

8. **Feature gating cleanly separates tiers.** Free tier gets all 4 engines + rule-based insights. Premium adds AI insights via Claude Haiku behind the `ailab-beta-2026` gate with monthly usage caps.

---

## 5. Key Files for New Contributors

| Purpose | File(s) |
|---------|---------|
| Project conventions | `CLAUDE.md` (comprehensive, always start here) |
| App entry | `app/layout.tsx`, `app/page.tsx` |
| Analysis engines | `lib/analyzers/*.ts` (PROTECTED — don't modify logic) |
| File parsers | `lib/parsers/*.ts` (PROTECTED) |
| Web Worker | `workers/analysis-worker.ts` (PROTECTED) |
| Orchestration | `lib/analysis-orchestrator.ts` |
| Insights (rule-based) | `lib/insights.ts` |
| Thresholds | `lib/thresholds.ts` |
| Persistence | `lib/persistence.ts` |
| Auth context | `lib/auth/auth-context.tsx` |
| Feature gating | `lib/auth/feature-gate.ts` |
| AI insights API | `app/api/ai-insights/route.ts` |
| Stripe webhook | `app/api/webhooks/stripe/route.ts` |
| Dashboard tabs | `components/dashboard/*.tsx` |
| Test setup | `__tests__/setup.ts`, `vitest.config.ts` |
| CI config | `.github/workflows/ci.yml` |
| Environment vars | `.env.local.example` |

---

## 6. Development Commands

```bash
npm run dev          # Dev server (localhost:3000)
npx tsc --noEmit     # Type check (must pass before commit)
npm run lint         # ESLint
npm test             # Vitest (1,059 tests)
npm run test:e2e     # Playwright (11 specs)
npm run build        # Production build (includes version check)
```

All 5 checks (`tsc --noEmit` + `lint` + `test` + `build` + `e2e`) must pass before any PR.

---

## 7. Recommended Next Steps (Priority Order)

1. **Write tests for `analysis-orchestrator.ts`** — Highest risk gap. Cover session merging, therapy change detection, H1/H2 splits.
2. **Write tests for Stripe webhook** — Revenue-critical. Cover idempotency, tier transitions, event replay.
3. **Add Zod schemas to public API routes** — Consistency fix. Start with `contribute-data` (highest traffic).
4. **Fix `email/opt-in` route** — Add `validateOrigin()` CSRF check + rate limiter.
5. **Fix `provider_interest` RLS** — One migration to restrict INSERT to service_role.
6. **Add unit tests for `feature-gate.ts`** — Direct coverage of `canAccess()` per tier.
7. **Audit `tw-animate-css` vs `tailwindcss-animate`** — Remove the unused one.
8. **Write tests for cloud storage routes** — Cover presign/confirm flow + race conditions.
