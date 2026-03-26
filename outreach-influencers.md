# PAP Therapy Influencer Outreach — March 2026

## Context

AirwayLab has been live since early March 2026. Growing community of users contributing data. Three paid tiers (Community free, Supporter $9/mo, Champion $25/mo). Four research-grade analysis engines running entirely in the browser. GPL-3.0 open source. Seeking partnerships, clinical feedback, and distribution from key voices in the PAP therapy space.

**Send all emails from:** dev@airwaylab.app (Demian)

---

## Priority Tier (send this week)

### 1. DaveSkvn — Glasgow Index Author

- **Platform:** GitHub (DaveSkvn/GlasgowIndex), fortaspen.com, Apnea Board forums
- **Why him:** Created the Glasgow Index algorithm that AirwayLab ported. Software developer, likely based in Scotland. Active CPAP user who built the tool to solve his own problem. Technically rigorous, self-deprecating about the tool ("a crude measure"). GPL-3.0 believer.
- **Email:** contact@FortAspen.com
- **Backup:** GitHub issue on GlasgowIndex repo, or DM on Apnea Board
- **Angle:** "I implemented your algorithm" -- credit, accuracy check, backlink ask. He's a developer, not an influencer. Lead with technical detail.

**Subject:** Your Glasgow Index algorithm is live in a browser tool

**Message:**

Hi Dave,

I'm Demian. I built AirwayLab, a free browser-based tool that runs four flow limitation analysis engines on ResMed SD card data. One of those engines is your Glasgow Index.

I ported the full 9-component scoring algorithm (skew, spike, flatTop, topHeavy, multiPeak, noPause, inspirRate, multiBreath, variableAmp) from your GPL-3.0 repo. The entire AirwayLab codebase is GPL-3.0 because of this, and you're credited in the source and on the site.

Everything runs in the browser. No data leaves the device. Users upload their SD card, get Glasgow scores alongside NED, WAT, and oximetry analysis, and can export results for forum posts or clinician visits.

We've been live for a few weeks now and the Glasgow Index is consistently the metric users reference most when discussing their results.

Two things I'd appreciate:

1. Your honest take on the implementation. I want to make sure the port is faithful to your methodology. You can try it at https://airwaylab.app with the demo data button (no upload needed).

2. If you're comfortable with it, a link from the Glasgow Index repo or fortaspen.com to AirwayLab as an implementation. Totally understand if not.

GitHub: https://github.com/airwaylab-app/airwaylab
The specific engine: lib/analyzers/glasgow-index.ts

Thanks for publishing the Glasgow Index as open source. It filled a gap nobody else was addressing.

Cheers,
Demian Voorhagen
Creator, AirwayLab
https://airwaylab.app

---

### 2. Jason Sazama (TheLankyLefty27) — AXG Sleep Diagnostics

- **Platform:** YouTube (84K subs), FreeCPAPAdvice Patreon (~142 members), AXG Sleep Diagnostics
- **Why him:** RPSGT, RST, CSE. Lead Polysomnographic Technologist at a California sleep center. Runs AXG offering $400 OSCAR data review consultations. Stanford A.P.P.L.E.S. project. Biggest influence on DIY CPAP community. Understands monetization (Patreon, Amazon affiliate, paid consultations).
- **Email:** support@axgsleepdiagnostics.com
- **Backup:** Contact form at axgsleepdiagnostics.com/contact-us/, or LinkedIn (linkedin.com/in/jason-sazama-abbbb510/)
- **Angle:** Complement to his paid consultations. AirwayLab gives patients automated first-pass analysis, driving better-prepared clients to his expert review. Never competitive.

**Subject:** Free FL scoring tool that could complement your OSCAR consultations

**Message:**

Hi Jason,

I'm Demian. I built AirwayLab, a free, open-source browser tool that runs four analysis engines on ResMed SD card data.

