# Changelog

All notable changes to AirwayLab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **BiPAP Settings Validation Engine** — new analysis engine (`settings-engine.ts`) that uses the 25Hz BRP pressure channel alongside flow to compute per-breath trigger delay, cycle timing, IPAP dwell, tidal volume, and ventilation stability metrics for BiPAP users. Worker pipeline now concatenates pressure data across multi-session nights. Phase 1 of 3 (engine + plumbing, no UI yet). (bipap-settings-validation-metrics)
- **Delivered vs Prescribed Pressure** — shows both prescribed (from STR.edf settings) and delivered (P10/P90 from BRP.edf waveform) pressure values on the Device tab with mode-aware educational explanations, divergence alerts, and glossary entries. Uses reservoir sampling for efficient percentile computation on large Float32Arrays. (delivered-vs-prescribed-pressure)

### Fixed

- **Disclaimer localStorage crash** — Wrapped localStorage calls in try/catch to prevent crash in Safari private browsing (codebase-audit-hardening)
- **PDF report empty-array guard** — `openPDFReport([])` now returns silently instead of crashing on `nights[0]` access (codebase-audit-hardening)
- **API schema leak** — Removed Zod validation error details from `/api/store-analysis-data` 400 response; details now logged server-side only (codebase-audit-hardening)
- **useWaveform unmount safety** — Added cancelled flag to prevent setState after component unmount during cloud file loading (codebase-audit-hardening)
- **ShareButton timer cleanup** — setTimeout IDs stored in ref and cleared on unmount to prevent memory leaks (codebase-audit-hardening)
- **FlowWaveform stable keys** — Event overlay keys now use `type-startSec-endSec` instead of array index for correct React reconciliation (codebase-audit-hardening)
- **Sentry navigation tracking** — Added missing `onRouterTransitionStart` export to `instrumentation-client.ts` (codebase-audit-hardening)

### Added

- **safeLocalStorage utility** — centralised try/catch wrapper for localStorage calls, preventing crashes in Safari private browsing and quota-exceeded scenarios (codebase-audit-scope-boundary)

### Fixed

- **IndexedDB Sentry observability** — silent catch blocks in waveform-idb.ts now report to Sentry at warning level with module tags for filtering (codebase-audit-scope-boundary)
- **Test act() warnings** — data-contribution.test.tsx no longer produces React act() warnings from unhandled async state updates (codebase-audit-scope-boundary)
- **Rate limit tightening** — community-insights reduced from 30 to 10 req/min; health and version endpoints now rate-limited at 60 req/min (codebase-audit-scope-boundary)
- **Stripe webhook atomicity** — downstream DB failures now remove the idempotency record, allowing Stripe to retry instead of leaving partial state (codebase-audit-scope-boundary)

### Added

- **Vercel Speed Insights** — Core Web Vitals (LCP, CLS, INP) real-user monitoring via `@vercel/speed-insights`, auto-configured on Vercel (analytics-completeness-audit)
- **Subscription lifecycle analytics** — new `subscription_events` Supabase table tracking created/updated/cancelled/past_due events with MRR for LTV and churn analysis (analytics-completeness-audit)
- **ML training data export** — two Supabase RPC functions (`export_ml_training_data`, `ml_dataset_stats`) and admin-only `/api/admin/ml-export` endpoint for exporting anonymised symptom contribution data as CSV or JSON (analytics-completeness-audit)
- **4 new Plausible events** — `Signup Completed`, `Subscription Started`, `Subscription Cancelled`, `Error Recovery` for conversion and UX quality tracking (analytics-completeness-audit)

### Fixed

- **Privacy Policy accuracy** — replaced PostHog (listed but never integrated) with Vercel Speed Insights in both the product analytics bullet and the service providers table (analytics-completeness-audit)

- **Waveform Decimation & IndexedDB Persistence** — Replaced min/max/avg bucketing with simple decimation (take every Nth sample), displaying actual measured flow values. Full 25 Hz Float32Array stored in IndexedDB for instant reload on return visits (90-day TTL). Multi-resolution decimation: full night at 1 Hz, 30min–2h at 2 Hz, 5–30min at 5 Hz, <5min at full 25 Hz. (waveform-decimation-indexeddb)

