# AirwayLab Company Strategy (L2 Overlay)

> **last_reviewed:** 2026-04-10
> **layer:** L2 (Airwaylab-specific — references L1 Cortis frameworks where applicable)

---

## 1. Health-Tech Trust Dynamics

`scope: airwaylab-specific`

AirwayLab operates in a trust-critical health domain where credibility is earned differently than in typical SaaS:

- **Clinician endorsement as proxy signal.** PAP users trust tools that clinicians don't dismiss. AirwayLab's MDR-compliant positioning (educational, not diagnostic) means clinicians are less likely to push back against patients bringing AirwayLab reports to appointments. The goal is not clinician adoption — it's clinician non-objection.
- **Patient community skepticism.** Sleep apnea communities (ApneaBoard, r/SleepApnea, r/CPAP) are highly skeptical of commercial tools that claim to replace OSCAR or sell features that should be free. AirwayLab's open-source GPL-3.0 license and free-forever core analysis directly address this skepticism.
- **Regulatory positioning as trust lever.** By proactively complying with EU MDR language rules (no diagnostic claims, no therapy recommendations, no effectiveness judgments), AirwayLab can credibly claim responsible data handling — a differentiator against tools that play fast and loose with medical claims.
- **Data privacy as brand.** The browser-first architecture (Tier 1: no data leaves the device) is a competitive moat in a community that has been burned by apps secretly uploading health data. This isn't just a technical choice — it's the core brand promise.

---

## 2. MDR Compliance as Strategic Constraint

`scope: airwaylab-specific`

MDR compliance is not a development detail — it's a company-level strategic constraint that shapes every feature decision:

- **EU MDR Rule 11 classification.** Software is classified as a medical device when it "provides information which is used to take decisions with diagnosis or therapeutic purposes." Disclaimers do NOT override functional classification. If AirwayLab crosses the line in code behavior, disclaimers won't save it.
- **Five MUST rules** govern all user-facing text:
  1. Never suggest therapy changes (describe data patterns only)
  2. Never use diagnostic language (no "suggests obstruction")
  3. Never make predictive claims (no "typically respond to")
  4. Never assert clinical effectiveness (no "therapy is working")
  5. AI prompts describe data only, never suggest actions
- **Compliance review path.** PRs touching insights, AI prompts, clinical features, email templates, or marketing copy require Head of Compliance review before merge.
- **Strategic implication:** Every growth initiative, marketing message, and feature description must be filtered through MDR compliance. This slows shipping but prevents existential regulatory risk.

---

## 3. Revenue Model & Pricing

`scope: airwaylab-specific`

Three-tier subscription model where the free tier is deliberately complete:

| Tier | Price | Key Differentiator |
|------|-------|--------------------|
| **Community** | Free | All 4 analysis engines, 3 AI insights/month, cloud backup, CSV/JSON export |
| **Supporter** | $9/mo or $79/yr | Deep AI insights (unlimited), 90-day history, PDF clinician reports, Discord |
| **Champion** | $25/mo or $199/yr | Lifetime history, early access, roadmap vote, name on supporters page |

- Revenue tracked via Stripe webhooks with MRR calculation (yearly amounts / 12)
- Subscription lifecycle events logged to `subscription_events` table
- Community tier is intentionally generous — core health analysis is never paywalled
- Premium funds development velocity, not essential features

---

## 4. Budget & Resource Constraints

`scope: airwaylab-specific`

- **Maintenance budget:** 2 hours per week
- **AI model:** Claude Haiku for Community, Claude Sonnet for paid tiers (cost-driven, not capability-driven for free tier)
- **Shipping discipline:** Max 3 feature PRs per day, bundle size budget (flag >10KB increase)
- **Infrastructure:** Supabase (EU region, GDPR), Vercel hosting, Stripe payments
- **Implication:** Every feature request competes against a 2hr/week budget. Features that create ongoing maintenance load (monitoring, moderation, support) have disproportionate cost. Prefer self-service, automated, low-maintenance solutions.

---

## 5. PMF Signals (Airwaylab-Specific)

`scope: airwaylab-specific`