You review OSCAR data professionally, so this might interest you. AirwayLab automates things you currently eyeball: Glasgow Index breath shape scoring, NED-based flow limitation detection, automated RERA identification, and FFT periodicity analysis. Everything runs in the browser, nothing hits a server.

I don't see this as replacing what you do. The opposite, actually. Your clients could run AirwayLab before their Zoom consultation, so you spend less time on baseline scoring and more time on the clinical interpretation only you can provide. Better-prepared patients, more efficient sessions.

I'd genuinely value your professional take:
- Do the Glasgow Index scores align with what you see in OSCAR?
- Would it be useful for patients before or after their sessions with you?

Here's the tool: https://airwaylab.app (try the demo, no upload needed)
GitHub (GPL-3.0): https://github.com/airwaylab-app/airwaylab

Happy to set up a free Champion account for you to test everything.

Best,
Demian Voorhagen
Creator, AirwayLab
https://airwaylab.app

---

### 3. Emma Cooksey — Sleep Apnea Stories Podcast

- **Platform:** Podcast (Sleep Apnea Stories, 144+ episodes), Instagram (@sleepapneastories), Project Sleep (Sleep Apnea Program Manager)
- **Why her:** Leading patient advocate. Hosts clinicians, innovators, and patients. Strong institutional backing through Project Sleep (nonprofit). Originally from Scotland, based in Florida. Diagnosed at 30, CPAP user for 15+ years. Already interviewed Prof. Vik Veer (ep 144).
- **Email:** sleepapneastories@gmail.com
- **Backup:** LinkedIn (linkedin.com/in/emma-cooksey-sleep-apnea/), Instagram DM
- **Angle:** Podcast guest pitch + patient advocacy alignment. "AHI is fine but I feel terrible" maps directly to her mission.

**Subject:** Beyond AHI, open-source analysis tool + podcast guest pitch

**Message:**

Hi Emma,

I'm Demian. I built AirwayLab, a free tool that helps PAP users understand their therapy data beyond AHI.

I've been listening to Sleep Apnea Stories, and the pattern I keep hearing is people told "your AHI is fine" while still feeling terrible. That's exactly why this exists. AirwayLab looks at what AHI misses: flow limitation patterns, breath shape abnormalities, RERA events, and how these change over time.

Everything runs in the browser. No data ever leaves the device. It's GPL-3.0 open source. Users can generate a PDF report to bring to their clinician, or export their results in a format for ApneaBoard or Reddit.

Two asks:

1. Your feedback as a patient advocate: does this feel like something your listeners would find useful? Try it at https://airwaylab.app (demo button, no upload needed).

2. Podcast consideration: I'd love to share the story on your show. The angle: why the metric everyone relies on is incomplete, what flow limitation analysis reveals that AHI doesn't, and how open-source tools are putting data back in patients' hands.

Either way, thank you for what you do with Sleep Apnea Stories. The patient voice matters enormously.

Best,
Demian Voorhagen
Creator, AirwayLab
https://airwaylab.app

---

## Second Wave (send after priority tier)

### 4. Nick Dunn (Uncle Nicko) — CPAP Reviews / SleepHQ

- **Platform:** YouTube (173K subs), TikTok, Instagram (@cpapreviews)
- **Why him:** Creator of SleepHQ (100K+ users across 160 countries). Sleep technologist with biomedical science degree. 20 years in the space. Most influential independent CPAP voice online.
- **Email:** support@sleephq.com
- **Backup:** YouTube comment, Instagram DM
- **Angle:** SleepHQ and AirwayLab are complementary. SleepHQ does cloud-based reporting, AirwayLab does browser-based flow limitation scoring. He'll understand the Glasgow Index immediately.

**Subject:** AirwayLab, browser-based FL scoring tool, would love your take

**Message:**

Hi Nick,

I'm Demian. I built AirwayLab, a free, open-source web tool that runs four flow limitation analysis engines on ResMed SD card data, entirely in the browser.