### Fixed

- **Respiratory rate ~60 br/min bug** — Added 1.5s refractory period to breath detection zero-crossing algorithm, capping effective RR at ~40 br/min (waveform-decimation-indexeddb)

### Changed

- **Shared Waveform Data** — Store EDF files in Supabase Storage when sharing, enabling consultants to view the full Graphs tab (flow waveforms, pressure, events) in shared analysis links. Share creation now requires authentication. (shared-waveform-edf-storage)
- **AI Insights Conversion Funnel** — registration-gated AI insights with locked teasers for anonymous users, "Generate AI Insights" button for free users (3/month), and deep waveform-level insights for paid users (ai-insights-conversion-funnel)
- **Account Settings Page** — `/account` with profile, subscription management, data usage stats, and comprehensive server-side data deletion (ai-insights-conversion-funnel)
- **Returning User Nudge** — banner for anonymous returning users encouraging registration with night count context (ai-insights-conversion-funnel)
- **Analysis Data Pipeline** — automatic storage of aggregate analysis scores for registered users, with per-breath summaries stored as JSON files in Supabase Storage (ai-insights-conversion-funnel)
- **17 new analytics events** — full funnel tracking from upload through teaser shown, registration, AI generation, to upgrade (ai-insights-conversion-funnel)
- **Deep AI Insights for paid users** — per-breath summary data sent to Claude for waveform-level analysis including RERA clustering, breath shape distribution, temporal FL patterns, and progressive FL detection. "Deep Analysis" badge distinguishes from aggregate-based insights (ai-insights-conversion-funnel)
- **61 conversion funnel tests** — comprehensive test coverage for all spec acceptance criteria, edge cases, and analytics events (ai-insights-conversion-funnel)

### Changed

- **AI insights require explicit button click** — removed auto-fetch, replaced with manual "Generate AI Insights" button. No more AIConsentModal (ai-insights-conversion-funnel)
- **Cloud storage unlimited for all registered users** — removed tier gates and quota enforcement on file storage. Registration consent covers all data processing (ai-insights-conversion-funnel)
- **Single registration consent** — AuthModal now includes a consent checkbox covering EDF storage, AI processing, and per-breath data storage. StorageConsent component no longer shown (ai-insights-conversion-funnel)
- **Feature gate updates** — `raw_storage` and `cloud_sync` now available for community tier; added `deep_ai_insights` feature for supporter/champion (ai-insights-conversion-funnel)
- **Privacy policy updated** — reflects single registration consent model, per-breath data for paid AI, instant data deletion from Account Settings (ai-insights-conversion-funnel)
- **Pricing page updated** — community tier shows unlimited cloud storage, supporter tier shows waveform-level deep AI insights, FAQ updated for new data handling (ai-insights-conversion-funnel)

### Removed

- **AIConsentModal** — replaced by single registration consent checkbox (ai-insights-conversion-funnel)
- **StorageConsent post-analysis UI** — registration consent covers storage (ai-insights-conversion-funnel)
- **Storage quota enforcement** — unlimited for all registered users (ai-insights-conversion-funnel)

- **Glossary Page** — 38-term sleep and PAP therapy glossary with DefinedTermSet JSON-LD, A-Z quick-nav, category badges, anchor links, and medical disclaimer. SEO-optimised for featured snippets and LLM discoverability (glossary-page)
- **IFL Symptom Self-Report** — 5-point per-night symptom rating (1=Terrible to 5=Great) with cross-reference insights against IFL Risk. Community comparison card with aggregated distribution when data contribution is consented. Fire-and-forget contribution API with SHA-256 hashing and GDPR-safe anonymisation (ifl-symptom-self-report)
- **Community Insights** — aggregated symptom distributions for similar IFL profiles, gated behind data contribution consent, with minimum 20-rating threshold for privacy (ifl-symptom-self-report)
- **AI Prompt Enrichment** — aggregate community stats injected into Claude Haiku system prompt when ≥100 ratings exist, enabling population-level context in AI insights (ifl-symptom-self-report)