Concrete signals that indicate product-market fit for AirwayLab:

- **Paying subscriber count** — primary signal. Free-to-paid conversion from Community to Supporter/Champion tiers.
- **Analyze usage** — uploads to `/analyze` endpoint. Tracked via `analysisComplete` Plausible event with night count. Returning user uploads tracked separately (`returningUserUpload`).
- **Clinician referrals** — users bringing AirwayLab PDF reports to appointments. Indirect signal via `pdf_report` feature usage (Supporter+ only).
- **Community data contribution opt-in rate** — `contributionOptedIn` vs `contributionDismissed` events. Willingness to share anonymized data indicates trust.
- **Forum export usage** — `export` events with `forum` format. Users sharing AirwayLab results on ApneaBoard/Reddit indicates perceived value.
- **AI insight engagement** — `aiInsightRequested`, `aiInsightsGenerated` events. Community tier usage nearing 3/month cap signals upgrade potential.
- **Churn signals (gap):** No churn tracking currently implemented. Stripe `customer.subscription.deleted` events logged but no cohort analysis or win-back automation in place.

---

## 6. AARRR Mapped to Airwaylab Metrics

`scope: airwaylab-specific`

> `[CORTIS-CANDIDATE]` The AARRR (Pirate Metrics) framework itself is generic.
> `TODO: import from L1 when available` — only the metric mapping below is L2.

| Stage | Airwaylab Metric | Source |
|-------|------------------|--------|
| **Acquisition** | Plausible traffic data, SEO blog views, GitHub stars | `github-stars` API, Plausible dashboard |
| **Activation** | First `/analyze` completion (upload → parse → analyze → view results) | `analysisComplete` event |
| **Retention** | Return visits over 7/30 day windows, returning user uploads | `returningUserUpload` event |
| **Referral** | Forum exports, GitHub stars, user-generated community benchmarks | `export` (format=forum), `shareCreated` events |
| **Revenue** | Stripe subscriptions, trailing free-to-paid conversion rate | `subscriptionStarted` event, `subscription_events` table MRR |

---

## 7. Health-Tech Failure Mode Risk Calibration

`scope: airwaylab-specific`

> `[CORTIS-CANDIDATE]` Generic startup failure modes are an L1 framework.
> `TODO: import from L1 when available` — only the Airwaylab-specific risk calibration below is L2.

| Failure Mode | Risk Level | Airwaylab Context |
|-------------|------------|-------------------|
| **Feature bloat** | HIGH | 2hr/week budget means every feature is a maintenance commitment. One complex feature can consume the entire weekly budget in support/bugs. |
| **Copy-paste strategy** | HIGH | Health-tech has unique regulatory and trust constraints. Generic PLG playbooks fail when they introduce MDR violations or erode community trust. |
| **Premature scaling** | MEDIUM | PMF not yet validated at scale. Scaling infrastructure or team before confirming subscriber growth trajectory wastes the constrained budget. |
| **Ignoring churn signals** | MEDIUM | No churn tracking exists beyond raw Stripe cancellation events. No cohort analysis, no win-back flows, no exit surveys. |
| **Wrong channel** | LOW | Reddit (r/SleepApnea, r/CPAP) and ApneaBoard are validated acquisition channels. Forum export feature directly serves this. |

---

## 8. Open-Core Strategy Specifics

`scope: airwaylab-specific`

AirwayLab's open-core model has Airwaylab-specific constraints beyond generic open-source business models:

- **Free tier completeness rule.** Health analysis is never gated behind a paywall. All four engines (Glasgow, WAT, NED, Oximetry), rule-based insights, and data export are free forever. This is a non-negotiable architectural constraint, not a growth tactic.
- **Premium funds development, not features.** Paid tiers add convenience (AI depth, history, reports) rather than withholding essential analysis. This distinction matters for community trust.
- **Community trust is the moat.** In health-tech, the community can turn against a tool overnight if it's perceived as exploiting patients. GPL-3.0 licensing, browser-first privacy, and free core analysis are trust investments, not cost centers.
- **GPL-3.0 as trust signal.** The Glasgow Index engine is ported from DaveSkvn/Glasgow-Index (GPL-3.0), requiring the entire project to be GPL-3.0. This aligns with the mission: open data, open code, verifiable trust. Users can audit exactly what the tool does with their health data.
- **Contributor pipeline ordering:** docs > fixes > features. Community contributions should start with documentation and bug fixes before feature development, building familiarity and trust incrementally.

