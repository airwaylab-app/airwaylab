# AirwayLab — Brand Vision & Mission Implementation

## Context

AirwayLab is live at airwaylab.app. Before launch posts on Reddit (r/SleepApnea, r/UARS, r/CPAP) and ApneaBoard, the product needs a clear mission that resonates with the PAP community. This community is:
- Skeptical of commercial products (ResMed locks down data, Philips had a recall scandal, SleepHQ monetised aggressively)
- Passionate about open data and self-advocacy
- Frustrated that clinicians often ignore everything beyond AHI
- Technically capable but exhausted from fighting for basic therapy access
- Sharing a deeply personal struggle — poor sleep affects every aspect of life

## Brand Vision

**AirwayLab exists because your breathing data belongs to you.**

PAP machines collect detailed breath-by-breath data — but most of it stays locked on an SD card, invisible to patients and ignored by clinicians who only check AHI. Millions of people are "treated" with AHI under 5 but still wake up exhausted because flow limitation, RERAs, and breathing pattern instability go undetected.

AirwayLab makes that data visible, understandable, and actionable. We believe:

1. **Your data is yours.** Every analysis runs in your browser. Nothing is uploaded, stored, or tracked. The code is open source — verify it yourself.

2. **Therapy understanding should be accessible to everyone.** Not just patients with technical skills, not just those who can afford specialist clinics, not just those lucky enough to have a data-literate clinician. Everyone on PAP therapy deserves to know if their treatment is actually working beyond a single number.

3. **Open source builds trust.** In a space where device manufacturers restrict data access and commercial tools monetise your health information, we chose transparency. AirwayLab is GPL-3.0 — the analysis engines, the algorithms, the dashboard — all of it is auditable.

4. **Sustainability enables impact.** We keep AirwayLab free because accessibility matters. Premium features like AI-powered insights exist to fund continued development — not to gate essential analysis. The free tier is complete and always will be. If you never pay a cent, you still get research-grade flow limitation analysis that doesn't exist anywhere else in a browser.

## Constraints

- Do NOT modify: `lib/parsers/`, `lib/analyzers/`, `workers/` logic
- Keep the dark-only clinical aesthetic
- Tone: warm but not saccharine. Direct, not corporate. Empathetic, not preachy. Think "fellow PAP user who happens to build software" not "health tech startup."
- No marketing buzzwords: avoid "revolutionary", "game-changing", "cutting-edge", "empower"
- DO use the language the community uses: "flow limitation", "RERAs", "AHI doesn't tell the whole story", "residual sleepiness", "therapy optimisation"
- Medical disclaimer must remain wherever health claims are made

---

## Task 1: Rewrite Landing Page Hero & Mission Section

**File:** `app/page.tsx`