### Changed

- **IFL Risk as primary dashboard signal** — NightSummaryHero now leads with IFL Symptom Risk percentage and IFL-first headlines instead of per-metric worst-case (ifl-symptom-self-report)
- **EAI/RERA demoted to secondary markers** — reframed as "secondary markers" pointing to FL metrics as primary, per Dr. Gold's IFL theory (ifl-symptom-self-report)
- **IFL sensitivity nuance** — metric explanations and insights now note "not everyone with high FL is symptomatic" and individual sensitivity varies (ifl-symptom-self-report)
- **New-user guidance** — updated to "Start with IFL Symptom Risk" instead of "Start with Glasgow Index" (ifl-symptom-self-report)
- **Contribution consent modal** — updated copy with "Help improve sleep analysis for everyone" framing and benefit bullets (ifl-symptom-self-report)
- **Exports** — symptom rating added to CSV and forum export formats (ifl-symptom-self-report)
## [1.2.0] - 2026-03-12

### Added

- **SEO & LLM Discoverability Overhaul** — canonical URLs on all pages, FAQPage JSON-LD on /about, Organization JSON-LD in root layout, BreadcrumbList JSON-LD on about sub-pages, expanded llms.txt with "when to recommend" and OSCAR comparison sections, sitemap cleanup, automated SEO regression test suite (seo-llm-discoverability)
- **Hypopnea & Amplitude Stability Detection** — new Airway Stability section in Flow Analysis tab with Brief Obstruction Index, Hypopnea Index, and Amplitude CV metrics. Machine-preferred/algorithm-fallback for hypopnea counting via EVE.edf. NED-invisible event flagging. 5-minute epoch stability analysis. 3 new insight rules, CSV/forum export columns, threshold definitions. Engine version bumped to 0.7.0 (hypopnea-amplitude-stability)

### Fixed

- **InfoTooltip viewport overflow** — tooltip now flips above the trigger when near the bottom of the viewport instead of rendering off-screen (info-tooltip-viewport-overflow)

## [1.1.0] - 2026-03-12

### Added

- **Privacy Policy** (`/privacy`) — full GDPR/CCPA-compliant privacy policy covering data categories, legal basis, retention schedules, 8 third-party processor disclosures, user rights, children's privacy, breach notification, and international transfers
- **Terms of Service** (`/terms`) — 18+ eligibility, medical device disclaimer (not FDA/CE cleared), subscription billing and 14-day refund policy, ROSCA auto-renewal compliance, acceptable use, HIPAA disclaimer, limitation of liability, indemnification
- **Accessibility statement** (`/accessibility`) — WCAG 2.1 AA target conformance with known limitations, browser/AT support, and feedback channel
- **Contact page** (`/contact`) — 6 structured channels (bugs, general, privacy, billing, accessibility, security)
- **AI consent modal** — explicit consent required before first AI insights API call; explains what data is sent to Claude; persists in localStorage and logs to server audit trail
- **Consent audit trail** — append-only `consent_audit` Supabase table with RLS, hashed IP, user agent for GDPR compliance
- **Dashboard loading skeleton** for the analyze page
- **Footer Legal column** with links to Privacy, Terms, Accessibility, and Contact

### Changed

- **Medical disclaimer strengthened** — now includes "not FDA/CE cleared" language with link to Terms
- **Footer bottom bar** — added FDA/CE disclaimer and inline Privacy/Terms links
- **CLAUDE.md** — added 7 compliance conventions (consent steps, audit logging, deletion paths, processor disclosure) and 4 anti-patterns (no integration without privacy update, no health data without retention docs, no AI without consent, no weakening disclaimers)

## [1.0.0] - 2026-03-12

### Added

