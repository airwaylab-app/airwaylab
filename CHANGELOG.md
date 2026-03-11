# Changelog

All notable changes to AirwayLab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — EDF Oximetry (SA2) Support (2026-03-11)

### Added

- **SA2 EDF oximetry parsing**: Automatically detects and parses pulse oximetry data from ResMed `_SA2.edf` files on SD cards — no separate CSV export needed (`edf-oximetry-sa2-support`)
- **Flexible signal matching**: SpO2 and Pulse Rate signals are matched case-insensitively across known label variants (SpO2, SPO2, Sp O2, Pulse, PR) (`edf-oximetry-sa2-support`)
- **SA2 priority over CSV**: When both SA2 (integrated oximeter) and CSV (external oximeter) data exist for the same night, SA2 takes priority as it's time-synchronized with the CPAP session (`edf-oximetry-sa2-support`)
- **Upload validation info**: SD card uploads with SA2 files now show an info message confirming pulse oximetry data was detected (`edf-oximetry-sa2-support`)

## [Unreleased] — Provider-Grade Chart Browser (2026-03-11)

### Added

- **Synced stacked chart view**: All waveform charts (Flow, Tidal Volume, Respiratory Rate, Pressure, Leak, SpO2) now share a single viewport — zoom/pan in one chart moves them all (`provider-grade-chart-browser`)
- **Shared chart toolbar**: Single toolbar with zoom presets (5m/15m/30m/1h/2h), +/- zoom, pan arrows, reset button, and minimap overview bar (`provider-grade-chart-browser`)
- **Tidal Volume chart**: New chart showing estimated tidal volume (mL) computed from inspiratory flow integration (`provider-grade-chart-browser`)
- **Respiratory Rate chart**: New chart showing breaths/min computed via zero-crossing counting in a 30-second sliding window (`provider-grade-chart-browser`)
- **Touch gesture support**: Pinch-to-zoom and swipe-to-pan on all charts for mobile/tablet devices (`provider-grade-chart-browser`)
- **M-shape event detection**: Waveform event detector now identifies M-shape (double-peaked) inspiratory patterns (`provider-grade-chart-browser`)

### Changed

- **Improved event detection**: Replaced amplitude-based detector with flatness-based flow limitation detection — detects FL runs (3+ consecutive breaths with flatness >0.7), M-shape patterns, and arousal candidates (`provider-grade-chart-browser`)
- **SpO2 always visible**: Removed collapsible sections — SpO2 trace or upload CTA is always shown to encourage oximetry data capture (`provider-grade-chart-browser`)
- **Compact chart heights**: All sub-charts reduced in height (140-200px) to fit more data on screen without scrolling (`provider-grade-chart-browser`)
- **Charts use synced viewport context**: Flow, Pressure, Leak, and SpO2 charts no longer have independent viewports — all consume shared SyncedViewportProvider (`provider-grade-chart-browser`)

## [Unreleased] — Dashboard UX: Beginner-Friendly Redesign (2026-03-11)

### Added

- **Night Summary Hero card**: Single glanceable card above metrics showing traffic-light therapy status (green/amber/red) with one-sentence summary (`dashboard-ux-beginner-friendly`)
- **Collapsible Insights Panel**: AI + rule-based insights wrapped in a `<details>` element — collapsed by default for new users (sessions <= 5), expanded for returning users (`dashboard-ux-beginner-friendly`)
- **Tab group separator**: Visual divider between primary tabs (Overview, Graphs, Trends) and secondary tabs (Glasgow, Flow, Oximetry, Compare) (`dashboard-ux-beginner-friendly`)

### Changed

- **Tab bar visibility**: Switched from `default` to `line` variant with `bg-card/50` background — active tab now has a visible underline indicator (`dashboard-ux-beginner-friendly`)
- **Primary tabs show full words on mobile**: Overview, Graphs, Trends are always readable; only secondary tabs use abbreviations (`dashboard-ux-beginner-friendly`)
- **Simplified controls for beginners**: Email opt-in, Export, and Threshold Settings hidden for first 5 sessions to reduce clutter (`dashboard-ux-beginner-friendly`)
- **New-user guidance repositioned**: "Start with Glasgow Index" hint moved directly below the hero card for maximum visibility (`dashboard-ux-beginner-friendly`)
- **Session count tracking lifted**: `isNewUser` state moved from OverviewTab to AnalyzePage for shared access across controls and tabs (`dashboard-ux-beginner-friendly`)

## [Unreleased] — Onboarding Audit v2 (2026-03-11)

### Changed

