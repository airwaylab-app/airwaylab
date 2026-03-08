# AirwayLab — Claude Code Execution Prompt

## Overview

This project was previously called "SleepScope" and is being renamed to "AirwayLab" before public launch. This prompt covers:
- **Phase 0:** Full rename SleepScope → AirwayLab + anonymization
- **Phase A:** Pre-launch polish (Tasks 1-9)
- **Phase B:** AI Insights MVP (Task 10)

Read `IMPLEMENTATION_PLAN.md` for strategic context. Execute ALL phases below.

## Constraints

- Do NOT modify: `lib/parsers/`, `lib/analyzers/`, `workers/` (analysis engine internals — string references like comments and console.log messages CAN be renamed, but do not change any logic)
- GPL-3.0 license. Dark-only theme. Next.js 14 App Router.
- shadcn/ui with @base-ui/react (NOT Radix). Recharts 3.8.
- IBM Plex Sans + JetBrains Mono fonts.
- Privacy-first: no cookies, no fingerprinting.
- All insights must include "discuss with your clinician" language.
- **ANONYMIZATION:** No personal names, emails, or identifying info anywhere in the codebase. The project identity is "AirwayLab" with email `dev@airwaylab.app`. No reference to any individual developer.

---

# PHASE 0: Rename & Anonymize

## Task 0A: Global Rename SleepScope → AirwayLab

Perform a full find-and-replace across the ENTIRE codebase (excluding node_modules and .next). Every file, every string.

**Replacements (case-sensitive, in this order):**

| Find | Replace |
|------|---------|
| `SleepScope` | `AirwayLab` |
| `sleepscope` | `airwaylab` |
| `sleepScope` | `airwaylab` |
| `SLEEPSCOPE` | `AIRWAYLAB` |
| `Sleepscope` | `Airwaylab` |
| `sleepscope.app` | `airwaylab.app` |
| `sleepscope-app` | `airwaylab-app` |
| `sleep-scope` | `airway-lab` |

**Critical files to check:**
- `package.json` (name field)
- `app/layout.tsx` (metadata, JSON-LD, all strings)
- `app/page.tsx` (hero, CTAs, GitHub links)
- `app/about/**` (all sub-pages)
- `app/analyze/page.tsx`
- `app/opengraph-image.tsx`, `app/twitter-image.tsx`, `app/apple-icon.tsx`
- `app/sitemap.ts`, `app/robots.ts`, `app/error.tsx`
- `components/**` (all components)
- `lib/**` (all lib files)
- `supabase/migrations/**`
- `README.md`, `CHANGELOG.md`, `LICENSE`
- `__tests__/**`
- `IMPLEMENTATION_PLAN.md`

**localStorage keys — rename these:**
- `sleepscope_results` → `airwaylab_results` (in `lib/persistence.ts`)
- `sleepscope_ai_key` → `airwaylab_ai_key` (if present)
- `sleepscope-disclaimer-dismissed` → `airwaylab-disclaimer-dismissed` (in `components/common/disclaimer.tsx`)

**Verify:** `grep -ri "sleepscope\|sleep-scope\|sleep_scope" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" --include="*.css" --include="*.sql" --include="*.mjs" .` — must return ZERO results (exclude node_modules and .next).

## Task 0B: Anonymization Audit

Search for personal identifiers:
```bash
grep -ri "demian\|voorhagen\|d\.voorhagen\|qwerty\|mirava\|haarlem" --include="*.ts" --include="*.tsx" --include="*.md" --include="*.json" --include="*.css" --include="*.sql" --include="*.mjs" .
```

Remove or replace ALL matches. Also:
- `package.json` author → "AirwayLab" or remove entirely
- `app/layout.tsx` authors metadata → `[{ name: 'AirwayLab' }]`
- Remove any comments containing names or personal emails

---

# PHASE A: Pre-Launch Polish

## Task 1: Fix ProTease Content
**File:** `components/dashboard/overview-tab.tsx`
Change ProTease feature prop to: "AI-powered therapy recommendations personalised to your breathing patterns."

## Task 2: Update Sitemap
**File:** `app/sitemap.ts`
All content pages listed with `airwaylab.app` base URL: `/`, `/analyze`, `/about`, `/about/glasgow-index`, `/about/flow-limitation`, `/about/oximetry-analysis`.