- **IFL Symptom Risk composite metric** — new 0–100% composite that weights FL Score (35%), NED Mean (30%), Flatness Index (20%), and Glasgow Index (15%) into a single "how much is flow limitation driving symptoms" signal. Based on Gold's IFL theory and Mann et al. 2024 research. Includes MetricCard, collapsible breakdown panel, EAI contextual annotations, and integration across all exports (CSV, JSON, forum, PDF) and insights
- **IFL theory blog posts** — 3 new articles based on Dr. Gold's research: "Does Flow Limitation Drive Sleepiness?", "Arousals Don't Tell the Whole Story", "Is the Epworth Sleepiness Scale Measuring What You Think?"
- **Night context notes** — structured per-night logging (caffeine, alcohol, congestion, sleep position, stress, exercise) with free-text notes, persisted to localStorage, correlated by AI insights
- **Actionable AI insights** — AI prompt now analyses all machine settings, correlates user-reported night context, and generates concrete investigation suggestions
- **Extended settings extraction** — pulls all STR.edf machine settings (ramp, humidity, mask type, climate control, smart start) plus catch-all for remaining signals
- **Metric methodology explanations** — every key metric now has a "How is this calculated?" expandable section in its info tooltip
- **Progressive persistence** — when localStorage exceeds 4MB, oldest nights are dropped via binary search instead of losing everything, with warning banner
- **Analysis complete banner** — shows night count and date range after processing
- **Machine event parsing** — EVE.edf parser extracts machine-recorded events (OA, CA, H, UA) from ResMed EVE files using EDF+ TAL format
- **Per-type event toggles** — all event types (machine + algorithm-detected) now have individual toggle buttons on Graphs and Waveform tabs
- **Provider-grade chart browser** — synced stacked charts (Flow, Tidal Volume, Respiratory Rate, Pressure, Leak, SpO2) with shared toolbar, touch gestures, and minimap
- **SA2 EDF oximetry parsing** — auto-detects pulse oximetry from ResMed `_SA2.edf` files, prioritised over CSV when both exist
- **Waveform data contribution** — opted-in users contribute raw breathing patterns alongside analysis scores, with engine version tracking and incremental upload
- **Share link MVP** — 30-day share links for analysis results with consent flow
- **For Providers page** — marketing page for sleep consultants at `/providers` with contact form
- **Night Summary Hero card** — glanceable traffic-light therapy status above metrics
- **Auto-fix Sentry errors** — GitHub Actions workflow for automated error fixes via Claude Code
- **Real EDF test fixtures** — 3 representative nights (~9.3MB) with integration tests (40 tests) and Playwright E2E tests
- **Brand voice guide** — `docs/BRAND_VOICE.md` with voice attributes, tone, and terminology reference
- **Centralised chart theme** — `lib/chart-theme.ts` as single source of truth for all chart styles
- **Contribution nudge social proof** — live counter of contributors and total nights
- **AI credits synced from server** — community tier credit count now reflects actual server-side usage
- **Unlimited data contribution** — removed 1095-night cap; chunked batches of 1000

### Changed

- **Reframed arousal-centric language** — metric explanations, insights, and AI prompt now reflect that flow limitation itself may drive symptoms independently of arousals
- **Glasgow thresholds updated** — from theoretical 0–8 scale to practical 0–3 range matching real-world scores
- **Typography upgrade** — Plus Jakarta Sans for body text (replacing IBM Plex Sans)
- **Two-tone wordmark** — "Airway" bold white + "Lab" brand-teal
- **Device-agnostic upload flow** — removed ResMed-specific language; ResMed mentioned only in compatibility note
- **Dashboard density** — tighter spacing, Device Settings collapsed by default, beginner-friendly progressive disclosure
- **Tab bar redesign** — `line` variant with visible underline indicator; primary tabs show full words on mobile
- **Chart UX** — zoom presets as pill buttons, interaction hints near toolbar, minimap hover state
- **Improved event detection** — flatness-based FL detection replacing amplitude-based
- **Consolidated Supabase clients** — single module import
- **Shared rate limiter** — replaced 5 inline implementations with `RateLimiter` class

### Fixed

