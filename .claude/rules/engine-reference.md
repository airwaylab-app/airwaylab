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

---

## Empirical Thresholds & Peer-Reviewed Clinical Citations

| Diagnostic Metric / Domain | Engine & Source Code | Clinical / Algorithmic Cutoff | Peer-Reviewed Citation | Physiological & Biomechanical Rationale |
| :--- | :--- | :--- | :--- | :--- |
| **Negative Effort Dependence (NED)** | `lib/analyzers/ned-engine.ts` | $NED = \frac{Q_{peak} - Q_{mid}}{Q_{peak}} \times 100$<br>Borderline: $20\%–34\%$<br>Clear FL: $\ge 34\%$ | **Genta et al. (2017)**, *J Appl Physiol* | Epiglottic pressure & endoscopic validation demonstrating concave pharyngeal tube-law behavior and mid-inspiratory stiffening. Quantifies flow drop despite escalating intrathoracic effort. |
| **M-Shape Palatal Collapse** | `lib/analyzers/ned-engine.ts`<br>`lib/analyzers/glasgow-index.ts` | Mid-inspiratory flow dip $< 80\% \ Q_{peak}$ in middle $50\%$ of $T_i$<br>Target: $< 2.0\%$ of breaths | **Genta et al. (2016, 2017)** | Differentiates velopharyngeal / soft-palate flutter and lateral-wall collapse from classic tongue-base or epiglottic truncation. |
| **Normative vs. Pathological %IFL** | `lib/ifl-risk.ts`<br>`lib/thresholds.ts` | Target: $< 15\% \ TST$<br>Normative 95th %ile ceiling: $30\% \ TST$<br>Pathological: $> 30\% \ TST$ | **Palombini et al. (2013)**, *Sleep Science* | Population PSG of asymptomatic healthy adults established normal flow limitation at mean $8.8\% \pm 10.4\%$ (median $5.1\%$, 95th percentile $30\%$). $> 30\%$ represents abnormal high-resistance breathing. |
| **UARS Case-Control Criteria** | `lib/thresholds.ts`<br>`lib/derived-metrics.ts` | $\text{AHI} < 5.0\text{ /hr}$, $\text{SpO}_2 > 90\%$, and Airflow Limitation $> 6.0\% \ TST$ | **de Oliveira et al. (2016)**, *Sleep Med* | Establishes that standard AHI is non-diagnostic in UARS. Distinguishes symptomatic UARS patients (daytime fatigue, ESS $> 10$) from controls via continuous IFL burden. |
| **Starling Resistor Truncation (`flatTop`)** | `lib/analyzers/glasgow-index.ts` | Plateau duration within top $10\%$ flow<br>Target: $< 0.15$ | **Patil et al. (2007)**, *Am J Respir Crit Care Med* | Pharyngeal partial collapse when $P_{us} > P_{crit} > P_{ds}$; inspiratory flow plateaus at a constant maximal level regardless of downstream tracheal suction. |
| **Autonomic HR Surges vs. Desaturation** | `lib/analyzers/oximetry-engine.ts`<br>`lib/analyzers/ned-engine.ts` | $\ge 6\text{ bpm}$ & $\ge 10\text{ bpm}$ surges<br>Brief Obstruction: $> 40\%$ flow drop | **Guevarra et al. (2022)**, *J Clin Sleep Med* | In mild SDB/UARS, only $25\%$ of IFL events cause $\ge 3\%$ desaturations, whereas $55\%$ trigger sympathetic HR surges and $67\%$ cause EEG/HR surges. |
| **RERA Recovery Breath & Ventilatory Overshoot** | `lib/analyzers/ned-engine.ts` (`detectRERASequences`, `computeEAI`) | Next breath $NED < 10\%$ & post-sequence $Q_{peak} > 1.5\times$ mean<br>EAI: $TV > 50\%$ & $RR > 35\%$ | **Guevarra et al. (2022)**;<br>**Mansour et al. (2019)** | Flow-limited runs ending with recovery breaths ($\ge 200\%$ amplitude jump or recovery to $<10\%$ NED) strongly predict cortical and autonomic arousal. |
| **Limbic & HPA Stress Response** | `lib/ifl-risk.ts`<br>`lib/metric-explanations.ts` | IFL Symptom Risk composite ($0–100$): weights WAT, NED, FI, Glasgow | **Gold et al. (2003, 2016)**;<br>**Mann et al. (2024)** | Flow limitation and prolonged inspiratory resistance drive clinical fatigue and somatic symptoms through limbic/HPA-axis stress response independently of cortical arousals. |

