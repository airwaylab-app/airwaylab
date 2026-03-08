# AirwayLab

[![License: GPL-3.0](https://img.shields.io/badge/License-GPL%203.0-blue.svg)](LICENSE)
[![Demo](https://img.shields.io/badge/Demo-airwaylab.app-brightgreen)](https://airwaylab.app)
[![Privacy](https://img.shields.io/badge/Privacy-Data%20Never%20Leaves%20Your%20Device-blueviolet)]()

Free, open-source flow limitation analysis for ResMed CPAP/BiPAP data.

[Try the demo →](https://airwaylab.app/analyze?demo) · [Live site →](https://airwaylab.app)

## What it does

AirwayLab reads the raw flow waveform from your ResMed SD card and runs four independent analysis engines — entirely in your browser.

| Engine | What it measures |
|--------|-----------------|
| **Glasgow Index** | 9-component breath shape scoring (skew, flat top, spike, etc.) on a 0–8 scale |
| **WAT (Wobble Analysis Tool)** | FL Score, Regularity (Sample Entropy), Periodicity (FFT spectral analysis) |
| **NED Analysis** | Peak-to-mid inspiratory flow ratio with automated RERA detection |
| **Oximetry Pipeline** | 16-metric SpO2 and heart rate framework from Viatom/Checkme O2 Max CSV |

## Features

- Interactive dashboard with per-night drill-down
- Multi-night trend analysis with linear regression
- Night heatmap for visual pattern recognition
- Rule-based clinical insights with traffic light thresholds
- Export to CSV, JSON, PDF, and forum-ready text
- Built-in demo mode with realistic synthetic data
- localStorage persistence (7-day history)
- Therapy change date marker for before/after comparison

## Privacy first

- **All processing happens in your browser** — your sleep data never leaves your device
- No cookies, no fingerprinting, no tracking pixels
- No data is uploaded to any server
- Fully auditable open-source code (GPL-3.0)

## Supported devices

| Device | Status |
|--------|--------|
| ResMed AirSense 10 | ✅ Fully supported |
| ResMed AirCurve 10 (VPAP) | ✅ Fully supported |
| ResMed AirSense 11 | ⚠️ Experimental |

## How AirwayLab Compares

| Feature | AirwayLab | OSCAR | SleepHQ | myAir |
|---------|-----------|-------|---------|-------|
| Price | Free | Free | Free / $150yr Pro | Free |
| Platform | Web (any device) | Desktop | Web + Mobile | Mobile |
| Install required | No | Yes | No | Yes (app) |
| Data stays local | ✅ Yes | ✅ Yes | ❌ Cloud | ❌ Cloud |
| Flow limitation engines | 4 (Glasgow, WAT, NED, Oximetry) | 1 | Basic | None |
| Breath shape scoring | ✅ Glasgow Index | ❌ | ❌ | ❌ |
| RERA detection | ✅ Automated | Manual | ❌ | ❌ |
| Multi-manufacturer | ResMed only | Multi | ResMed focus | ResMed only |
| Open source | ✅ GPL-3.0 | ✅ GPL-3.0 | ❌ | ❌ |

*AirwayLab is designed to complement OSCAR, not replace it.*

## Getting started

### Hosted version

Visit [airwaylab.app](https://airwaylab.app) — no install needed.

### Local development

```bash
git clone https://github.com/airwaylab-app/airwaylab.git
cd airwaylab
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Tests

```bash
npm test
```

## Tech stack

- **Framework:** Next.js 14, TypeScript (strict)
- **Styling:** Tailwind CSS + shadcn/ui (with @base-ui/react)
- **Charts:** Recharts 3.8
- **Processing:** Web Workers for non-blocking analysis
- **Testing:** Vitest + Testing Library
- **Fonts:** IBM Plex Sans + JetBrains Mono

## Contributing

Open an issue before submitting large PRs. We especially welcome help with:

- AirSense 11 parser improvements
- Philips Respironics device support
- Additional pulse oximeter formats
- Internationalisation (i18n)

## Community

- [ApneaBoard Forum](https://www.apneaboard.com/)
- [r/SleepApnea](https://www.reddit.com/r/SleepApnea/)
- [r/CPAP](https://www.reddit.com/r/CPAP/)

## License

GPL-3.0. See [LICENSE](LICENSE).

The Glasgow Index engine is based on [DaveSkvn's Glasgow Index](https://github.com/DaveSkvn/Glasgow-Index) (GPL-3.0).

## Disclaimer

AirwayLab is **not** a medical device. It is **not** FDA or CE cleared. All analysis is for **informational and educational purposes only**. Always discuss results with your sleep physician before making therapy changes.