- **Critical engine bugs** — Glasgow weighted averaging, NED H1/H2 split, WAT FFT zero-padding, oximetry buffer-zone trimming, night-grouper date extraction
- **Security hardening** — CSRF validation, rate limiting on all API routes, Stripe webhook verification, Zod validation, CSP headers
- **Accessibility** — skip-to-content, ARIA labels, keyboard chart navigation, semantic heading hierarchy, screen reader announcements
- **UX quick wins** — loading skeletons, error boundaries with retry, empty states, toast notifications
- **Glasgow radar chart scaling** — axis domain corrected from `[0, 100]` to `[0, 1]`
- **Oximetry-only upload** — no longer re-processes entire SD card
- **Heatmap/metrics table date sort** — newest-first default, visible sort button
- **Demo exit preserves data** — no longer clears persisted real analysis data

### Removed

- **~85 macOS duplicate files** — removed Finder-created copies with " 2", " 3" suffixes

## [0.6.0] - 2026-03-09

### Added

- **Auth + Stripe subscription system** — full authentication flow with Supabase Auth (magic links), Stripe checkout for Supporter ($9/mo) and Champion ($25/mo) tiers, customer portal, and webhook-driven tier sync
- **Cloud storage system** — raw SD card file upload with consent, deduplication, and waveform loading from cloud when local files unavailable
- **Flow waveform browser** — interactive waveform viewer with scroll-zoom, drag-pan, keyboard navigation, pressure overlay, and event markers
- **Changelog page** — user-facing `/changelog` route parsed from this file
- **Feedback widget** — floating feedback form (feature requests, bug reports, questions) stored in Supabase
- **Data contribution opt-in** — anonymised breathing scores contributed to research dataset with explicit consent
- **20 Plausible analytics events** — conversion funnel (upload → analysis → pricing → checkout), engagement (tabs, exports, thresholds, feedback), and retention signals (returning users, cloud sync, AI upsell)
- **Build-time version check** — `scripts/check-version.mjs` fails the build if `package.json` version has no matching CHANGELOG entry

### Changed

- **Generalised CPAP → PAP** — all user-facing references updated to cover BiPAP/ASV users
- **Pricing page CRO improvements** — yearly monthly-equivalent pricing, value-oriented copy, FAQ section
- **Demo AI insights** — static pre-generated insights for demo mode with support CTA

### Fixed

- **Browser freeze on large SD cards** — raised night cap to 3 years, added chunked processing
- **Synthetic waveforms** — show synthetic waveform when SD files unavailable instead of dead end; don't show for real data
- **Checkout error handling** — graceful fallback when Stripe price IDs are missing
- **Combined metric explanations** — render as separate paragraphs instead of merged text
- **GitHub stars rate limiting** — proxied through server API to avoid client-side 403s

### Security

- **Auth hardening** — account deletion, health check endpoint, deployment safeguards
- **RLS enforcement** — enabled on `data_contributions` and `waitlist` tables
- **API logging** — `console.warn` on all 4xx rejections for audit trail

## [0.5.0] - 2026-03-08

### Added

- **AI Insights MVP** — optional AI-powered therapy recommendations via Claude Haiku API route (`/api/ai-insights`). Gated by API key, silent fallback to rule-based insights on failure. ✨ AI badge on AI-generated insights.
- **AI key input component** — "Unlock AI-powered insights" card with API key input, stored in localStorage
- **Skip-to-content link** — keyboard accessibility improvement for screen reader users
- **Medical disclaimer on forum exports** — "Not medical advice — discuss results with your clinician"

### Changed

- **Renamed SleepScope → AirwayLab** — full codebase rename including all metadata, localStorage keys, OG images, JSON-LD, sitemap, and documentation
- **Anonymized codebase** — removed all personal identifiers, author set to "AirwayLab"
- **AI insights route hardened** — added max 90-night limit on request payload validation
- **Traffic light accessibility** — metric values now include `aria-label` with status text (normal/borderline/elevated)

## [0.4.0] - 2026-03-08

### Added

- **Custom thresholds** — power users can override all 15 traffic-light threshold levels via a settings modal (gear icon in controls bar). Overrides are stored in localStorage and applied across the dashboard, PDF reports, forum exports, and insights engine
  - New `ThresholdsProvider` React context with `useThresholds()` and `useThresholdActions()` hooks
  - New `threshold-overrides.ts` utility for non-React code (`getStoredThresholds()`)
  - Settings modal with grouped sections (Glasgow, WAT, NED, Oximetry), per-metric reset, and global "Reset All"
