# Changelog

All notable changes to AirwayLab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — Platform Audit (2026-03-10)

### Added

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
