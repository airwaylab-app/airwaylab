# AirwayLab — Implementation Plan & Architecture

*Formerly SleepScope. Renamed 2026-03-08. Domain: airwaylab.app*

## Open-Core Architecture

### Repo Split
- `airwaylab/` (public, GPL-3.0) — Complete free tier + AI Insights API route
- `airwaylab-cloud/` (private, proprietary, future) — Auth, Stripe, cloud sync, enhanced features

### GPL Boundary
GPL-3.0 applies to the public repo. AI Insights API route is in public repo (ships with open-source code). Proprietary line starts with auth/billing in separate cloud repo.

## What's Free (public repo)
All 4 analysis engines, dashboard, rule-based insights, CSV/JSON/PDF/forum export, demo mode, localStorage persistence, Plausible analytics, email capture, SEO pages, 105 tests.

## What's Premium

| Feature | Phase |
|---------|-------|
| AI Insights (Claude Haiku) | Phase 1 (launch) |
| Cloud Sync | Phase 2 (if demand) |
| Enhanced PDF | Phase 2 |
| Clinic Share Links | Phase 2 |
| Comparison Mode | Phase 3 |
| Custom Thresholds | Phase 3 |

## Phased Rollout

### Phase 1 (NOW): Launch
- 1A: Pre-launch polish + rename (CLAUDE_CODE_PROMPT.md)
- 1B: AI Insights MVP (Task 10 in CLAUDE_CODE_PROMPT.md)
- 1C: Deploy to Vercel, push to GitHub, post on Reddit/ApneaBoard/HN

### Phase 2 (Weeks 2-6, if demand): Monetise
Gate: >500 visitors/mo, >50 emails, >10 premium_interest
Build: Supabase Auth + Stripe ($5-9/mo) + Cloud Sync + Clinic Share

### Phase 3 (Months 2-6): Grow
Comparison mode, custom thresholds, partnerships, Mirava case study

## Pricing
| Tier | Price | Features |
|------|-------|----------|
| Free | $0 | Everything in public repo |
| Pro | $5-9/mo or $49/yr | AI + Cloud Sync + PDF + Clinic Share |
| Clinic | $29/mo | Pro + Multi-patient + API |