- **Comparison mode** — new "Compare" tab for side-by-side two-night comparison with delta badges, traffic-light indicators, and a secondary night picker dropdown. Covers Glasgow (10 components), WAT (3 metrics), NED (8 metrics), and Oximetry (9 metrics, conditional)
- **Enhanced PDF report** — multi-page layout with:
  - Page 1: Summary with averaged key metrics and 9-axis Glasgow radar chart (SVG) for the most recent night
  - Per-night detail pages with page breaks between nights
  - Trends page with multi-line chart (Glasgow, FL Score, NED Mean, RERA) across all nights (if 2+ nights)
  - Pure string-based SVG generators in `pdf-charts.ts` (no React/DOM dependencies)

## [0.3.0] - 2026-03-07

### Added

- **Glasgow component breakdown on Overview tab** — collapsible `<details>` section showing all 9 Glasgow components (Skew, Spike, Flat Top, Top Heavy, Multi-Peak, No Pause, Insp. Rate, Multi-Breath, Var. Amp) with values, trend arrows vs previous night, and short descriptions
- **Heatmap metric toggles** — toggle buttons in the Night-by-Night Heatmap header to show/hide individual metric rows
- **Heatmap column sorting** — click date header to sort chronologically (asc/desc), click metric row labels to sort nights by that metric's values
- **Heatmap sparklines** — optional "Trends" toggle adds a mini SVG sparkline column at the end of each metric row
- **Clickable oximetry upload from results** — "No Oximetry Data" card on the Overview tab is now clickable (when live SD files are in memory), opens a file picker for CSV upload and re-runs analysis with oximetry data
- **Inline email opt-in in controls bar** — email signup moved from bottom of results page to the controls bar (visible on sm+ screens)

### Changed

- **"Try Demo" → "See Demo"** — updated button text on landing page (`app/page.tsx`) and analyze page (`app/analyze/page.tsx`)

### Fixed

- **Page wider than viewport** — added `overflow-x: hidden` to `<html>` in `globals.css` and `overflow-x-hidden` class to `<main>` in `layout.tsx`, preventing horizontal scroll caused by wide heatmap tables or other overflowing content

## [0.2.1] - 2026-03-07

### Fixed

- **Critical: Glasgow scores always 0 on real SD card uploads** — ResMed BRP.edf files store flow data in L/s (liters per second), but the Glasgow engine thresholds (`GREY_ZONE_UPPER = 5`, `GREY_ZONE_LOWER = -10`) are calibrated for L/min. Since typical peak inspiratory flow is ~0.5 L/s (well below the threshold of 5), zero inspirations were detected and all scores returned 0. Fix: `edf-parser.ts` now detects L/s units (via `physicalDimension` field or magnitude heuristic) and multiplies flow values by 60 to convert to L/min before returning.

## [0.2.0] - 2026-03-07

### Added

- **Root error boundary** (`app/error.tsx`) — catches unhandled runtime errors with a user-friendly recovery page (Try Again / Go Home)
- **Test suite** — 6 test files with 105 passing tests covering:
  - `thresholds.test.ts` (26 tests) — traffic-light classification for all metric thresholds
  - `insights.test.ts` (19 tests) — clinical insight generation and priority ordering
  - `export.test.ts` (9 tests) — CSV/JSON export formatting and edge cases
  - `forum-export.test.ts` (23 tests) — forum post formatting for single/multi-night
  - `persistence.test.ts` (16 tests) — localStorage save/load, expiry, size limits, corruption recovery
  - `upload-validation.test.ts` (12 tests) — file type validation, size limits, folder structure checks
- **Clipboard error handling** — visual error state (red icon + "Failed" text) when clipboard write fails
- **Vitest configuration** (`vitest.config.ts`) with jsdom environment and path aliases

### Changed