## Task 3: Verify Offline Claims
Remove "offline"/"airplane mode" from `app/about/page.tsx` and `components/layout/footer.tsx`. No PWA exists.

## Task 4: Verify Flow Limitation SEO Page
**File:** `app/about/flow-limitation/page.tsx` — must cover WAT + NED. Same format as glasgow-index page.

## Task 5: Create .env.local.example
```bash
# AirwayLab Environment Variables
# Copy to .env.local. All optional — app works without them.

# Plausible Analytics (privacy-first, no cookies)
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=airwaylab.app

# Supabase (email waitlist capture)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# AI Insights (premium feature)
ANTHROPIC_API_KEY=sk-ant-...
AI_INSIGHTS_API_KEY=your-gating-key-for-beta-users
NEXT_PUBLIC_AI_INSIGHTS_URL=/api/ai-insights
```

## Task 6: Rewrite README.md
Public GitHub README with "AirwayLab" branding. Include: hero, demo link (`airwaylab.app/analyze?demo`), 4 engines, features, privacy, devices table, getting started, tech stack, contributing, community links, GPL-3.0 license, medical disclaimer.

## Task 7: Verify .gitignore
Ensure: `.env.local`, `.env`, `.next/`, `node_modules/`, `*.tsbuildinfo`

## Task 8: Verify Email Opt-In Variants
All variants must work: `hero`, `post-analysis`, `footer`, `inline`.

## Task 9: Build & Test (first pass)
```bash
npm run lint && npm test && npm run build
```
Fix all errors (rename will break test string assertions — fix them).

---

# PHASE B: AI Insights MVP

## Task 10A: API Route
**File:** `app/api/ai-insights/route.ts` (new)
- POST: `{ nights, selectedNightIndex, therapyChangeDate }`
- Validate `x-api-key` header against `AI_INSIGHTS_API_KEY` env var
- Call Anthropic API (`@anthropic-ai/sdk`, model `claude-haiku-4-5-20251001`)
- System prompt: sleep medicine data analyst, 3-6 Insight objects (same type as lib/insights.ts), cross-engine correlations, always "discuss with your clinician"
- Return `{ insights, source: 'ai' }` or `{ error }`
- **Run:** `npm install @anthropic-ai/sdk`

## Task 10B: Client Function
**File:** `lib/ai-insights-client.ts` (new)
- `fetchAIInsights(nights, selectedNightIndex, therapyChangeDate, apiKey): Promise<Insight[] | null>`
- 15s timeout, never throws, null on failure

## Task 10C: UI Integration
**File:** `components/dashboard/overview-tab.tsx`
- Check `NEXT_PUBLIC_AI_INSIGHTS_URL` + localStorage `airwaylab_ai_key`
- Fetch AI insights on mount, show with ✨ AI badge
- Silent fallback to rule-based on failure

## Task 10D: API Key Input
**File:** `components/common/ai-key-input.tsx` (new)
- "Unlock AI-powered insights" + key input + Activate
- Stores in localStorage `airwaylab_ai_key`
- Replaces ProTease when AI URL configured but no key

## Task 11: Final Build & Test
```bash
npm run lint && npm test && npm run build
```

---

## Execution Order

1. Task 0A — Global rename
2. Task 0B — Anonymization audit
3. Task 1 — ProTease fix
4. Task 3 — Offline claims
5. Task 5 — .env.local.example
6. Task 7 — .gitignore
7. Task 2 — Sitemap
8. Task 4 — Flow limitation page
9. Task 8 — Email opt-in variants
10. Task 6 — README
11. Task 9 — Build & test (fix rename breakage)
12. Task 10A-D — AI Insights
13. Task 11 — Final build & test

## Post-Execution Checklist

- [ ] `grep -ri "sleepscope" .` returns ZERO (excl node_modules/.next)
- [ ] `grep -ri "demian\|voorhagen" .` returns ZERO
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm run lint` passes
- [ ] package.json name is "airwaylab"
- [ ] All metadata references airwaylab.app
- [ ] localStorage keys use airwaylab_ prefix
- [ ] README.md says AirwayLab throughout
- [ ] `/api/ai-insights` route exists
- [ ] AI insights integrate with fallback