Your work with CPAP Reviews and SleepHQ is exactly the kind of mission AirwayLab is built around. Making CPAP data accessible to the people who need it most.

The tool scores breath shapes using the Glasgow Index (9-component scoring), detects RERAs automatically, runs FFT-based periodicity analysis, and integrates oximetry. All processed locally, nothing uploaded.

I'd really value your feedback. You understand both the clinical side and what real CPAP users need better than almost anyone:
- Does the Glasgow Index scoring feel useful to the way you interpret flow limitation?
- Is there anything missing that SleepHQ users frequently ask about?
- Would you be open to a quick look and sharing your honest impressions?

I see AirwayLab as complementary to SleepHQ, not competing. SleepHQ handles cloud reporting and syncing beautifully. AirwayLab focuses on deep FL analysis with zero data leaving the browser.

Here's the tool: https://airwaylab.app
GitHub (GPL-3.0): https://github.com/airwaylab-app/airwaylab

Happy to jump on a call or answer any questions. No pressure at all.

Cheers,
Demian Voorhagen
Creator, AirwayLab
https://airwaylab.app

---

### 5. Dr. W. Chris Winter — Neurologist, Author, Sleep Unplugged Podcast

- **Platform:** YouTube, Sleep Unplugged podcast, author of "The Sleep Solution" and "The Rested Child"
- **Why him:** Board-certified neurologist, sleep specialist, massive media presence. Works with pro sports teams. Brings clinical credibility.
- **Email:** info@cnsmc.com
- **Angle:** Clinical validation. He bridges clinical sleep medicine and patient education. His perspective on whether the output is clinically meaningful matters.

**Subject:** AirwayLab, open-source PAP flow limitation analysis, clinical feedback welcome

**Message:**

Dr. Winter,

I'm Demian, creator of AirwayLab, a free, open-source web tool that runs four independent analysis engines on ResMed CPAP/BiPAP data: Glasgow Index breath shape scoring, flow limitation detection (NED), automated RERA identification, and oximetry analysis.

Everything processes locally in the browser. No data uploaded, no cloud, GPL-3.0.

I'm reaching out because your work bridging clinical sleep medicine and patient education is exactly the perspective I need. AirwayLab gives patients quantified metrics they can't get from myAir or even OSCAR, but I want to make sure what we surface is clinically meaningful and not anxiety-inducing.

I'd value your take on:
- Are metrics like Glasgow Index scores and automated RERA counts useful for patients to see, or potentially harmful without clinical context?
- How should a patient tool frame flow limitation data for productive clinician conversations?

Here's the tool: https://airwaylab.app

I know your time is extremely valuable. Even a brief reaction would help shape how we present clinical data responsibly.

Respectfully,
Demian Voorhagen
Creator, AirwayLab
https://airwaylab.app

---

### 6. Prof. Vik Veer — ENT Surgeon / YouTuber

- **Platform:** YouTube (Vik Veer - ENT Surgeon), Podcast (Vik Veer Talks), consultant-surgeon.co.uk
- **Why him:** Head of Sleep Surgery at Royal National ENT Hospital (London). Largest UK practice for surgical snoring/OSA treatment. Active YouTuber. UK-based = GDPR-relevant audience. Emma Cooksey interviewed him on ep 144.
- **Email:** secretary@consultant-surgeon.co.uk
- **Angle:** Surgical perspective on flow limitation data. His patients are often the ones where PAP alone isn't enough. FL analysis could inform surgical decisions.

**Subject:** AirwayLab, browser-based PAP flow limitation analysis, would value your clinical perspective

**Message:**

Prof. Veer,

I'm Demian, creator of AirwayLab, a free, open-source browser tool that quantifies flow limitation patterns from ResMed SD card data using four independent engines, including the Glasgow Index and automated RERA detection.