### Hero section changes:
- Keep the current H1 ("Flow Limitation Analysis for ResMed PAP Data" or similar — it's good for SEO)
- Rewrite the subtitle/description paragraph to lead with the human problem, not the product features. Something like: "Your PAP device says your AHI is fine. But you still wake up exhausted. AirwayLab looks deeper — detecting flow limitation, RERAs, and breathing pattern instability that standard metrics miss. Free, open source, and 100% in your browser."
- Keep the "Upload Your SD Card" and "See Demo" CTAs

### Add a Mission section between the trust bar and engine showcase:
Create a new section with a heading like "Why we built this" or "What we believe". Include 3-4 short belief statements based on the vision above. Keep it concise — 2-3 sentences per belief, not paragraphs. Use the existing card/section styling patterns.

Key points to hit:
- Your data belongs to you (privacy-first, open source)
- AHI doesn't tell the whole story (the core problem AirwayLab solves)
- Therapy insight should be accessible to everyone (free tier is complete, not crippled)
- Premium funds development (transparent about why paid features exist)

### Tone reference:
Good: "Your machine collects thousands of data points every night. Most of it never gets looked at. We think that's wrong."
Bad: "AirwayLab empowers patients to take control of their health journey through revolutionary analytics."

---

## Task 2: Rewrite About Page Opening

**File:** `app/about/page.tsx`

The current about page opens with a functional description. Rewrite the opening section to lead with mission before methodology:

- First paragraph: Why AirwayLab exists (the problem — data is locked, clinicians ignore FL, patients suffer with "treated" sleep apnea)
- Second paragraph: What we believe (open data, accessible analysis, privacy-first)
- Third paragraph: How it works (then transition into the existing methodology content)

Keep the existing methodology sections, FAQ, privacy, contributing, and disclaimer sections. Only rewrite the opening.

---

## Task 3: Add "Our Approach" to About Page

**File:** `app/about/page.tsx`

After the opening section and before the methodology section, add an "Our Approach" section explaining the open-core model honestly:

**Free tier — complete analysis:**
"AirwayLab's core analysis — Glasgow Index, WAT, NED, oximetry, insights, exports — is free and always will be. We believe everyone on PAP therapy deserves access to research-grade analysis, regardless of their budget or technical skill."

**Open source — verifiable trust:**
"Every line of code is open source (GPL-3.0). In a space where you're asked to upload medical data to unknown servers, we think you should be able to verify exactly what happens with your data. Nothing leaves your browser. Ever."

**Premium features — sustaining development:**
"Building and maintaining a tool like this takes time. Premium features like AI-powered therapy insights help fund continued development. They're genuinely useful additions — not features we removed from the free tier to charge for. If you find AirwayLab valuable, premium is how you support its future."

Style this section cleanly — maybe 3 cards or a simple list. Match existing design patterns. Don't make it look like a pricing page.

---

## Task 4: Update Footer

**File:** `components/layout/footer.tsx`

Add a one-line mission statement near the existing brand section in the footer:
"Free, open-source airway analysis. Because your breathing data belongs to you."

Replace or supplement the current tagline if there is one.

---

## Task 5: Update Email Opt-In Copy

**File:** `components/common/email-opt-in.tsx`

The post-analysis email opt-in should reflect the mission:
- Current: likely something generic about premium features
- New: "We're building AI-powered therapy insights to help you understand your data even deeper. Sign up to get early access — and to support free, open-source sleep analysis."

The hero variant (if used on landing page):
- "Get updates on new analysis features and community insights. We'll never spam you or share your email."

Keep it honest, brief, and mission-aligned.

---

## Task 6: Update ProTease Copy

**File:** `components/common/pro-tease.tsx` or wherever ProTease is rendered

The premium feature tease should frame premium as supporting the project:
- Instead of pure feature selling, add context: "Premium features fund AirwayLab's continued development as a free, open-source tool."
- Keep the specific feature mention (AI insights)
- Add a subtle "learn more" or link to the about page "Our Approach" section

---

## Task 7: Update README Mission Section

**File:** `README.md`

Add a brief "Why" section near the top, after the feature list:

```
## Why AirwayLab exists

Your PAP machine collects detailed breath-by-breath data every night. Most of it goes unanalysed. Clinicians typically check AHI and move on, but AHI misses flow limitation, RERAs, and breathing pattern instability — the things that explain why you might still feel exhausted with an AHI under 5.

AirwayLab makes that data visible. It's free because we believe therapy insight should be accessible to everyone. It's open source because we believe you should be able to verify what happens with your medical data. It runs in your browser because your data is yours.
```

---

## Task 8: Update OG Description

**File:** `app/layout.tsx`

Update the OpenGraph and Twitter meta descriptions to reflect the mission:
- Current: likely feature-focused
- New: something like "Free, open-source PAP analysis that goes beyond AHI. Detect flow limitation, RERAs, and breathing patterns your machine misses. 100% in-browser — your data never leaves your device."

Keep it under 200 characters for OG description.

---

## Task 9: Update PDF Report Footer

**File:** `lib/pdf-report.ts`

The PDF report that users share with their doctors should include:
- Keep existing: "Generated by AirwayLab (airwaylab.app) · Open Source · GPL-3.0"
- Add: "Free, open-source airway analysis — airwaylab.app"
- Keep the medical disclaimer

---

## Task 10: Update Forum Export Attribution

**File:** `lib/forum-export.ts`

The forum post export (for Reddit/ApneaBoard) should have updated attribution:
- Current: likely "*Generated by [AirwayLab](https://airwaylab.app) — free, open-source PAP analysis*"
- Ensure it says something like: "*Generated by [AirwayLab](https://airwaylab.app) — free, open-source airway analysis. Your data never leaves your browser.*"

This is viral marketing — every forum post is a recommendation. The privacy message is the trust hook.

---

---

# GROWTH MECHANICS & VIRAL LOOPS

## Task 11: GitHub Star CTA Banner

**File:** `app/page.tsx` (landing page)

Add a GitHub banner/callout in the community section (near the existing GitHub link). This should feel native to the open-source community, not like begging for stars.

**Implementation:**
- Add a section or callout near the bottom of the landing page (before the final CTA) with:
  - GitHub icon + "Open Source on GitHub" heading
  - One line: "AirwayLab is GPL-3.0. Star the repo to follow development, report issues, or contribute."
  - A prominent "⭐ Star on GitHub" button linking to `https://github.com/airwaylab-app/airwaylab`
  - A secondary "View source code →" text link
- Style: use the existing card/border styling. Make the star button a real styled button (primary or outline variant), not just a text link. The star emoji in the button text is fine — the PAP community responds to direct, honest CTAs.

**Also update the header:**
- `components/layout/header.tsx` — Change the plain "GitHub" link to include a star icon or "⭐ Star" label on desktop (keep compact on mobile). Consider using a GitHub star count badge that auto-updates (see Task 12).

## Task 12: Dynamic GitHub Star Count

**File:** `components/common/github-stars.tsx` (new)

Create a small component that fetches and displays the live GitHub star count:
- Fetch from `https://api.github.com/repos/airwaylab-app/airwaylab` on mount (client-side)
- Display as a badge: "⭐ 42" or "42 stars"
- Cache in sessionStorage for 1 hour (don't hit GitHub API on every page load)
- Graceful fallback: if API fails, just show "⭐ Star" without a count
- Use this component in the header and the landing page GitHub section

**Note:** This only works once the repo is public and has at least 1 star. Before that, just show "⭐ Star on GitHub" without a count.

## Task 13: Share Results CTA (Post-Analysis)

**File:** `components/dashboard/overview-tab.tsx` or `app/analyze/page.tsx`

After analysis completes, add a subtle share prompt. The forum export already exists but it's buried in the export buttons. Make sharing more prominent:

**Add a "Share Your Results" card** after the insights panel on the overview tab:
- Heading: "Share with the community"
- Body: "Posting your AirwayLab results on ApneaBoard or Reddit helps others understand their data too."
- Two buttons:
  - "Copy for Reddit" → triggers the existing forum export (Markdown), copies to clipboard
  - "Copy for ApneaBoard" → same but note that Markdown works on both
- Below the buttons, small text: "Results are anonymised — only metrics are shared, never raw data."
- This card should only show when viewing real data (not demo mode)
- Dismissable (save to sessionStorage so it doesn't nag on every tab switch)

**Why this matters:** Every forum post with AirwayLab attribution is a trust-building ad. The existing export buries this behind a button group. Surfacing it as a card after analysis creates a natural "I just got my results, let me share" moment.

## Task 14: Doctor Sharing Prompt

**File:** `components/dashboard/overview-tab.tsx`

Add a "Share with your clinician" prompt near the export buttons or after the insights:
- Small card or inline text: "Taking these results to your sleep doctor? Export a PDF report they can review."
- Button: "Download PDF Report" → triggers existing PDF export
- Below: "The report includes key metrics, traffic-light indicators, and a medical disclaimer."
- Only show when viewing real data, not demo mode

**Why:** Every PDF printed says "Generated by AirwayLab (airwaylab.app)" — that's a referral to the clinician, who may recommend it to other patients.

## Task 15: "Powered by AirwayLab" Watermark in Charts

This is subtle but effective. When users screenshot their dashboard (which they will, for forum posts):

**File:** `components/charts/trend-chart.tsx`, `components/charts/glasgow-radar.tsx`, `components/charts/night-heatmap.tsx`

Add a very subtle watermark text at the bottom-right of each chart:
- Text: "airwaylab.app" in muted-foreground/30 opacity
- Font size: 9-10px
- Position: bottom-right corner of the chart container
- Must not interfere with data readability

**Why:** Users screenshot charts for forum posts and doctor visits. The watermark creates passive brand awareness without being obnoxious.

## Task 16: Onboarding Share Moment (Demo Mode)

**File:** `app/analyze/page.tsx` or the demo banner component

When a user finishes exploring demo mode and clicks "Upload Your Data" (or after spending 30+ seconds in demo), show a brief prompt:
- "Like what you see? Star us on GitHub to follow development."
- Small "⭐ Star on GitHub" button + "Maybe later" dismiss link
- Only show once per session (sessionStorage flag)
- Don't show this on real data analysis — only demo mode exit

**Why:** Demo mode users are high-intent but haven't committed yet. A GitHub star is a low-commitment action that keeps them connected. It's the open-source equivalent of "follow us on Twitter."

## Task 17: Landing Page Social Proof Section

**File:** `app/page.tsx`

Add a section that builds credibility through numbers and community signals. Place it between the engine showcase and the "How It Works" section:

- "Built for the community" or "Trusted by PAP users"
- Show 3-4 metrics (use dynamic components where possible, static fallbacks for launch):
  - "⭐ {n} GitHub stars" (from the github-stars component, Task 12)
  - "🔬 4 research-grade engines"
  - "🔒 100% client-side"
  - "📋 GPL-3.0 open source"
- Keep it compact — one row, icon + text per item
- Don't fake numbers. If stars are low at launch, that's fine. "Open source" and "client-side" are social proof enough for this audience.

**Later (don't implement now):** Add "Used by X clinicians" or "X nights analysed" counters once you have real data from Plausible/Supabase.

## Task 18: Forum Attribution Enhancement

**File:** `lib/forum-export.ts`

The forum export already has attribution but make it stickier:
- Current: `*Generated by [AirwayLab](https://airwaylab.app) — free, open-source PAP analysis*`
- Enhanced: `*Generated by [AirwayLab](https://airwaylab.app) — free, open-source airway analysis. Your data never leaves your browser. [⭐ Star on GitHub](https://github.com/airwaylab-app/airwaylab)*`

The GitHub link in forum posts creates a second click path for discovery.

## Task 19: Email Opt-In Value Proposition

**File:** `components/common/email-opt-in.tsx`

Strengthen the email opt-in by connecting it to the community mission:
- Hero variant: "Join {n}+ PAP users getting updates on new analysis features. We'll never spam you or share your email."
  - For launch, use "Join other PAP users" without a number. Add the count once you have subscribers.
- Post-analysis variant: "We're building AI-powered therapy insights. Sign up for early access — and help us keep AirwayLab free."
- Inline variant (controls bar): keep compact, just "Get updates" with email input

## Task 20: README Community Section Enhancement

**File:** `README.md`

Expand the community section to encourage contributions and stars:
```markdown
## Support AirwayLab

If AirwayLab helps you understand your therapy data:

- ⭐ **Star this repo** — it helps others discover the project
- 🐛 **Report bugs** — [open an issue](https://github.com/airwaylab-app/airwaylab/issues)
- 💬 **Share your results** — post on [r/SleepApnea](https://reddit.com/r/SleepApnea) or [ApneaBoard](https://apneaboard.com)
- 🔧 **Contribute** — PRs welcome, especially for device support
```

This gives people graduated commitment levels: star (5 seconds) → report (5 minutes) → share (10 minutes) → contribute (hours).

---

## Task 21: Build & Test

```
npm run lint && npm test && npm run build
```

Fix any errors. All must pass.

---

## Execution Order

**Brand & Mission (do first):**
1. Task 1 — Landing page hero + mission section
2. Task 2 — About page opening
3. Task 3 — About page "Our Approach" section
4. Task 4 — Footer tagline
5. Task 5 — Email opt-in copy
6. Task 6 — ProTease copy
7. Task 7 — README mission section
8. Task 8 — OG meta description
9. Task 9 — PDF report footer
10. Task 10 — Forum export attribution

**Growth Mechanics (do second):**
11. Task 11 — GitHub star CTA on landing page + header
12. Task 12 — Dynamic GitHub star count component
13. Task 13 — Share results CTA (post-analysis)
14. Task 14 — Doctor sharing prompt
15. Task 15 — Chart watermarks
16. Task 16 — Demo mode exit share moment
17. Task 17 — Social proof section on landing page
18. Task 18 — Forum attribution enhancement
19. Task 19 — Email opt-in value proposition
20. Task 20 — README community section

**Final:**
21. Task 21 — Build & test

## Quality Check

After all changes:
- Read the landing page top-to-bottom — does it tell a coherent story? Problem → belief → solution → social proof → try it?
- Does the about page flow naturally from mission → approach → methodology?
- Is the tone consistent? (warm, direct, community-native — not corporate or preachy)
- Is the premium positioning honest? (funds development, not gates essentials)
- Does every user-facing string avoid "revolutionary", "game-changing", "empower", "cutting-edge"?
- Medical disclaimer still present wherever needed?
- Zero mentions of "sleepscope" anywhere?

**Growth mechanics check:**
- Is the GitHub star CTA visible without scrolling on landing page? (it shouldn't be — it's not the primary CTA. But it should be easy to find.)
- Does the header show the GitHub star link on desktop?
- After demo mode, is there a natural prompt to star?
- After real analysis, is there a natural prompt to share on forums?
- Do chart screenshots contain the "airwaylab.app" watermark?
- Does the forum export include the GitHub star link?
- Is the README "Support" section present with graduated commitment options?
- Are all sharing prompts dismissable and non-annoying?
- Do sharing prompts ONLY appear on real data (not demo mode), except Task 16 (demo exit)?