---

## 9. Privacy Architecture as Strategy

`scope: airwaylab-specific`

The two-tier privacy architecture is a strategic differentiator, not just a technical choice:

**Tier 1 — Browser-only (default):**
- All core analysis runs client-side in a Web Worker
- EDF files parsed, flow data extracted, all four engines execute without any network request
- Results persist in localStorage (`airwaylab_` prefix, 30-day expiry, 4MB cap)
- No health data leaves the browser. Ever. This is the core brand promise.

**Tier 2 — Server-enhanced (opt-in):**
- AI insights send anonymized metrics (never raw waveforms) to Claude
- Data contribution sends anonymized aggregate metrics to Supabase
- Every server interaction requires explicit, affirmative user consent
- No implicit consent via feature gates — consent is a separate, informed step

**Strategic implication:** Every new feature must be classified as Tier 1 or Tier 2 before development begins. Features that touch health data and don't have explicit consent flows belong in Tier 1 (browser-only). This constraint limits what the server can do but is the foundation of user trust.

---

## 10. Growth Targets & Current Metrics

`scope: airwaylab-specific`

**Current tracking infrastructure:**
- 43+ Plausible events covering the full funnel (upload → analyze → export → subscribe → contribute)
- Stripe subscription lifecycle with MRR calculation
- Community benchmark data accumulation (percentile bands: p10, p25, p50, p75, p90)
- AI usage tracking per tier with rate limiting (Community: 3/month, Paid: 3x rate via token bucket)

**Validated channels:**
- SEO blog content (Glasgow, WAT, NED, FL score glossary pages)
- Reddit/ApneaBoard community engagement (forum export feature)
- GitHub stars as social proof signal (cached via `github-stars` API)

**Email automation sequences:**
- `feature_education` — educate on analysis capabilities
- `premium_onboarding` — paid tier onboarding
- `activation` — drive first upload completion
- `dormancy` — re-engage lapsed users

**Gaps:**
- No cohort retention analysis
- No churn survey or win-back automation
- No referral tracking beyond forum exports
- Community benchmark sample size thresholds not yet defined

---

## 11. Market Dynamics (Sleep/Airway Domain)

`scope: airwaylab-specific`

- **Primary competitor:** OSCAR (Open Source CPAP Analysis Reporter). Desktop-only, powerful but complex, no AI, no cloud. AirwayLab targets users who find OSCAR overwhelming or want AI-augmented understanding.
- **User profile:** CPAP/BiPAP users who want to understand their therapy data beyond what their machine's app provides. Range from newly diagnosed to multi-year users who track nightly data.
- **Clinician relationship:** Users bring data to sleep specialists. AirwayLab's PDFs are designed to be clinician-readable without requiring clinician adoption of the tool.
- **ResMed ecosystem:** Primary device manufacturer. EDF format parsing covers AirSense 10/11, AirCurve 10 devices. BMC Luna also supported via device detection.
- **Oximetry add-on:** Viatom/Checkme O2 Max CSV integration adds SpO2/HR correlation — a feature OSCAR doesn't offer natively.

---

## Generic Framework References

> The following L1 frameworks are referenced but not reproduced here. They should be imported from Cortis L1 when available.

- `TODO: import from L1 when available` — PLG Flywheel frameworks
- `TODO: import from L1 when available` — PMF signal taxonomies (generic)
- `TODO: import from L1 when available` — AARRR / Pirate Metrics (framework definition)
- `TODO: import from L1 when available` — Common startup failure modes (generic taxonomy)
- `TODO: import from L1 when available` — Generic prioritization frameworks (ICE, RICE)
- `TODO: import from L1 when available` — ERRC / Blue Ocean strategy
- `TODO: import from L1 when available` — Community-led growth frameworks
