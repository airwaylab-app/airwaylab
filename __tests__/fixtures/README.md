# Test Fixtures — Real Device Data

These files are from real BiPAP and pulse oximetry devices, contributed by the project maintainer for testing purposes.

## What's included

| Directory | Purpose | Sessions |
|-----------|---------|----------|
| `sd-card/DATALOG/20260309/` | Single-session typical night | 1 BRP (~3.9MB) |
| `sd-card/DATALOG/20260111/` | Multi-session night (mask-off + two full sessions) | 3 BRP files |
| `sd-card/DATALOG/20260207/` | Tiny BRP file (<50KB, tests size filter) | 1 BRP (1.3KB) + EVE |
| `sd-card/STR.edf` | Machine settings (all dates) | — |
| `sd-card/Identification.tgt` | Device model identification | — |
| `oximetry/checkme-o2-max-20260310.csv` | Full-night Checkme O2 Max recording (~13.5K samples) | — |
| `oximetry/checkme-o2-max-20260309.csv` | Recording matching SD card date 20260309 (~11K samples) | — |
| `oximetry/checkme-o2-max-20260220-short.csv` | Short recording edge case (~2.5K samples) | — |

## Privacy

- BRP files contain only flow waveform data — no patient identification
- PLD/SAD files contain pressure, leak, and SpO2 signal data — no patient identification
- EVE files contain event markers — no patient identification
- STR.edf contains machine settings (mode, pressures, trigger/cycle sensitivity)
- Identification.tgt contains the device model string

- Oximetry CSV files contain SpO2, heart rate, and motion values with timestamps — no patient identification

No names, dates of birth, or personally identifiable information are present in any of these files.

## File types

| Extension | Content |
|-----------|---------|
| `*_BRP.edf` | Breath waveform (flow rate at 25 Hz) |
| `*_PLD.edf` | Pressure, leak, and derived signals (1–2 Hz) |
| `*_SAD.edf` | SpO2 and auxiliary data |
| `*_EVE.edf` | Event markers |
| `STR.edf` | Machine settings timeline |
| `Identification.tgt` | Device model identification |
| `*.csv` (oximetry) | SpO2, HR, motion at 2s intervals (Checkme O2 Max) |
