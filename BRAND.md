# AirwayLab — Brand & Voice Guidelines

## Positioning

### Core message
**"Your breathing data belongs to you."**

AirwayLab exists because PAP machines collect thousands of data points every night — and most of it goes unanalysed. Clinicians check AHI and move on. Millions of people are "treated" with AHI under 5 but still wake up exhausted because flow limitation, RERAs, and breathing pattern instability go undetected.

AirwayLab makes that data visible, understandable, and actionable.

### What we are
- A free, open-source analysis tool built by a PAP user for PAP users
- A complement to OSCAR, not a replacement
- Privacy-first: all core analysis runs in the browser, nothing uploads without consent
- Transparent about our code (GPL-3.0) and our commercial model

### What we are NOT
- Not a medical device. Not FDA or CE cleared.
- Not a replacement for clinical judgement
- Not a data harvesting platform disguised as a health tool
- Not a startup chasing growth metrics at the expense of user trust

### Value hierarchy
1. **Privacy** — your data stays on your device unless you choose otherwise
2. **Accessibility** — free tier is complete, not crippled
3. **Transparency** — open-source code, honest commercial model
4. **Clinical relevance** — research-grade analysis that goes beyond AHI

### Commercial philosophy
The free tier includes all four analysis engines, rule-based insights, exports, persistence, and the full dashboard. It is complete and always will be. Premium features (AI-powered therapy insights via Claude Haiku) exist to fund continued development — not to gate essential analysis.

Frame premium as: "If you find AirwayLab valuable, this is how you support its future."
Never frame premium as: "Upgrade to unlock the full experience."

The open-core model is honest. Don't be defensive about it and don't be apologetic. Building and maintaining clinical-grade analysis software takes time. Premium is how that time gets funded. The community understands this — they've watched other tools go fully commercial. Be direct about the tradeoff.

## Voice & Tone

### Character
Write as a fellow PAP user who happens to build software. Empathetic because you understand the exhaustion. Direct because you respect people's time. Honest because this community has been burned by corporate health tech.

### Tone qualities
- **Warm** — you know what it's like to wake up feeling worse than when you went to sleep
- **Direct** — say what you mean without filler or qualifiers
- **Honest** — transparent about limitations, commercial model, and what the tool can't do
- **Knowledgeable** — use clinical terminology correctly (the community knows these terms)
- **Never corporate** — no marketing speak, no buzzwords, no hype

### Words to use
- Flow limitation, RERAs, AHI, therapy optimisation, breathing patterns
- "Your data", "your browser", "your device"
- "Open source", "verifiable", "auditable"
- "Discuss with your clinician"
- "Free and always will be"