- **Share prompts modal**: Share prompts now display as a centered modal overlay instead of inline cards at the bottom of the overview tab (`share-prompts-centered-modal`)
- **Landing page reorder**: "How It Works" section now appears directly after the Trust Bar, before narrative sections (Mission, Vision), reducing scroll-to-conversion distance (`onboarding-audit-v2`)
- **Overview tab hierarchy**: NextSteps CTA moved below the primary metrics grid and Glasgow breakdown — users see data before advice (`onboarding-audit-v2`)
- **Dashboard density for new users**: SharePrompts and NightHeatmap hidden for first 5 sessions to reduce information overload (`onboarding-audit-v2`)
- **Demo banner context**: Demo mode now explains the sample clinical scenario (BiPAP ST user, settings change on Jan 14) to help users interpret the data (`onboarding-audit-v2`)
- **Upload screen simplified**: Removed StorageConsent and ContributionOptIn from upload idle screen; StorageConsent moved to post-analysis dashboard (`onboarding-audit-v2`)

### Added

- **Mobile upload warning**: `/analyze` page now shows a mobile-only banner suggesting the demo when SD card upload isn't practical (`onboarding-audit-v2`)
- **Threshold reset discoverability**: "Reset to defaults" button is now always visible in the Threshold Settings modal description area (disabled when no customisations exist), replacing the conditional footer button (`threshold-reset-to-defaults`)
- **Community links in NextSteps**: "Share your results" step now includes clickable links to r/SleepApnea and ApneaBoard (`onboarding-audit-v2`)

### Fixed

- **Demo exit preserves data**: Exiting demo mode no longer clears previously persisted real analysis data (`onboarding-audit-v2`)
- **Restored contribution nudge dialog**: Re-added accidentally deleted `contribution-nudge-dialog.tsx` component

## [Unreleased] — Auto-fix Sentry Errors (2026-03-11)

### Added

- **Auto-fix Sentry errors**: GitHub Actions workflow that triggers on Sentry-labelled issues, runs Claude Code (Sonnet) to analyse and fix the error, and opens a PR for review. Includes branch deduplication, daily rate limit (5/day), and protected module guards. (`auto-fix-sentry-errors`)

## [Unreleased] — Share Link MVP & Providers Page (2026-03-11)

### Added

- **Share link MVP**: Users can generate 30-day share links for their analysis results. Supports single-night or all-nights sharing with explicit consent flow and "remember my choice" option (`share-link-mvp`)
- **For Providers page**: Marketing page targeting sleep consultants and clinicians at `/providers` with 7 sections, demo CTA, and contact form (`providers-page`)
- **Provider interest API**: Supabase-backed form for provider/clinician contact requests with rate limiting and Sentry alerts (`provider-interest`)
- **Share analytics**: Supabase SQL view for tracking share adoption metrics (creation rate, view rate, scope split) plus Plausible events (`share-analytics`)

### Changed

- **Privacy copy updated**: Landing page and hero now clarify "unless you choose to share it" alongside the privacy-first messaging
- **Navigation expanded**: Added "For Providers" link to header nav (desktop and mobile menu)
- **Internal cross-links**: Added provider references on landing page (How It Works section) and pricing page (after FAQ)

## [Unreleased] — Brand Polish v1 (2026-03-11)

### Added

- **Brand voice guide**: `docs/BRAND_VOICE.md` — voice attributes, tone by context, writing rules, messaging hierarchy, and terminology reference for contributors (`brand-polish-v1`)
- **Centralized chart theme**: `lib/chart-theme.ts` — single source of truth for all Recharts color values, axis styles, tooltip styles, and a `withAlpha()` helper (`brand-polish-v1`)

### Changed

- **Typography upgrade**: Swapped IBM Plex Sans → Plus Jakarta Sans for body text; JetBrains Mono retained for data values (`brand-polish-v1`)
- **Color consolidation**: Added `brand-teal`, `data-good/monitor/elevated`, and `chart-6` tokens to Tailwind config; chart components now reference centralized theme instead of inline HSL values (`brand-polish-v1`)
- **Landing page copy**: Benefit-first engine descriptions (Glasgow, WAT, NED, Oximetry); tighter hero subhead (`brand-polish-v1`)
- **Pricing copy**: Community-funding framing — "Keep AirwayLab Independent" header (`brand-polish-v1`)
- **Two-tone wordmark**: "Airway" bold white + "Lab" regular brand-teal in header and footer (`brand-polish-v1`)
- **Favicon**: Minimal "A" in brand-teal on dark background (`brand-polish-v1`)
- **OG/Twitter images**: Dark background with two-tone wordmark and updated tagline (`brand-polish-v1`)
- **Meta descriptions**: Consistent L2 messaging across landing, analyze, and pricing pages (`brand-polish-v1`)
- **Forum export**: Updated attribution and added GitHub star CTA line (`brand-polish-v1`)
- **README**: Updated opening description to benefit-first copy (`brand-polish-v1`)

