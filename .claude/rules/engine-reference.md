---
globs:
  - "lib/analyzers/**"
  - "workers/**"
  - "lib/parsers/**"
---
# Analysis Engines Reference

### Glasgow Index (`lib/analyzers/glasgow-index.ts`)
Ported from DaveSkvn/GlasgowIndex (GPL-3.0). Scores inspiratory flow shapes on 9 components (0–1 each): skew, spike, flatTop, topHeavy, multiPeak, noPause, inspirRate, multiBreath, variableAmp. Overall score = sum of all 9 components, range 0–9. Pipeline: findMins → findInspirations → calcCycleBasedIndicators → inspirationAmplitude → prepIndices. Multi-session nights use duration-weighted averaging.

### WAT — Wobble Analysis Tool (`lib/analyzers/wat-engine.ts`)
Three metrics: FL Score (inspiratory flatness, 0–100, higher = worse), Regularity (Sample Entropy on minute ventilation, higher = more irregular), Periodicity Index (FFT power in 0.01–0.03 Hz band, detects periodic breathing at 30–100s cycles). Includes a Cooley-Tukey radix-2 FFT implementation.

### NED — Negative Effort Dependence (`lib/analyzers/ned-engine.ts`)
Per-breath analysis: NED = (Qpeak − Qmid) / Qpeak × 100, Flatness Index = mean/peak, Tpeak/Ti ratio, M-shape detection (valley < 80% Qpeak in middle 50% of inspiration). RERA detection: runs of 3–15 breaths with progressive FL features evaluated by NED slope, recovery breath, and sigh detection. Estimated Arousal Index (EAI): respiratory rate + tidal volume spikes vs 120s rolling baseline. Night summary includes H1/H2 split and combined FL percentage.

### Oximetry Pipeline (`lib/analyzers/oximetry-engine.ts`)
17-metric framework from Viatom/Checkme O2 Max CSV data. Cleaning pipeline: buffer zone trimming (15min start, 5min end), motion filter, invalid sample removal, SpO2 range validation (50–100), HR double-tracking correction. Metrics: ODI-3/ODI-4 (2min rolling baseline), HR Clinical surges (30s baseline, 8/10/12/15 bpm thresholds), HR Rolling Mean surges (5min baseline, 5s sustain), coupled events (ODI + HR within ±30s), desaturation time, summary stats, H1/H2 splits.