Your YouTube channel is one of the best resources for patients navigating sleep surgery decisions. I imagine many of your patients use CPAP, and understanding their flow limitation patterns could be relevant to evaluating surgical candidacy or post-surgical outcomes.

AirwayLab processes everything locally in the browser (nothing uploaded, important for UK/EU data protection).

I'd welcome your perspective:
- Would quantified FL data be useful in surgical planning or follow-up?
- Does the way we present metrics feel clinically responsible?
- Would you consider pointing patients to it as a self-tracking complement?

Here's the tool: https://airwaylab.app
GitHub (GPL-3.0): https://github.com/airwaylab-app/airwaylab

I appreciate your team's time and would be happy to provide any additional clinical or technical detail.

Kind regards,
Demian Voorhagen
Creator, AirwayLab
https://airwaylab.app

---

### 7. Dr. Christopher Allen (Sleep Dr. Chris) — YouTube / Aeroflow Sleep

- **Platform:** YouTube (Sleep Dr. Chris, 210K+ followers), Instagram (@sleepdrchris), sleepdrchris.com
- **Why him:** Double board-certified in sleep medicine and pediatric neurology. Personally diagnosed with sleep apnea. Partners with Aeroflow Sleep.
- **Email:** Contact form on sleepdrchris.com (Wix site, no direct email)
- **Backup:** Instagram DM @sleepdrchris, or via Aeroflow (meetthesalesteam@aeroflowinc.com)
- **Angle:** Sleep doctor who IS a patient. Understands both the clinical and experiential value.

**Subject:** AirwayLab, free FL analysis tool, from one sleep apnea patient-builder to a patient-doctor

**Message:**

Dr. Allen,

I'm Demian, creator of AirwayLab, a free, open-source web tool that scores flow limitation patterns from ResMed data using four engines (Glasgow Index, NED, WAT, oximetry analysis). Everything runs in the browser, nothing uploaded.

Your story of being diagnosed with sleep apnea as a physician really stood out to me. You understand both what the data means clinically AND what it feels like to be a patient wondering "is my therapy actually working?" That's exactly the gap AirwayLab is trying to close.

The tool detects things that AHI misses: flow limitation progression, RERA clusters, periodic breathing patterns. It presents them in a way patients can actually understand.

I'd value your dual perspective:
- As a clinician: are these the right metrics to surface for patients?
- As a patient: does the experience feel empowering?
- Would you consider trying it with your own data?

Here's the tool: https://airwaylab.app

No pressure at all. I just think you're uniquely positioned to evaluate this from both sides.

Best,
Demian Voorhagen
Creator, AirwayLab
https://airwaylab.app

---

### 8. Kristen Cascio — Me and My CPAP

- **Platform:** Instagram (@meandmycpap, 1.4K followers), TikTok, meandmycpap.com, podcast appearances
- **Why her:** Clinical social worker turned CPAP advocate. Does speaking, consulting, brand collaborations. Featured in SleepWorld Magazine. Focuses on the human/emotional side of therapy.
- **Email:** hello@meandmycpap.com
- **Angle:** Patient voice. Her feedback on UX and approachability matters more than technical validation.

**Subject:** Would love your feedback on AirwayLab, built for people like you

**Message:**

Hi Kristen,

I'm Demian, creator of AirwayLab, a free tool that helps PAP users understand their therapy data beyond just the AHI number.

I've been following your journey at Me and My CPAP, and your story of going 15 years before diagnosis really resonates with why I built this. So many people are "treated" but still exhausted, and the data that could help them understand why is locked away in formats only sleep techs can read.

AirwayLab lets you drop in your ResMed SD card data right in the browser. No install, no account, no data uploaded anywhere. It scores your breathing patterns, detects flow limitations, and shows trends over time.

I'd really value your perspective as someone who lives this experience:
- Is the tool approachable enough for someone who isn't technical?
- Does the way we present results feel empowering or overwhelming?
- Is there anything you wish a tool like this would show you?

