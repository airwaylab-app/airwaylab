---
title: "Competitive Repo Evaluation — March 2026"
date: 2026-03-26
domain: [competitive, technical]
tags: [open-source, cpap, sleep-analysis, glasgow, philips, airbridge, megascore, monthly-evaluation]
status: current
context: Monthly evaluation of open-source CPAP/sleep analysis repos for feature ideas and competitive positioning
sources:
  - "https://github.com/DaveSkvn/GlasgowIndex"
  - "https://github.com/VibeCoder75321/Multi-Night-Glasgow-Index-Analyzer"
  - "https://github.com/m-kozlowski/airbridge"
  - "https://github.com/AJolly/cpap-megascore"
---

# Competitive Repo Evaluation — March 2026

Monthly evaluation of open-source repos in the CPAP/sleep analysis ecosystem. Tracks changes, new features, and opportunities to adopt or differentiate.

## Evaluation Cadence

Run monthly. Compare against previous evaluation to detect deltas. Convert high-value findings into AirwayLab specs.

## Repos Under Monitoring

| Repo | URL | Type | Threat | Watch For |
|------|-----|------|--------|-----------|
| DaveSkvn/GlasgowIndex | https://github.com/DaveSkvn/GlasgowIndex | Upstream dependency (GPL-3.0) | None (frozen) | Algorithm updates, new components, community forks |
| VibeCoder75321/Multi-Night-Glasgow-Index-Analyzer | https://github.com/VibeCoder75321/Multi-Night-Glasgow-Index-Analyzer | Community derivative | Low | New metrics, community adoption, interpretation scales |
| m-kozlowski/airbridge | https://github.com/m-kozlowski/airbridge | Hardware (ESP32, complementary) | None | Register maps, protocol specs, oximetry-in-EDF adoption |
| AJolly/cpap-megascore | https://github.com/AJolly/cpap-megascore | Browser analysis tool | Low | Philips parser updates, new analysis algorithms, aerophagia |
| m-kozlowski/airbreak-plus | https://github.com/m-kozlowski/airbreak-plus | Firmware mod (related) | None | ResMed internals documentation, register discoveries |

## March 2026 Evaluation

### 1. DaveSkvn/GlasgowIndex

| Metric | Value |
|--------|-------|
| Stars | 13 |
| Forks | 4 |
| Last commit | 2025-02-07 (13+ months ago) |
| Activity | Frozen. Author stated "not putting too much effort into this version" |

**Status:** No changes since AirwayLab ported it. Zero algorithm drift risk.

**Key finding — Bug in calcCycleBasedIndicators():**
Issue #1 reports hundreds of "NOT SUPPOSED TO GET HERE" errors for breathing patterns with longer inspiration times (>1.4s average, up to 4s when falling asleep). The `emgyBreak=10` loop limit and `MIN_WINDOW=25` are too rigid. **This bug exists in AirwayLab's port too.** Spec created: `glasgow-cycle-indicators-robustness.md`.

**Community signal:** RJHug00 (experienced programmer, active CPAP user) offered to collaborate on future implementations and is extending VibeCoder's tool. Potential outreach target.

**Next eval check:** Any new forks, issue activity, or DaveSkvn's mentioned C++ OSCAR integration.

### 2. VibeCoder75321/Multi-Night-Glasgow-Index-Analyzer

| Metric | Value |
|--------|-------|
| Stars | 10 |
| Forks | 7 |
| Last push | 2026-01-15 |
| Activity | Low but has community adoption |

**Status:** Most significant Glasgow derivative. All additions are presentation-layer (multi-night trends, CSV export, settings display). Core algorithm unchanged.

**Features AirwayLab already has:** Multi-night analysis, trend charts, settings extraction, CSV export, component filtering. AirwayLab is significantly ahead.

**Interpretation scale published:** 0-0.2 excellent, 0.2-1.0 good, 1.0-2.0 fair, 2.0-3.0 poor, 3.0+ very poor. Worth cross-referencing with AirwayLab's threshold system.

**Next eval check:** Fork activity (7 forks), new contributors, community threads referencing it.

### 3. m-kozlowski/airbridge

| Metric | Value |
|--------|-------|
| Stars | 2 |
| Forks | 0 |
| Last commit | 2026-03-25 (yesterday) |
| Activity | Brand new (created 2026-03-23), actively developed |

**Status:** ESP32-based wireless adapter for ResMed AirSense/AirCurve 10. Hardware layer -- not competitive with AirwayLab. Potentially complementary.

**What it does:**
- Connects to AirSense UART debug port via physical edge connector
- BLE oximetry integration (Nonin 3150, Wellue O2Ring, generic PLX/HR sensors)
- Injects SpO2/pulse INTO the AirSense so it records in SAD.edf natively
- Web UI for reading/writing ALL therapy settings, live pressure/flow waveforms
- Firmware OTA flashing

**Relevance to AirwayLab:**