### Improved

- **Settings timeline change explanation**: Amber-highlighted rows in the Machine Settings Timeline now explain what changed — visible "Changed: EPAP, IPAP" text on desktop (matching mobile), subtitle describing the highlighting pattern, and tooltips on warning icons (`settings-timeline-change-explanation`)

## [Unreleased] — Platform Audit (2026-03-10)

### Added

- **Contribution nudge social proof**: Post-upload contribution dialog now shows a live counter of how many people have already contributed and total nights, fetched from `/api/stats` (`contribution-nudge-social-proof`)
- **AI credits synced from server**: Community tier AI credit count now reflects actual server-side usage instead of unreliable localStorage counter — clearing browser data no longer resets the display (`ai-credits-tracking-and-messaging`)
- **Community funding messaging**: AI insights CTA explains that analyses are funded out of pocket, with warm invitation to support the project
- **Unsupported data alerts**: Sentry warnings for unsupported oximetry formats and failed SD card parses, enabling prioritised format support (`unsupported-data-alerts`)
- **Unlimited data contribution**: Removed 1095-night cap — all nights are submitted automatically via chunked batches of 1000 with shared `contributionId` (`unlimited-first-contribution`)

### Improved

- **Persistent contribution consent**: Remember opt-in status across sessions — returning users see a compact "Contributing data, thank you" confirmation instead of being asked again (persistent-contribution-consent)
- **Mobile-first landing CTAs**: Demo is now the primary CTA on mobile, with a note that uploading requires a desktop computer (`onboarding-quick-wins`)
- **"Start here" guidance**: New users see a brief callout above metrics explaining Glasgow Index and traffic light colours (`onboarding-quick-wins`)
- **Export download feedback**: CSV and JSON export buttons show "Downloaded!" confirmation for 2 seconds (`onboarding-quick-wins`)
- **Inclusive community sharing**: Share prompts now name ApneaBoard, Reddit, CPAPtalk, and "your favourite sleep community" (`onboarding-quick-wins`)
- **Upload page reorder**: Demo CTA moved above consent sections for discoverability (`onboarding-quick-wins`)

### Fixed

- **Oximetry-only upload**: Uploading oximetry CSV no longer re-processes the entire SD card — oximetry is matched to cached nights instantly (oximetry-only-reanalysis)
- **Oximetry upload from cached sessions**: Oximetry upload button now works after page refresh when previous analysis is restored from cache
- **Glasgow radar chart scaling**: Changed axis domain from `[0, 100]` to `[0, 1]` so low component scores (0–0.5) are visually readable instead of invisible (`glasgow-radar-scaling`)
- **Phase 1 — Critical engine bugs**: Fixed Glasgow Index weighted averaging, NED H1/H2 split boundary, WAT FFT zero-padding, oximetry buffer-zone trimming, and night-grouper date extraction
- **Phase 2 — Security hardening**: Added CSRF origin validation, rate limiting on all API routes, Stripe webhook signature verification, Zod validation on all external inputs, Content-Security-Policy headers
- **Phase 3 — Accessibility**: Added skip-to-content link, ARIA labels on all interactive elements, keyboard navigation for charts, semantic heading hierarchy, screen reader announcements for analysis progress
- **Phase 4 — UX quick wins**: Added loading skeletons, error boundaries with retry, empty states, toast notifications, improved upload validation messages
- **Heatmap date sort**: Fixed default sort to newest-first, added visible "Date" sort button replacing hidden arrow column, date sort now defaults to descending when re-selected
- **Metrics table date sort**: Fixed re-selecting Date column after sorting by another metric to default to newest-first

### Changed

- **Consolidated Supabase clients** — merged `lib/supabase.ts` into `lib/supabase/server.ts`; all routes now import from single module
- **Shared rate limiter** — replaced 5 inline rate-limiter implementations with shared `RateLimiter` class from `lib/rate-limit.ts`
- **Tightened night-grouper regex** — `DATALOG/(\d{8})/` instead of bare `(\d{8})/` to prevent false matches on non-ResMed paths
- **Removed stale Tailwind content path** — dropped `pages/**` entry (App Router only, no Pages Router)

### Removed

- **~85 macOS duplicate files** — removed Finder-created copies with " 2", " 3" etc. suffixes across entire codebase

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