Here's the tool: https://airwaylab.app

Your voice carries weight in this community. Honest feedback from a real CPAP user would help me make this better for everyone. No obligation at all.

Warm regards,
Demian Voorhagen
Creator, AirwayLab
https://airwaylab.app

---

### 9. Dylan Petkus, MD (ApneaReset)

- **Platform:** YouTube (50K+ subs), Instagram (@apneareset, 42K followers), TikTok, optimalcircadianhealth.com
- **Why him:** MD who reversed his own sleep apnea. Amazon bestselling author. Focuses on natural/lifestyle approaches.
- **Email:** Contact form on optimalcircadianhealth.com
- **Backup:** Instagram DM @apneareset, X @ApneaReset
- **Angle:** His audience tracks progress through lifestyle changes. AirwayLab provides objective FL measurement to see if changes are actually working.

**Subject:** AirwayLab, objective FL tracking for patients exploring therapy changes

**Message:**

Dr. Petkus,

I'm Demian, creator of AirwayLab, a free browser tool that quantifies flow limitation patterns from ResMed data using four analysis engines, all processed locally.

Your work with ApneaReset reaches people actively working to improve their sleep apnea through lifestyle and positional changes. One challenge they face: how do you objectively measure whether changes are working, beyond AHI?

AirwayLab tracks flow limitation scores, breath shape patterns (Glasgow Index), RERA frequency, and periodicity over time. Exactly the metrics that would change as someone's airway improves.

I'd be curious about your perspective:
- Would your audience benefit from objective FL tracking alongside their reset protocols?
- Are there specific metrics you'd want to see that we might be missing?
- Would you be open to exploring a collaboration where your community uses AirwayLab to track progress?

Here's the tool: https://airwaylab.app

I respect what you're doing making sleep apnea approachable. Would love to hear your take.

Best,
Demian Voorhagen
Creator, AirwayLab
https://airwaylab.app

---

### 10. Andrew (The CPAP Gentleman) — Ontario Sleep Care

- **Platform:** YouTube (The CPAP Gentleman), Ontario Sleep Care
- **Why him:** Registered Respiratory Therapist. Creates educational CPAP videos. Close to clinical workflow.
- **Email:** Contact form at ontariosleepcare.ca/contact-us/
- **Backup:** Phone 1-844-823-0685 and ask to forward a message
- **Angle:** He educates patients on PAP fundamentals. AirwayLab could be a tool he recommends for patients who want to go deeper.

**Subject:** AirwayLab, free flow limitation scoring tool, would love your RT perspective

**Message:**

Hi Andrew,

I'm Demian, creator of AirwayLab, a free, open-source web tool that scores flow limitation patterns from ResMed SD card data using four independent engines.

I've watched a lot of your CPAP Gentleman videos. Your ability to explain complex PAP concepts clearly is exactly the kind of lens I need on AirwayLab. As an RT, you see the gap between what machines report and what patients actually experience.

The tool runs Glasgow Index scoring, automated RERA detection, periodicity analysis, and oximetry. Entirely in the browser, no data uploaded.

I'd really appreciate your professional feedback:
- Does the scoring align with what you'd expect from reviewing the raw data?
- Would you feel comfortable recommending this to patients who want to understand their therapy better?
- Is there anything you'd add from an RT's perspective?

Here's the tool: https://airwaylab.app

Even a quick look would be incredibly helpful. No strings attached.

Best regards,
Demian Voorhagen
Creator, AirwayLab
https://airwaylab.app

---

### 11. Mollie Eastman — Sleep Is A Skill

- **Platform:** Podcast (Sleep Is A Skill), Instagram (@mollie.eastman, 22K+ followers), sleepisaskill.com
- **Why her:** Sleep optimization coach with a CPAP workbook for patients. Bridges clinical sleep medicine and behavioral change. Works with wearable data.
- **Email:** team@sleepisaskill.com
- **Angle:** Her audience is data-driven. AirwayLab fits the "quantified sleep" approach she teaches. FL score tracking alongside behavioral changes.