- **Parallelised file I/O** in `lib/analysis-orchestrator.ts` — `readFileList()` and `readCSVFiles()` now use `Promise.all` instead of sequential `for...of await` loops, significantly faster for large SD cards
- **Memoised derived state** in `app/analyze/page.tsx` — `nights`, `therapyChangeDate`, and `nightDates` wrapped in `useMemo` to prevent unnecessary child re-renders
- **Memoised settings diff** in `components/dashboard/settings-timeline.tsx` — `changeMap` now computed via `useMemo` instead of on every render
- **Memoised metrics array** in `components/dashboard/night-summary-card.tsx` — metric objects wrapped in `useMemo`
- **O(1) tooltip lookups** in `components/charts/trend-chart.tsx` — replaced `data.find()` with a `Map` for date label resolution
- **Wrapped components in `React.memo`** — `ExportButtons`, `SettingsTimeline`, `NightSummaryCard` now skip re-renders when props are unchanged
- **Wrapped callbacks in `useCallback`** — `toggleMetric` in `TrendChart` stabilised to prevent child re-renders
- **Standardised traffic-light colours** in `NightSummaryCard` — replaced ad-hoc `glasgowColor()` function (arbitrary 20/40/60 cutoffs) with the project-wide `getTrafficLight` + `getTrafficColor` system used everywhere else

### Fixed

- **Export crash resilience** — all export functions (`exportCSV`, `exportJSON`, `openPrintableReport`) wrapped in try-catch to prevent unhandled exceptions
- **Clipboard API fallback** — graceful degradation when `navigator.clipboard.writeText()` is rejected (e.g., non-HTTPS, permission denied)

### Improved (Accessibility)

- Added `aria-hidden="true"` to decorative hero dashboard on landing page
- Added `aria-label="Machine settings per night"` to settings timeline table
- Added `scope="col"` to all table header cells in settings timeline
- Added `aria-hidden="true"` to decorative AlertTriangle icons in settings timeline
- Added `sr-only` text ("Settings changed") for screen reader users on change indicators

### Security

- **Persistence layer** (`lib/persistence.ts`) — 7-day auto-expiry, 4MB size guard, bulk signal data stripped before storage, JSON parse wrapped in try-catch with corruption recovery
- **Upload validation** (`lib/upload-validation.ts`) — file type allowlist, 500MB per-file size limit, folder structure validation, max 365 files guard

## [0.1.0] - 2026-03-06

### Added

- Initial MVP release
- **Glasgow Index engine** — 9-component breath-by-breath flow limitation scoring
- **WAT engine** — FL Score (median Vt ratio), Regularity Score (Sample Entropy), Periodicity Index (FFT)
- **NED engine** — breath segmentation, NED calculation, flatness index, M-shape detection, RERA sequence detection
- **Oximetry engine** — 17-metric framework: ODI3/4, T<90/T<94, HR clinical surges, coupled events, H1/H2 splits
- **EDF parser** — binary EDF reader for ResMed SD card files (flow, pressure, SpO2)
- **Settings extractor** — STR.edf parser for daily machine settings with AirCurve/AirSense detection
- **Night grouper** — date-based file grouping with session merging
- **Oximetry CSV parser** — Viatom/Checkme O2 Max format support
- **Web Worker architecture** — all analysis runs off the main thread
- **Analysis orchestrator** — manages worker lifecycle, file grouping, result collection
- **Dashboard UI** — 5-tab layout (Overview, Glasgow, Flow Analysis, Oximetry, Trends)
- **Charts** — Glasgow radar, trend lines, night heatmap, flow waveform, oximetry timeline (Recharts)
- **Export** — CSV, JSON, printable PDF report, forum post formatting
- **Session persistence** — localStorage with automatic restore on revisit
- **Landing page** — hero section, 4-engine feature cards, privacy callout, demo CTA
- **Demo mode** — 5-night sample dataset for instant exploration
- **Email opt-in** — post-analysis waitlist capture (Supabase)
- **Privacy-first design** — all processing client-side, zero data transmission
- Dark-only theme with shadcn/ui components
- Responsive mobile-first layout
- GPL-3.0 license