| Area | Value | Spec? |
|------|-------|-------|
| Complete register/variable map (70+ settings, 30+ report vars) | High -- most comprehensive public mapping of ResMed internals | Cross-reference with settings-extractor.ts |
| Oximetry injection into SAD.edf | Medium -- if adopted, eliminates separate CSV import | Monitor adoption |
| Q-frame UART protocol spec | Low (future Web Serial API) | No |
| Session summary registers (AHI, AI breakdowns, RERA, ventilation) | Medium -- validation baseline for engine outputs | Cross-reference with comprehensive-settings-extraction.md |

**Author context:** m-kozlowski has a related `airbreak-plus` repo (6 stars) with JTAG debugging, Ghidra RE, and direct STM32 memory access. Deep embedded systems expertise with ResMed internals.

**Next eval check:** Stars growth (indicator of community adoption), new register discoveries, SAD.edf oximetry format documentation.

### 4. AJolly/cpap-megascore (philips branch)

| Metric | Value |
|--------|-------|
| Stars | 1 |
| Forks | 0 |
| Last commit | 2026-03-25 (yesterday) |
| Activity | Actively developed (6 commits in 24h on philips branch) |

**Status:** Solo developer building a personal browser-based analysis tool. Combines Glasgow + Wobble into single interface. Vanilla JS, no framework, no build step. ~4600 lines in a single HTML file.

**High-value findings (3 specs created):**

| Finding | Spec | Priority |
|---------|------|----------|
| **Philips DreamStation parser** — full .005 waveform + .001 header parser ported from OSCAR C++ | `philips-dreamstation-support.md` | High |
| **Aerophagia/flow balance detection** — per-breath in/out volume comparison, 20% threshold | `aerophagia-flow-balance.md` | Medium |
| **Per-breath pressure correlation** — peak mask pressure tracked during GI computation | `pressure-flow-limitation-correlation.md` | Medium |

**Other notable features:**
- Wobble Disruption Score composite: `((FL + Periodicity + Regularity) / 3 + EAI) / 2` — AirwayLab shows these separately, which is arguably better for clinical understanding
- Configurable analysis thresholds via settings panel — interesting but risky (users can miscalibrate)
- User-overridable session inclusion (manually include/exclude sessions) — nice UX touch
- IndexedDB caching with lazy flow data reconstruction (strips x-coords, rebuilds on demand)
- Session classification: main, noon-split, bathroom break, nap — more granular than AirwayLab's folder-based grouping
- todo.md reveals plans for HR-correlated arousal detection (same direction as AirwayLab's feature pipeline)

**Developer context:** Real CPAP user with detailed sleep tracking annotations (mask types, medications, conditions). Active in the community. Potential contributor or collaborator.

**Next eval check:** Philips parser completeness, new analysis algorithms, main branch vs philips convergence.

## Specs Generated From This Evaluation

| Spec | Source Repo | Priority | Rationale |
|------|-------------|----------|-----------|
| `philips-dreamstation-support.md` | cpap-megascore | High | Market expansion — ~30% of PAP users are on Philips |
| `aerophagia-flow-balance.md` | cpap-megascore | Medium | Novel metric, clinically relevant, no other tool has it |
| `pressure-flow-limitation-correlation.md` | cpap-megascore | Medium | Therapy optimization — links pressure settings to FL events |
| `glasgow-cycle-indicators-robustness.md` | GlasgowIndex Issue #1 | High | Bug fix — silent errors on certain breathing patterns |

## Competitive Positioning Summary

AirwayLab remains significantly ahead of all open-source alternatives:

| Capability | AirwayLab | GlasgowIndex | VibeCoder Multi-Night | cpap-megascore | airbridge |
|------------|-----------|--------------|----------------------|----------------|-----------|
| Glasgow Index | Yes | Yes | Yes | Yes | No |
| WAT (Wobble) | Yes | No | No | Yes | No |
| NED engine | Yes | No | No | No | No |
| Oximetry pipeline | Yes | No | No | No | Injection only |
| AI insights | Yes (Sonnet) | No | No | No | No |
| Multi-night trends | Yes | No | Yes | Yes | No |
| Settings extraction | Yes | No | Yes | Yes | Read/write |
| Philips support | No | No | No | Yes | No |
| Cloud sync | Yes | No | No | No | N/A |
| Export (CSV/JSON/PDF) | Yes | No | Yes (CSV) | Yes (CSV) | No |
| Privacy architecture | Tier 1/2 | Client-only | Client-only | Client-only | Local WiFi |
| Stripe billing | Yes | No | No | No | No |

**Key gap:** Philips DreamStation support. cpap-megascore is the only browser tool with a working parser. Addressing this expands AirwayLab's addressable market by ~30%.

**No competitive threats.** All repos are either frozen (Glasgow), complementary (airbridge), or early-stage personal tools (cpap-megascore). AirwayLab's 4-engine architecture, AI insights, and privacy-first cloud sync are unmatched.