**Subject:** AirwayLab, turning PAP data into actionable sleep insights

**Message:**

Hi Mollie,

I'm Demian, creator of AirwayLab, a free, open-source browser tool that analyses ResMed CPAP/BiPAP data with four scoring engines for flow limitation, breath shape, RERA events, and oximetry patterns.

Your CPAP workbook and Sleep Is A Skill framework are exactly the kind of practical, data-driven approach I built AirwayLab for. Your audience doesn't just want to wear the mask. They want to understand what's actually happening and optimize their therapy.

Everything processes in the browser (privacy-first, nothing uploaded), and the tool tracks FL scores and breath patterns over time. Exactly the kind of metric your clients would want to see improve alongside behavioral changes.

I'd love your take:
- Does AirwayLab fit into the "sleep skills" framework you teach?
- Would it be useful for clients tracking CPAP optimization alongside your program?
- Is there anything you'd want to see added from a coaching perspective?

Here's the tool: https://airwaylab.app

I think there's a natural fit between what you teach and what AirwayLab measures. Would love to explore how we could work together.

Best,
Demian Voorhagen
Creator, AirwayLab
https://airwaylab.app

---

## Respiratory Therapist Forum Template (Week 7+ only)

**When to use:** Only after 3-4 weeks of genuine helpful posting on ApneaBoard. Target RTs who actively post FL/RERA advice. Never send as a cold blast.

**Via:** ApneaBoard forum DM

**Message:**

Hi [Name],

I've seen your posts helping people interpret their flow data on here and wanted to share something you might find useful for patients.

I built a free tool called AirwayLab that runs Glasgow Index scoring, automated RERA detection, and flow limitation analysis on ResMed SD card data. Everything runs in the browser, nothing gets uploaded anywhere. GPL-3.0 open source.

A few people on the forum have tried it and found the automated scoring useful as a starting point before discussing results with their clinician.

Would be curious if you'd find it useful for patients who want to understand their data between appointments. No obligation at all.

https://airwaylab.app

Demian

---

## Contact Summary

| # | Name | Email / Method | Confidence | Priority |
|---|------|---------------|------------|----------|
| 1 | DaveSkvn (Glasgow Index) | contact@FortAspen.com | High (listed on site) | **This week** |
| 2 | Jason Sazama (Lanky Lefty) | support@axgsleepdiagnostics.com | High (listed on site) | **This week** |
| 3 | Emma Cooksey | sleepapneastories@gmail.com | High (listed publicly) | **This week** |
| 4 | Nick Dunn (Uncle Nicko) | support@sleephq.com | Medium (support inbox) | Second wave |
| 5 | Dr. Chris Winter | info@cnsmc.com | High (listed on site) | Second wave |
| 6 | Prof. Vik Veer | secretary@consultant-surgeon.co.uk | High (listed on site) | Second wave |
| 7 | Dr. Christopher Allen | sleepdrchris.com contact form | Low (no email) | Second wave |
| 8 | Kristen Cascio | hello@meandmycpap.com | High (listed on site) | Second wave |
| 9 | Dylan Petkus | optimalcircadianhealth.com form | Low (no email) | Second wave |
| 10 | Andrew (CPAP Gentleman) | ontariosleepcare.ca form | Low (no email) | Second wave |
| 11 | Mollie Eastman | team@sleepisaskill.com | High (listed on site) | Second wave |

### Contact methods for leads without email:
- **Dr. Allen (#7):** Instagram DM @sleepdrchris, or via Aeroflow (meetthesalesteam@aeroflowinc.com)
- **Dylan Petkus (#9):** Instagram DM @apneareset, X @ApneaReset
- **Andrew (#10):** Phone Ontario Sleep Care at 1-844-823-0685