### Words to never use
- Revolutionary, game-changing, cutting-edge, empower, unlock
- "Take control of your health journey"
- "AI-powered" as the primary selling point (it's a feature, not the product)
- "Smart", "intelligent", "advanced" as vague modifiers
- "Patients" when you mean "people" or "PAP users"
- Any SleepHQ, myAir, or competitor bashing by name (compare on features, not attacks)

### Tone examples

**Good:** "Your machine collects thousands of data points every night. Most of it never gets looked at. We think that's wrong."

**Bad:** "AirwayLab empowers patients to take control of their health journey through revolutionary analytics."

**Good:** "Premium features help fund continued development. The free tier is complete — not a trial."

**Bad:** "Upgrade to Pro to unlock advanced AI-powered insights and take your therapy to the next level."

**Good:** "We recommend discussing these results with your sleep physician before making therapy changes."

**Bad:** "Disclaimer: This is not medical advice."

## Microcopy Rules

### Error messages
- Lead with what happened, then what to do
- Never show raw error messages, stack traces, or technical codes
- Keep the tone calm and helpful, not alarming

```
Good: "We couldn't read this file. AirwayLab works with ResMed BRP.edf files — check that you've selected your SD card's DATALOG folder."
Bad:  "Error: Invalid EDF header at byte 256. Expected ASCII, got null."
```

### Empty states
- Explain what goes here and how to fill it
- Keep it encouraging, not condescending

```
Good: "No oximetry data yet. Upload a Viatom/Checkme O2 Max CSV alongside your SD card files to see SpO2 and heart rate analysis."
Bad:  "No data available."
```

### Loading states
- Use active, present-tense descriptions of what's happening
- For multi-step processes, show the current step

```
Good: "Parsing EDF files (12/47)..."
Good: "Analysing night 2024-01-15..."
Bad:  "Loading..."
Bad:  "Please wait while we process your data."
```

### CTAs (calls to action)
- Be specific about what happens when you click
- Primary CTAs: action-oriented ("Upload Your SD Card", "See Demo", "Export PDF")
- Secondary CTAs: informational ("Learn how it works", "View source code")

```
Good: "Upload Your SD Card" / "Try the Demo"
Bad:  "Get Started" / "Learn More"
```

### Premium upsells
- Frame as supporting the project, not unlocking features
- Always mention that free analysis is complete
- Keep it brief and non-intrusive

```
Good: "AI-powered insights are available to supporters. Your support keeps AirwayLab free and open source."
Bad:  "Upgrade to Premium to access AI Insights!"
```

### Medical disclaimers
- Include wherever health-related analysis is presented
- Keep the tone respectful but clear
- Don't bury it or minimise it — these users take their health seriously

```
Standard: "AirwayLab is not a medical device. Always discuss results with your sleep physician before making therapy changes."
Short (inline): "Discuss with your clinician before changing settings."
```

## Sharing & Empathy Hooks

### Why share?
The PAP community is generous with knowledge. People share OSCAR screenshots, write detailed therapy journals on ApneaBoard, and help strangers optimise settings. AirwayLab should make sharing natural and rewarding — not by gamifying it, but by making results easy to share in the formats the community already uses.

### GitHub star
A low-commitment way to say "I find this useful." Use it as the open-source equivalent of a follow.
- CTA: "Star on GitHub" (with live count when available)
- Placement: header (desktop), landing page community section, demo mode exit
- Tone: "Star the repo to follow development" — not "Please star us!"

### Forum export
Every forum post with AirwayLab attribution is trust-building visibility.
- Attribution line: include "airwaylab.app" and "your data never leaves your browser"
- The privacy message is the trust hook — it's what differentiates from commercial alternatives
- Include a GitHub link as a secondary discovery path

### Premium / Supporter
Frame supporters as people who believe in the mission, not customers who bought a product.
- "Supporter" (free tier who contributes in non-monetary ways: stars, forum posts, bug reports)
- "Champion" (paid tier who funds development)
- Never "free user" vs "premium user" — everyone is a user. Some also support financially.

### Word of mouth
The community is small and tight-knit. One helpful forum post reaches hundreds of people who are actively searching for therapy answers. Design sharing features around this reality:
- Forum export is the primary sharing mechanism
- PDF report is the clinician-sharing mechanism
- Chart watermarks ("airwaylab.app") create passive brand awareness in screenshots
- All sharing prompts must be dismissable and non-nagging

## Visual Identity

### Aesthetic
Dark-only, clinical, clean. The visual language should communicate "trustworthy medical tool" not "consumer health app."

### Colour system
- Background/foreground: HSL CSS variables in `globals.css`
- Traffic lights: emerald (good) / amber (warn) / red (bad) — consistent across all metrics
- Chart colours: `chart-1` through `chart-5` defined in Tailwind config
- Accent: primary colour with `/10`, `/20` opacity variants for subtle highlights
- Borders: `border/50` for subtle separation

### Typography
- **IBM Plex Sans** — body text, UI, headings. Weights: 300–700.
- **JetBrains Mono** — metric values, data tables, code. Weights: 400–700.
- Letter spacing: `tightest` (-0.03em) available for display text.

### Component styling
- Use shadcn/ui primitives from `components/ui/`
- Cards with `card-elevated` for emphasis, standard `card` for containers
- Glow effects via `glow-sm`, `glow-md`, `glow-lg` box-shadows
- Shimmer animation available for loading states
- Backdrop blur (`bg-background/80 backdrop-blur-xl`) on sticky header
- Consistent border radius via CSS variable `--radius`

### Accessibility
- Skip-to-content link on every page
- Semantic HTML and proper heading hierarchy
- Keyboard navigation on all interactive elements
- Sufficient colour contrast (verify against dark background)
- Alt text on all images
- `sr-only` class for screen-reader-only content

### Trust signals
- Privacy badge component (`components/common/privacy-badge.tsx`)
- "Your data never leaves your browser" — visible on landing page, upload area, and footer
- GPL-3.0 badge linking to license
- GitHub star count (social proof via openness)
- Medical disclaimer wherever analysis is shown

## Language Conventions

### Therapy terminology
Use the terms the community uses. Don't simplify clinical terms — PAP users know them.

| Use | Don't use |
|-----|-----------|
| Flow limitation | Airflow restriction |
| RERAs | Respiratory events |
| AHI | Sleep apnea index |
| PAP therapy | CPAP treatment (unless specifically about CPAP) |
| Breathing patterns | Respiratory data |
| Therapy optimisation | Treatment improvement |
| Sleep physician / clinician | Doctor (too generic) |
| SD card data | Machine data |

### Data and privacy
| Use | Don't use |
|-----|-----------|
| Your data | User data |
| Your browser | The client |
| Runs locally | Client-side processing |
| Never leaves your device | Secure processing |
| Open source (GPL-3.0) | Open source (without license) |

### Analysis output
| Use | Don't use |
|-----|-----------|
| Results | Findings / Diagnostics |
| Insights | Recommendations |
| Metrics | Scores (too gamified) |
| Traffic light indicators | RAG status |
| Night summary | Report (reserve for PDF export) |

### People
| Use | Don't use |
|-----|-----------|
| PAP users | Patients (too clinical) |
| People | Users (when talking about humans, not software) |
| Supporter | Free user |
| Champion | Premium user / subscriber |
| The community | Our users / our customers |
