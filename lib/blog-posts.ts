export interface FAQItem {
  question: string;
  answer: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  seoTitle?: string; // keyword-optimised title tag, separate from h1 display title
  description: string;
  date: string; // ISO date
  readTime: string;
  tags: string[];
  ogDescription: string;
  faqItems?: FAQItem[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: 'ahi-vs-rdi-sleep-apnea',
    title: 'AHI vs RDI: What Sleep Apnea Metrics Actually Tell You',
    seoTitle: 'AHI vs RDI Sleep Apnea: Understanding the Difference | AirwayLab',
    description:
      'Your sleep study shows RDI. Your CPAP shows AHI. They measure different things. Learn what each metric counts, why the numbers differ, and how to read both.',
    date: '2026-05-29',
    readTime: '7 min read',
    tags: ['AHI', 'RDI', 'Sleep Apnea', 'RERA', 'Metrics'],
    ogDescription:
      'Your sleep study shows RDI. Your CPAP shows AHI. They measure different things. Learn what each metric counts, why the numbers differ, and how to read both.',
    faqItems: [
      {
        question: 'What is the difference between AHI and RDI in sleep apnea?',
        answer:
          'AHI (Apnea-Hypopnea Index) counts apneas and hypopneas per hour. RDI (Respiratory Disturbance Index) includes those plus additional RERA-type events. RDI is always equal to or higher than AHI. The difference reflects the count of RERA-type events included in RDI but not in AHI.',
      },
      {
        question: 'Why does my CPAP show a lower number than my sleep study?',
        answer:
          'Your sleep study reports RDI, which includes RERA-type events. Your CPAP only reports AHI — it has no EEG data to detect arousals, so it cannot count RERAs. The two numbers are measuring different things, so a lower CPAP AHI is expected when compared to a sleep study RDI.',
      },
      {
        question: 'Can AirwayLab show RDI?',
        answer:
          'AirwayLab does not compute a clinical RDI — that requires EEG data that home CPAP devices do not record. AirwayLab\'s NED engine estimates RERA-type patterns per hour, which reflects similar airway behaviour. These estimates are not equivalent to a clinical RERA count and should be discussed with your clinician.',
      },
      {
        question: 'Is RDI or AHI more accurate?',
        answer:
          'Neither is more accurate — they measure different things. AHI measures events your CPAP can detect from its flow sensor. RDI from a sleep study includes additional events scored by a technician with EEG data. Your clinician can help interpret both in the context of your symptoms and therapy.',
      },
    ],
  },
  {
    slug: 'how-to-analyze-cpap-data-at-home',
    title: 'How to Analyze Your CPAP Data at Home',
    seoTitle: 'How to Analyze Your CPAP Data at Home | AirwayLab',
    description:
      'Learn how to analyze your CPAP data at home — explore AHI trends, leaks, and flow limitations with free, private, browser-based tools. No uploads, no accounts.',
    date: '2026-04-23',
    readTime: '7 min read',
    tags: ['CPAP', 'Getting Started', 'AHI', 'Flow Limitation', 'Privacy'],
    ogDescription:
      'Learn how to analyze your CPAP data at home — explore AHI trends, leaks, and flow limitations with free, private, browser-based tools. No uploads, no accounts.',
    faqItems: [
      {
        question: 'Is exploring my own CPAP data safe?',
        answer:
          'Exploring your therapy data is informational — it is not a substitute for clinical review. Use what you find to prepare better questions for your care team, not to make independent therapy decisions.',
      },
      {
        question: 'Do I need a specific CPAP device to use AirwayLab?',
        answer:
          'AirwayLab supports data from most common CPAP and BiPAP devices that record detailed data to SD card, including ResMed and some Philips models. Check the supported devices page for the current list.',
      },
      {
        question: 'Does my data get uploaded anywhere?',
        answer:
          'No. AirwayLab processes your data entirely in your browser. Nothing is transmitted, stored, or shared. Your data stays on your device.',
      },
      {
        question: "What's the difference between AHI and RERA index?",
        answer:
          'AHI counts apneas and hypopneas per hour. The RERA index counts respiratory effort-related arousals separately. Some devices score these differently, and your clinician may consider both when evaluating therapy patterns.',
      },
      {
        question: "I'm already using OSCAR — why would I also use AirwayLab?",
        answer:
          "OSCAR is excellent and AirwayLab is not trying to replace it. Some users find AirwayLab's interface easier to start with, or use it alongside OSCAR for a different view of the same data. Both are free, both are open-source.",
      },
      {
        question: 'Should I change my settings based on what I find?',
        answer:
          'Pressure settings are managed by your healthcare provider based on your clinical needs. Your clinician can interpret these patterns in clinical context.',
      },
    ],
  },
  {
    slug: 'how-to-read-oscar-cpap-charts',
    title: 'How to Read OSCAR CPAP Charts (A Plain-English Guide)',
    seoTitle: 'How to Read OSCAR CPAP Charts (A Plain-English Guide) | AirwayLab',
    description:
      'Learn how to read OSCAR CPAP charts — AHI events, flow rate, pressure, and leaks — explained in plain English for PAP therapy users.',
    date: '2026-04-27',
    readTime: '8 min read',
    tags: ['OSCAR', 'CPAP', 'Getting Started', 'Flow Limitation', 'AHI'],
    ogDescription:
      'Learn how to read OSCAR CPAP charts — AHI events, flow rate, pressure, and leaks — explained in plain English for PAP therapy users.',
    faqItems: [
      {
        question: 'What does AHI mean in OSCAR?',
        answer:
          'AHI stands for Apnea-Hypopnea Index — the number of apneas and hypopneas per hour of recorded therapy time. OSCAR calculates it from the event log your machine stores on its SD card.',
      },
      {
        question: 'What is a normal AHI in OSCAR?',
        answer:
          'AHI thresholds are defined clinically and should be interpreted by a qualified clinician in the context of your specific prescription and symptoms. Discussing your nightly numbers with your sleep team gives you the most meaningful guidance.',
      },
      {
        question: 'What do flow limitations mean in OSCAR?',
        answer:
          "Flow limitations appear as a flattening of the inhalation curve in OSCAR's flow rate panel. They reflect a flattened inhalation waveform that the machine records as flow limitation. High flow limitation counts can be worth discussing with your clinician, particularly if you're on APAP therapy.",
      },
      {
        question: 'Is OSCAR better than the ResMed or Philips app?',
        answer:
          'OSCAR accesses the detailed data log stored on your SD card, while manufacturer apps typically show a simplified nightly summary. They serve different purposes — the manufacturer app is convenient for a quick overview; OSCAR (and AirwayLab) are for deeper exploration of your therapy data.',
      },
      {
        question: 'Can I use AirwayLab instead of OSCAR?',
        answer:
          'AirwayLab reads the same SD card files as OSCAR and shows your data in a browser without requiring a desktop app. The two tools are complementary — many users use both depending on the task.',
      },
    ],
  },
  {
    slug: 'cpap-leak-rate-explained',
    title: 'Understanding CPAP Mask Leak Rate: What the Numbers Mean',
    seoTitle: 'Understanding CPAP Mask Leak Rate | AirwayLab',
    description:
      'Learn what CPAP mask leak rate means, how it\'s measured, and what the data shows. Explore your leak data free in your browser with AirwayLab.',
    date: '2026-04-19',
    readTime: '8 min read',
    tags: ['CPAP', 'Leak Rate', 'ResMed', 'Getting Started'],
    ogDescription:
      'Learn what CPAP mask leak rate means, how it\'s measured, and what the data shows. Explore your leak data free in your browser with AirwayLab.',
    faqItems: [
      {
        question: 'What is a good CPAP mask leak rate?',
        answer:
          "ResMed's published documentation references 24 L/min as a threshold for unintentional leak, but what's appropriate varies by machine model, mask type, and therapy mode. Your clinician can help you interpret what your specific numbers mean.",
      },
      {
        question: 'What is the difference between large leak and unintentional leak on CPAP?',
        answer:
          'These terms are used differently by different manufacturers. ResMed reports a continuous unintentional leak figure (in L/min) that subtracts the expected intentional vent flow. Philips DreamStation devices report "large leak" as a binary flag when leak is high enough to affect therapy delivery for a sustained period.',
      },
      {
        question: 'Does a high leak rate affect my AHI reading?',
        answer:
          'Yes. Significant unintentional leak distorts the flow signal your machine uses to detect breathing events. On high-leak nights, AHI figures may be less reliable — either underreporting events missed in the noise, or over-counting artefacts flagged as events.',
      },
      {
        question: 'How do I check my CPAP leak rate without software?',
        answer:
          'ResMed myAir displays a mask seal rating derived from leak data. For the raw L/min figures, you need SD card analysis software: OSCAR (free, local) or AirwayLab (free, browser-based). Both read the same underlying data.',
      },
      {
        question: 'What does it mean when my CPAP reports a leak rate of 0?',
        answer:
          'A reported unintentional leak of 0 L/min means the device detected no leak above the expected vent flow. This is normal for a well-fitting mask on a given night. If you see 0 L/min consistently across all nights, double-check that your device is reporting unintentional leak rather than a different column.',
      },
      {
        question: 'Can I see my CPAP leak rate data for free?',
        answer:
          'Yes. AirwayLab reads your ResMed SD card data in your browser — no account required, no upload to any server. Your data never leaves your device. The analysis is free and always will be.',
      },
    ],
  },
  {
    slug: 'what-are-reras-sleep-apnea',
    title: 'What Are RERAs? Understanding Sleep Apnea Data Beyond AHI',
    seoTitle: 'What Are RERAs? Understanding Sleep Apnea Data Beyond AHI',
    description:
      'RERAs (Respiratory Effort-Related Arousals) are events your AHI score doesn\'t count. Learn what they are, how they appear in CPAP flow data, and how to spot them in AirwayLab.',
    date: '2026-05-04',
    readTime: '8 min read',
    tags: ['RERA', 'Flow Limitation', 'AHI', 'CPAP', 'UARS'],
    ogDescription:
      'RERAs (Respiratory Effort-Related Arousals) are events your AHI score doesn\'t count. Learn what they are, how they appear in CPAP flow data, and how to spot them in AirwayLab.',
    faqItems: [
      {
        question: 'What does RERA stand for in sleep apnea?',
        answer:
          'RERA stands for Respiratory Effort-Related Arousal — a breathing disruption that causes an arousal from sleep without meeting the criteria for an apnea or hypopnea.',
      },
      {
        question: "Why doesn't my CPAP machine report RERAs?",
        answer:
          'Most CPAP machines report AHI, which counts apneas and hypopneas only. RERAs require detailed flow waveform analysis and are not scored by standard consumer PAP devices.',
      },
      {
        question: 'What is the difference between AHI and RDI?',
        answer:
          'AHI (Apnea-Hypopnea Index) counts apneas and hypopneas per hour. RDI (Respiratory Disturbance Index) includes RERAs as well, giving a broader picture of sleep-disordered breathing events.',
      },
      {
        question: 'Can I see RERAs in CPAP data?',
        answer:
          'You cannot see labelled RERAs in your CPAP summary data, but you can see the flow limitation patterns associated with them in the raw SD card data. Tools like AirwayLab and OSCAR give you access to this waveform data.',
      },
      {
        question: 'Can AirwayLab detect RERAs automatically?',
        answer:
          'AirwayLab shows you the flow limitation channel and raw waveform where RERA-type patterns appear. It does not automatically label events as RERAs, as that scoring requires clinical interpretation.',
      },
      {
        question: 'Should I worry if I see flow limitation in AirwayLab?',
        answer:
          'Flow limitation is informational data — what it means for your specific situation is a clinical question. If you notice patterns that concern you, bring the timestamps to your clinician for context.',
      },
    ],
  },
  {
    slug: 'cpap-compliance-tracking',
    title: 'CPAP Compliance Tracking: Your Questions Answered',
    seoTitle: 'CPAP Compliance Tracking: Your Questions Answered | AirwayLab',
    description:
      'What is CPAP compliance, how is it tracked, and what does a compliance score mean? Clear answers for PAP users navigating insurance and therapy requirements.',
    date: '2026-04-20',
    readTime: '6 min read',
    tags: ['CPAP', 'Compliance', 'Insurance', 'Getting Started'],
    ogDescription:
      'What is CPAP compliance, how is it tracked, and what does a compliance score mean? Clear answers for PAP users navigating insurance and therapy requirements.',
    faqItems: [
      {
        question: 'What is CPAP compliance?',
        answer:
          'CPAP compliance is a measure of how consistently you use your therapy device. It records how many hours you run your machine each night, and is used by insurers and clinicians to confirm the device is being used enough for therapy to be meaningful.',
      },
      {
        question: 'What are the standard CPAP compliance requirements?',
        answer:
          'The most commonly cited US benchmark is 4 hours per night for at least 70% of nights over a 30-day period, based on CMS guidelines. Requirements vary by insurer and country — check your specific policy for the thresholds that apply to you.',
      },
      {
        question: 'How is CPAP compliance tracked?',
        answer:
          'Your machine logs usage data automatically. It can be read via the machine display, SD card software like AirwayLab or OSCAR, or transmitted wirelessly to manufacturer cloud portals (e.g. myAir, DreamMapper) used by your provider or DME supplier.',
      },
      {
        question: 'Can I see my own CPAP compliance data?',
        answer:
          'Yes. Your usage data belongs to you. You can view it on your machine display, via OSCAR (free desktop software), or via AirwayLab — a browser-based tool that reads your SD card locally with no uploads. Note: AirwayLab does not report to insurers or providers.',
      },
      {
        question: 'What is a sleep apnea compliance score?',
        answer:
          'A compliance score is the percentage of nights in a reporting window that met the minimum usage threshold, commonly 4 or more hours. For example, using the device 4+ hours on 22 of 30 nights equals a 73% compliance score. The exact calculation varies by platform.',
      },
      {
        question: 'What if I am not meeting my CPAP compliance target?',
        answer:
          'Discuss this with your prescribing clinician. Common factors the PAP community discusses include mask fit and comfort, pressure settings, aerophagia, and anxiety with the mask. Tools like AirwayLab can show your session data alongside mask leak and other metrics, which may be useful context for your clinician.',
      },
    ],
  },
  {
    slug: 'bipap-vs-cpap-data',
    title: 'BiPAP vs CPAP: Understanding Your Therapy Data',
    seoTitle: 'BiPAP vs CPAP Data: What IPAP, EPAP, and Pressure Support Show | AirwayLab',
    description:
      'BiPAP data looks different from CPAP — here\'s what IPAP, EPAP, pressure support, and tidal volume actually show when you open your therapy files.',
    date: '2026-04-19',
    readTime: '8 min read',
    tags: ['BiPAP', 'CPAP', 'Pressure Support', 'Getting Started', 'Flow Limitation'],
    ogDescription:
      'BiPAP data looks different from CPAP — here\'s what IPAP, EPAP, pressure support, and tidal volume actually show when you open your therapy files.',
    faqItems: [
      {
        question: 'Can AirwayLab read BiPAP data the same as CPAP data?',
        answer:
          'Yes. AirwayLab reads the same SD card format OSCAR uses and supports ResMed AirCurve and compatible BiPAP devices.',
      },
      {
        question: 'What is pressure support in BiPAP data?',
        answer:
          'Pressure support is the difference between IPAP and EPAP — the extra pressure applied to assist each inhale.',
      },
      {
        question: 'Does tidal volume appear in all BiPAP data?',
        answer:
          'It depends on the device. ResMed AirCurve devices log tidal volume in SD card data; some other BiPAP machines do not export it.',
      },
      {
        question: 'What does a shifting IPAP trace mean in auto BiPAP mode?',
        answer:
          "It means the machine adjusted the inspiratory pressure during the night — typically in response to detected breathing changes. This is information to discuss with your clinician, not a cause for alarm on its own.",
      },
    ],
  },
  {
    slug: 'how-to-export-understand-cpap-data',
    title: 'How to Export and Understand Your CPAP Data',
    seoTitle: 'How to Export and Understand Your CPAP Data | AirwayLab',
    description:
      'Learn how to export CPAP data from ResMed, Philips, and Fisher & Paykel machines, what the numbers mean, and how tools like AirwayLab help you see the full picture.',
    date: '2026-04-15',
    readTime: '7 min read',
    tags: ['CPAP', 'Getting Started', 'Data Export', 'AHI', 'ResMed'],
    ogDescription:
      'Learn how to export CPAP data from ResMed, Philips, and Fisher & Paykel machines, what the numbers mean, and how tools like AirwayLab help you see the full picture.',
    faqItems: [
      {
        question: 'How do I get data off my CPAP machine?',
        answer:
          'Most machines use a standard SD card. Power off, remove the card, and insert it into your computer. Tools like OSCAR and AirwayLab can then read the data files directly.',
      },
      {
        question: 'What is the difference between AHI and flow limitation?',
        answer:
          'AHI counts discrete breathing events (apnoeas and hypopnoeas) per hour. Flow limitation measures partial airway narrowing that may not meet the threshold for a scored event. Both are visible in full flow data from your SD card.',
      },
      {
        question: 'Can I analyse my CPAP data without installing software?',
        answer:
          'Yes. AirwayLab runs entirely in your browser — no download or install needed. Open the upload page, drag in your SD card files, and your data loads immediately.',
      },
      {
        question: 'Does my CPAP data leave my device when using AirwayLab?',
        answer:
          'No. AirwayLab processes all data locally in your browser. Nothing is uploaded to a server. Optional features like AI insights require explicit consent before any data is sent.',
      },
      {
        question: 'Which CPAP machines does AirwayLab support?',
        answer:
          'AirwayLab currently supports ResMed AirSense 10, AirSense 11, and AirCurve devices via SD card. Support for additional manufacturers is planned.',
      },
    ],
  },
  {
    slug: 'how-to-export-and-understand-your-cpap-data',
    title: 'How to Export and Understand Your CPAP Data',
    seoTitle: 'How to Export and Understand Your CPAP Data',
    description:
      'Learn how to export CPAP data from ResMed, Philips, and Fisher & Paykel machines, what the numbers mean, and how tools like AirwayLab help you see the full picture.',
    date: '2026-04-15',
    readTime: '8 min read',
    tags: ['CPAP', 'Getting Started', 'ResMed', 'SD Card', 'Flow Limitation', 'AHI'],
    ogDescription:
      'Learn how to export CPAP data from ResMed, Philips, and Fisher & Paykel machines, what the numbers mean, and how tools like AirwayLab help you see the full picture.',
    faqItems: [
      {
        question: 'How do I get data off my CPAP machine?',
        answer:
          'Most machines use a standard SD card. Power off, remove the card, and insert it into your computer. Tools like OSCAR and AirwayLab can then read the data files directly.',
      },
      {
        question: 'How do I export data from my ResMed CPAP machine?',
        answer:
          'Power off your ResMed machine, remove the SD card from the side panel (AirSense 10/11) or under the humidifier chamber (S9), insert it into a card reader, and open the EDF files in an analysis tool like OSCAR or AirwayLab. No account or cloud service is required.',
      },
      {
        question: 'What is the difference between AHI and flow limitation?',
        answer:
          'AHI counts discrete breathing events (apnoeas and hypopnoeas) per hour. Flow limitation measures partial airway narrowing that may not meet the threshold for a scored event. Both are visible in full flow data from your SD card.',
      },
      {
        question: 'Can I analyse my CPAP data without installing software?',
        answer:
          'Yes. AirwayLab runs entirely in your browser — no download or install needed. Open the upload page, drag in your SD card files, and your data loads immediately.',
      },
      {
        question: 'Does my CPAP data leave my device when using AirwayLab?',
        answer:
          'No. AirwayLab processes all data locally in your browser. Nothing is uploaded to a server. Optional features like AI insights require explicit consent before any data is sent.',
      },
      {
        question: 'Which CPAP machines does AirwayLab support?',
        answer:
          'AirwayLab currently supports ResMed AirSense 10, AirSense 11, and AirCurve devices via SD card. Support for additional manufacturers is planned.',
      },
    ],
  },
  {
    slug: 'understanding-cpap-data',
    title: 'Understanding Your CPAP Data: A Plain-Language Guide to AHI, Leaks, and Flow Limitations',
    seoTitle: 'Understanding Your CPAP Data: AHI, Leaks, and Flow Limitations Explained',
    description:
      "New to CPAP data analysis? Learn what AHI, leak rates, flow limitations, and RERAs actually mean — and how AirwayLab helps you see your therapy clearly.",
    date: '2026-04-18',
    readTime: '6 min read',
    tags: ['CPAP', 'AHI', 'Flow Limitation', 'Getting Started', 'Leak Rate'],
    ogDescription:
      "New to CPAP data analysis? Learn what AHI, leak rates, flow limitations, and RERAs actually mean — and how AirwayLab helps you see your therapy clearly.",
    faqItems: [
      {
        question: 'What is AHI on a CPAP report?',
        answer:
          'AHI (Apnea-Hypopnea Index) is the average number of breathing pauses per hour during sleep. Your clinician can help you understand what your AHI means in context. This tool is informational only.',
      },
      {
        question: 'What do flow limitations mean on my CPAP data?',
        answer:
          'Flow limitations indicate partial airway restriction that may not appear in your AHI count. Your clinician can help you understand what frequent flow limitation patterns mean for your situation. This tool is informational only.',
      },
      {
        question: 'What is a RERA in CPAP data?',
        answer:
          "A Respiratory Effort Related Arousal is a brief sleep disruption from increased breathing effort that doesn't meet the full criteria for a hypopnea.",
      },
      {
        question: 'How do I read my CPAP data?',
        answer:
          'Tools like OSCAR and AirwayLab can help you visualise your SD card data. AirwayLab runs in your browser with no upload required.',
      },
      {
        question: 'What causes high leak rate on CPAP?',
        answer:
          'Common causes include mask fit issues, mouth breathing, or positional factors. Your care team can help you understand what your leak rate data means. This tool is informational only.',
      },
      {
        question: 'Is AirwayLab free?',
        answer:
          'Yes. AirwayLab is free and always will be. Premium features support ongoing development but the core analysis is always available at no cost.',
      },
    ],
  },
  {
    slug: 'understanding-cpap-pressure-settings',
    title: 'Understanding Your CPAP Pressure Settings: What the Numbers Actually Mean',
    seoTitle: 'Understanding Your CPAP Pressure Settings',
    description:
      'Learn what CPAP pressure settings mean, the difference between fixed and auto pressure, and how to read your pressure data — without clinical jargon.',
    date: '2026-04-13',
    readTime: '7 min read',
    tags: ['CPAP', 'Pressure Settings', 'APAP', 'BiPAP', 'Getting Started'],
    ogDescription:
      'Learn what CPAP pressure settings mean, the difference between fixed and auto pressure, and how to read your pressure data — without clinical jargon.',
    faqItems: [
      {
        question: 'What does cmH2O mean on a CPAP machine?',
        answer:
          'cmH2O stands for centimetres of water, a unit of pressure. A CPAP setting of 10 cmH2O means the machine pushes air at a pressure equivalent to the weight of a 10-centimetre column of water. Most prescribed pressures fall between 4 and 20 cmH2O.',
      },
      {
        question: 'What is the difference between CPAP and APAP?',
        answer:
          'CPAP delivers one fixed pressure all night. APAP (Auto-adjusting Positive Airway Pressure) monitors your breathing and adjusts pressure within a set range — backing off when breathing is stable and increasing when it detects flow limitation or events.',
      },
      {
        question: 'What is pressure support on a BiPAP machine?',
        answer:
          'Pressure support is the difference between IPAP (inspiratory pressure) and EPAP (expiratory pressure) on a bilevel device. A wider pressure support means the machine provides more assistance during each inhale.',
      },
      {
        question: 'What does the 95th percentile pressure mean on my CPAP?',
        answer:
          'The 95th percentile pressure is the level at or below which your APAP machine spent 95% of the night. If this number is near your maximum pressure setting, your machine may be constrained and spending significant time at its upper limit.',
      },
    ],
  },
  {
    slug: 'resmed-sd-card-browser-analysis',
    title: 'How to Read Your ResMed SD Card Data in Your Browser — No Download Needed',
    seoTitle: 'How to Read Your ResMed SD Card Data in Your Browser — No Download Needed',
    description:
      'Your ResMed SD card holds detailed EDF files with your full breathing waveform. Open them directly in your browser with AirwayLab — no software to install, no data uploaded.',
    date: '2026-04-09',
    readTime: '5 min read',
    tags: ['ResMed', 'SD Card', 'EDF', 'Getting Started', 'CPAP'],
    ogDescription:
      'Read your ResMed SD card EDF files directly in your browser with AirwayLab. No download, no cloud upload. See your AHI, flow limitation, and RERA data instantly.',
    faqItems: [
      {
        question: 'Can I read my ResMed SD card data without installing software?',
        answer:
          'Yes. AirwayLab runs entirely in your browser. Drag your SD card files into the drop zone and your sessions load instantly — no software installation required.',
      },
      {
        question: 'What EDF files does my ResMed machine record?',
        answer:
          'ResMed AirSense 10 and AirSense 11 machines record detailed EDF files in the DATALOG/ folder on your SD card, organised by year and month. These files contain your full flow waveform, pressure data, and respiratory events.',
      },
      {
        question: 'Is my data uploaded when I use AirwayLab?',
        answer:
          'No. AirwayLab processes all EDF files locally in your browser using Web Workers. Your breathing data never leaves your device.',
      },
    ],
  },
  {
    slug: 'low-ahi-still-tired-flow-limitation-reras',
    title: 'Low AHI But Still Tired? What Flow Limitation and RERAs Reveal',
    seoTitle: 'Low AHI But Still Tired? What Flow Limitation and RERAs Reveal',
    description:
      'Your AHI looks great but you still feel exhausted. Learn why flow limitation and RERAs matter — and how to find them in your PAP data.',
    date: '2026-04-02',
    readTime: '10 min read',
    tags: ['AHI', 'Flow Limitation', 'RERAs', 'UARS', 'Getting Started'],
    ogDescription:
      'Your AHI looks great but you still feel exhausted. Learn why flow limitation and RERAs matter — and how to find them in your PAP data.',
    faqItems: [
      {
        question: 'Why am I still tired even though my AHI is low?',
        answer:
          'AHI only counts complete airway closures (apneas) and significant partial reductions (hypopneas). Flow limitation — partial airway narrowing that restricts airflow without meeting event thresholds — and RERAs (Respiratory Effort-Related Arousals) can fragment your sleep and cause fatigue without ever appearing in your AHI score.',
      },
      {
        question: 'What is the difference between flow limitation and a RERA?',
        answer:
          'Flow limitation is the underlying event: partial narrowing of your upper airway that flattens the inspiratory flow waveform. A RERA occurs when a sequence of flow-limited breaths triggers a brief arousal that restores normal airflow. Flow limitation is continuous airway narrowing; a RERA is the arousal that ends a bout of flow limitation.',
      },
      {
        question: 'How can I detect flow limitation and RERAs in my PAP data?',
        answer:
          'Your ResMed SD card contains breath-by-breath flow waveform data. Tools like AirwayLab analyse this data using the Glasgow Index (breath shape scoring), FL Score (flow limitation percentage), and NED with estimated RERA detection to surface the patterns AHI cannot see.',
      },
    ],
  },
  {
    slug: 'cpap-data-analysis-browser-no-download',
    title: 'Analyse CPAP Data in Your Browser — No Download, No Cloud, No Account',
    seoTitle: 'Analyse CPAP Data in Your Browser — No Download, No Cloud, No Account',
    description:
      'AirwayLab analyses your CPAP data entirely in your browser. No software to install, no cloud upload, no account needed. See AHI, flow limitation, RERAs, and the Glasgow Index free.',
    date: '2026-04-09',
    readTime: '5 min read',
    tags: ['CPAP', 'Privacy', 'OSCAR', 'Getting Started', 'Browser'],
    ogDescription:
      'Analyse your CPAP data without installing anything. AirwayLab runs entirely in your browser — no cloud upload, no account. See AHI, flow limitation, and RERAs free.',
    faqItems: [
      {
        question: 'Do I need to install anything to use AirwayLab?',
        answer:
          'No. AirwayLab is a web application. Open airwaylab.app/analyze in your browser, drag in your SD card files, and your data loads immediately.',
      },
      {
        question: 'Is AirwayLab an OSCAR alternative?',
        answer:
          'AirwayLab and OSCAR complement each other rather than compete. OSCAR is a desktop app with detailed waveform browsing; AirwayLab runs in your browser and adds automated metrics like flow limitation scoring, Glasgow Index, and RERA detection that OSCAR does not compute.',
      },
      {
        question: 'Does AirwayLab upload my CPAP data?',
        answer:
          'No. All analysis runs locally in your browser. The optional AI insights feature is fully opt-in and requires explicit consent before any data is sent.',
      },
    ],
  },
  {
    slug: 'bipap-data-analysis-aircurve-10',
    title: 'BiPAP Data Analysis: How to Read Your AirCurve 10 Data for Free',
    seoTitle: 'BiPAP Data Analysis: How to Read Your AirCurve 10 Data for Free',
    description:
      'AirwayLab reads ResMed AirCurve 10 ST and VAuto EDF files in your browser. See IPAP/EPAP pressure support, flow limitation, and breathing patterns — free, no download.',
    date: '2026-04-09',
    readTime: '4 min read',
    tags: ['BiPAP', 'AirCurve 10', 'ResMed', 'EDF', 'Getting Started'],
    ogDescription:
      'Analyse your ResMed AirCurve 10 BiPAP data free in your browser. AirwayLab reads ST and VAuto EDF files — see flow limitation and breathing patterns. No download.',
    faqItems: [
      {
        question: 'Does AirwayLab support BiPAP data?',
        answer:
          'Yes. AirwayLab reads EDF files from ResMed AirCurve 10 ST and VAuto machines, showing IPAP/EPAP pressure support, flow limitation, and breathing patterns.',
      },
      {
        question: 'What is the difference between CPAP and BiPAP EDF data?',
        answer:
          'BiPAP machines deliver two pressures (IPAP and EPAP). The EDF format is the same as CPAP, but the waveform includes pressure support data alongside the flow signal. AirwayLab parses both correctly.',
      },
    ],
  },
  {
    slug: 'four-metrics-airwaylab-measures',
    title: 'The Four Metrics AirwayLab Tracks — and What Each One Tells You',
    seoTitle: 'Four Metrics AirwayLab Tracks — and What Each One Tells You',
    description:
      'AHI only tells part of the story. Learn what the Flow Limitation Score, Glasgow Index, WAT score, and NED analysis show about your PAP therapy data — and why they matter.',
    date: '2026-04-09',
    readTime: '7 min read',
    tags: ['Flow Limitation', 'Glasgow Index', 'WAT Score', 'NED', 'Metrics', 'CPAP'],
    ogDescription:
      "AHI alone doesn't tell the whole story. Learn what Flow Limitation Score, Glasgow Index, WAT score, and NED analysis show about your PAP therapy data.",
    faqItems: [
      {
        question: 'What metrics does AirwayLab calculate beyond AHI?',
        answer:
          'AirwayLab calculates four main metrics beyond AHI: the Flow Limitation Score (breath shape on a 0–1 scale), the Glasgow Index (cumulative flow limitation burden across nine waveform components), the WAT Score (Wobble Analysis Tool — three breathing stability metrics: FL Score, regularity, and periodicity), and NED — Negative Effort Dependence (effort-to-flow relationship per breath). All are derived from your PAP machine SD card data entirely in your browser.',
      },
      {
        question: 'What is the Flow Limitation Score in AirwayLab?',
        answer:
          'The Flow Limitation Score describes the shape of each breath: 0 for a normal rounded breath, 0.5 for a moderately flattened inspiratory waveform, and 1.0 for a severely flattened one. AirwayLab calculates this per breath from your raw EDF data and shows how it distributes across your session.',
      },
      {
        question: 'What does the WAT score measure in CPAP data?',
        answer:
          'WAT stands for Wobble Analysis Tool. It bundles three breathing stability metrics: FL Score (inspiratory flatness, 0–100), Regularity (sample entropy of minute ventilation — higher means more variable), and Periodicity Index (spectral analysis detecting cyclical breathing in the 30–100 second range). All three are calculated from your flow data entirely in your browser.',
      },
    ],
  },
  {
    slug: 'v1-2-2-your-data-explained-not-judged',
    title: 'v1.2.2: Your Data, Explained -- Not Judged',
    description:
      'AirwayLab v1.2.2 ships 23 PRs: MDR compliance sweep, dashboard improvements, and honest data framing. Your PAP data, explained -- not judged.',
    date: '2026-04-04',
    readTime: '5 min read',
    tags: ['Release', 'MDR Compliance', 'Dashboard', 'UX'],
    ogDescription:
      'AirwayLab v1.2.2 ships 23 PRs: MDR compliance sweep, dashboard improvements, and honest data framing. Your PAP data, explained -- not judged.',
  },
  {
    slug: 'how-to-read-cpap-data',
    title: 'How to Read Your CPAP Data \u2014 A Beginner\u2019s Guide',
    seoTitle: 'How to Read Your CPAP Data \u2014 A Beginner\u2019s Guide | AirwayLab',
    description:
      'Learn what your CPAP data actually shows you \u2014 AHI, leak rate, pressure, flow limitation \u2014 and how to start reading therapy patterns worth discussing with your clinician.',
    date: '2026-04-16',
    readTime: '10 min read',
    tags: ['CPAP', 'Getting Started', 'AHI', 'Leak Rate', 'OSCAR', 'Beginner Guide'],
    ogDescription:
      'New to CPAP data? We explain what AHI, leak rate, pressure, and flow limitation mean \u2014 and how to start spotting patterns in your therapy report.',
    faqItems: [
      {
        question: 'What does my CPAP machine record every night?',
        answer: 'Your machine records usage hours, AHI (apnoeas and hypopnoeas per hour), leak rate, pressure, flow limitation, and a breakdown of event types. Not every machine records all of these \u2014 older or basic models may only report AHI and usage.',
      },
      {
        question: 'What is the difference between therapy AHI and diagnostic AHI?',
        answer: 'Your therapy AHI is what your machine counts during treated sleep. A diagnostic AHI from a sleep study measures untreated events. They are not directly comparable.',
      },
      {
        question: 'How do I access my CPAP data beyond the app?',
        answer: 'Remove the SD card from your machine, insert it into a card reader, and open the data with OSCAR (free desktop software for full waveform detail) or AirwayLab (browser-based for multi-night pattern review). No account required for either.',
      },
      {
        question: 'What should I bring to my provider appointment?',
        answer: 'Screenshots of patterns rather than just averages, leak data if elevated, pressure graphs if you are on APAP and frequently hitting the ceiling, and event type breakdowns if you have an unusual distribution. Your provider can adjust settings; your clinician can interpret the full picture.',
      },
      {
        question: 'Does AirwayLab upload my data?',
        answer: 'No. All analysis runs in your browser. Your breathing data never leaves your device \u2014 there is no cloud upload and no account required to get started.',
      },
    ],
  },
  {
    slug: 'v121-clearer-language',
    title: 'v1.2.1: Clearer Language, Same Deep Analysis',
    description:
      'AirwayLab v1.2.1 updates how insights are worded to be clearer, more accurate, and aligned with EU MDR guidelines. Your analysis stays the same.',
    date: '2026-04-03',
    readTime: '3 min read',
    tags: ['Release', 'MDR Compliance', 'Language'],
    ogDescription:
      'AirwayLab v1.2.1 updates how insights are worded to be clearer, more accurate, and aligned with EU MDR guidelines. Your analysis stays the same.',
  },
  {
    slug: 'why-ahi-is-lying',
    title: 'Why Your AHI Is Lying to You',
    seoTitle: 'Why Your CPAP AHI Score Can Be Misleading — AirwayLab',
    description:
      'AHI was never designed to measure sleep quality. It misses flow limitation, RERAs, breathing irregularity, and the autonomic stress response. Here is the evidence -- and what you can track instead.',
    date: '2026-03-20',
    readTime: '11 min read',
    tags: ['AHI', 'Flow Limitation', 'UARS', 'CPAP', 'Research'],
    ogDescription:
      'Your CPAP says AHI 1.2 but you feel terrible. AHI cannot see flow limitation, RERAs, or breathing irregularity. Learn what the research shows and what metrics actually matter.',
    faqItems: [
      {
        question: 'Why does my AHI show normal but I still feel tired on CPAP?',
        answer: 'AHI only counts complete breathing stops (apneas) and significant partial reductions (hypopneas). It cannot detect flow limitation -- partial airway narrowing that restricts airflow without meeting event thresholds. A night with hundreds of flow-limited breaths can produce an AHI of zero. Research shows flow limitation itself can drive fatigue through autonomic stress responses, even without cortical arousals.',
      },
      {
        question: 'What are the limitations of AHI as a sleep apnea metric?',
        answer: 'AHI has several design limitations: it requires a 10-second minimum event duration (shorter events are invisible), treats all events equally regardless of severity, cannot detect flow limitation or RERAs, ignores event clustering and sleep stage distribution, and has been shown to be a poor predictor of cardiovascular outcomes and symptom severity in multiple large studies including the SAVE trial.',
      },
      {
        question: 'What metrics should I track besides AHI for CPAP therapy?',
        answer: 'Research-grade metrics that capture what AHI misses include the Glasgow Index (breath shape distortion across 9 components), FL Score (percentage of flow-limited breaths), Negative Effort Dependence or NED (per-breath airway collapse detection), estimated RERA Index (respiratory effort-related arousals), Sample Entropy (breathing regularity), and Periodicity Index (cyclical breathing patterns). These can be derived from your PAP SD card data using tools like AirwayLab.',
      },
    ],
  },
  {
    slug: 'ahi-normal-still-tired',
    title: 'Your AHI Is Normal But You\'re Still Exhausted — Here\'s What Your Data Is Missing',
    seoTitle: 'Low AHI But Still Tired? What Your CPAP Data Is Missing',
    description:
      'An AHI under 5 doesn\'t mean your therapy is working. Flow limitation, RERAs, and autonomic stress can fragment your sleep without showing up in standard metrics. Here\'s how to find out.',
    date: '2026-03-17',
    readTime: '9 min read',
    tags: ['AHI', 'Fatigue', 'Flow Limitation', 'Getting Started'],
    ogDescription:
      'Low AHI but still tired after CPAP? Flow limitation and RERAs may be fragmenting your sleep without triggering scored events. Learn what your data is hiding.',
    faqItems: [
      {
        question: 'Why is my AHI low but I\'m still tired?',
        answer: 'AHI only counts complete and near-complete airway collapses. It cannot detect flow limitation -- partial airway narrowing that restricts airflow without triggering a scored event. Flow limitation has been associated with sleep fragmentation, autonomic stress responses, and persistent fatigue even when AHI is under 5. Research suggests 15-30% of treated sleep apnea patients report persistent fatigue despite a normal AHI.',
      },
      {
        question: 'What is flow limitation in sleep apnea?',
        answer: 'Flow limitation is partial narrowing of the upper airway during inspiration that restricts airflow without causing a complete collapse. On a flow waveform, it appears as a flattened inspiratory peak rather than the normal rounded shape. It can cause sleep fragmentation and symptoms even when AHI is normal.',
      },
      {
        question: 'How can I check for flow limitation in my PAP data?',
        answer: 'Your ResMed SD card contains breath-by-breath flow waveform data. Tools like AirwayLab can analyse this data using the Glasgow Index (breath shape scoring), FL Score (flow limitation percentage), and NED (Negative Effort Dependence) to detect flow limitation that your machine\'s app doesn\'t show you.',
      },
    ],
  },
  {
    slug: 'oscar-alternative',
    title: 'AirwayLab vs OSCAR: What Each Tool Does Best (and How to Use Both)',
    seoTitle: 'AirwayLab vs OSCAR: How They Compare (and How to Use Both)',
    description:
      'OSCAR shows your waveforms. AirwayLab analyses them. A practical comparison of the two open-source PAP data tools, with a workflow for using both together.',
    date: '2026-03-17',
    readTime: '8 min read',
    tags: ['OSCAR', 'CPAP Software', 'Flow Limitation', 'Comparison'],
    ogDescription:
      'AirwayLab and OSCAR are both free, open-source PAP tools. OSCAR shows your waveforms; AirwayLab analyses them for flow limitation. Learn how to use both.',
    faqItems: [
      {
        question: 'What is the difference between OSCAR and AirwayLab?',
        answer: 'OSCAR is a desktop application that provides interactive waveform browsing and event-by-event review of PAP data. AirwayLab is a browser-based tool that runs automated flow limitation analysis using four research-grade engines (Glasgow Index, WAT, NED, Oximetry). OSCAR shows your waveforms; AirwayLab analyses them with composite scoring.',
      },
      {
        question: 'Can I use OSCAR and AirwayLab together?',
        answer: 'Yes, they are complementary. Start with AirwayLab for automated scoring and the big picture (Glasgow Index, FL Score, RERA estimates). Then use OSCAR to zoom into specific waveforms and verify findings. Many users benefit from combining both tools.',
      },
      {
        question: 'Is AirwayLab a replacement for OSCAR?',
        answer: 'No. AirwayLab and OSCAR solve different problems. OSCAR excels at interactive waveform inspection and supports multiple device manufacturers. AirwayLab adds automated flow limitation analysis, composite metrics, and AI-powered insights that OSCAR does not compute. Both are free and open source.',
      },
    ],
  },
  {
    slug: 'how-pap-therapy-works',
    title: 'How PAP Therapy Actually Works: CPAP, BiPAP, and Pressure Support Explained',
    description:
      'A visual, beginner-friendly guide to the physics of PAP therapy. Understand how EPAP splints your airway, why inspiration creates dangerous negative pressure, and how pressure support pushes air through.',
    date: '2026-03-17',
    readTime: '14 min read',
    tags: ['PAP', 'CPAP', 'BiPAP', 'Getting Started'],
    ogDescription:
      'Your PAP machine blows air, but why does that keep your airway open? A visual guide to EPAP, IPAP, pressure support, and the physics of keeping a flexible airway splinted during sleep.',
    faqItems: [
      {
        question: 'How does a CPAP machine keep your airway open?',
        answer: 'CPAP delivers a single continuous air pressure through a mask that acts as a pneumatic splint, preventing the flexible upper airway (pharynx) from collapsing during sleep. The positive pressure counteracts the negative pressure created during inspiration that would otherwise pull the airway walls inward.',
      },
      {
        question: 'What is the difference between CPAP and BiPAP?',
        answer: 'CPAP delivers one fixed pressure for both inhaling and exhaling. BiPAP delivers two pressures: a higher pressure during inspiration (IPAP) and a lower pressure during expiration (EPAP). The difference between IPAP and EPAP is called pressure support, which helps push air through a narrowed airway during inhalation.',
      },
      {
        question: 'What is pressure support on a BiPAP machine?',
        answer: 'Pressure support is the difference between the inspiratory pressure (IPAP) and expiratory pressure (EPAP) on a bilevel device. For example, if IPAP is 14 cmH2O and EPAP is 10 cmH2O, pressure support is 4 cmH2O. Higher pressure support provides more assistance during inhalation and can help overcome flow limitation.',
      },
    ],
  },
  {
    slug: 'ifl-symptom-sensitivity',
    title: 'Not Everyone With High Flow Limitation Feels Bad — Here\'s How to Find Out If Yours Matters',
    description:
      'Two people with the same FL% can feel completely different. Individual sensitivity to flow limitation explains the gap. AirwayLab\'s symptom self-report helps you find your own correlation.',
    date: '2026-03-12',
    readTime: '7 min read',
    tags: ['Flow Limitation', 'Symptoms', 'IFL Sensitivity', 'Self-Report'],
    ogDescription:
      'High flow limitation doesn\'t always cause symptoms. Track your own IFL sensitivity with AirwayLab\'s symptom self-report to find out if your FL is driving how you feel.',
  },
  {
    slug: 'hidden-respiratory-events',
    title: 'The Hidden Respiratory Events Your Flow Data Isn\'t Showing You',
    description:
      'Your AHI is normal, your NED looks clean, but your oximetry shows constant arousals. Brief airway obstructions — events too short and too subtle for standard detection — may explain the gap.',
    date: '2026-03-12',
    readTime: '8 min read',
    tags: ['Brief Obstructions', 'Flow Limitation', 'Amplitude', 'UARS'],
    ogDescription:
      'Standard flow analysis misses brief airway obstructions — 1-2 breath events that slip under every detection threshold. Learn how amplitude-based analysis fills the gap between your metrics and your symptoms.',
  },
  {
    slug: 'flow-limitation-and-sleepiness',
    title: 'Does Flow Limitation Drive Sleepiness? What the Evidence Shows',
    description:
      'Your AHI is 2, your arousal index is low, but you\'re exhausted. A growing body of research shows flow limitation itself may drive daytime sleepiness — independent of arousals.',
    date: '2026-03-12',
    readTime: '9 min read',
    tags: ['Flow Limitation', 'Research', 'UARS', 'Sleepiness'],
    ogDescription:
      'Research into inspiratory flow limitation and its relationship to sleepiness. Learn what this means for tracking your PAP data.',
    faqItems: [
      {
        question: 'Does flow limitation on CPAP cause daytime sleepiness?',
        answer: 'Research shows inspiratory flow limitation is associated with daytime sleepiness and fatigue independently of AHI and arousal index. Studies have found that patients with high flow limitation scores report worse subjective sleepiness even when arousals and AHI are controlled for, suggesting the respiratory effort response itself may contribute to symptoms.',
      },
      {
        question: 'What is the relationship between flow limitation and UARS?',
        answer: 'Upper Airway Resistance Syndrome (UARS) is characterised by high respiratory effort and symptoms despite normal AHI. Flow limitation is one of the primary physiological markers of UARS. Many UARS patients show high FL scores and elevated RERA counts in their PAP data even with AHI under 5.',
      },
    ],
  },
  {
    slug: 'arousals-vs-flow-limitation',
    title: 'Arousals Don\'t Tell the Whole Story: Why Flow Limitation May Matter More',
    description:
      'Sleep medicine assumed arousals fragment sleep and cause symptoms. But research from Dr. Avram Gold and others suggests the stress response to flow limitation itself is the primary driver.',
    date: '2026-03-12',
    readTime: '9 min read',
    tags: ['Arousals', 'Flow Limitation', 'UARS', 'Research'],
    ogDescription:
      'Arousals may not be the primary driver of sleep-disordered breathing symptoms. Dr. Gold\'s limbic stress response model offers a compelling alternative.',
    faqItems: [
      {
        question: 'What is a RERA in CPAP data?',
        answer: 'A RERA (Respiratory Effort-Related Arousal) is a sequence of flow-limited breaths that ends in a brief cortical arousal. Unlike apneas, RERAs do not meet AHI threshold criteria but can fragment sleep architecture. They are detected through flow waveform analysis of PAP SD card data.',
      },
      {
        question: 'Do arousals cause sleep apnea symptoms or does flow limitation?',
        answer: 'Research from Dr. Avram Gold and others suggests the autonomic stress response to flow limitation itself — not the cortical arousal — may be the primary driver of symptoms in upper airway resistance. This means patients with high flow limitation but few measurable arousals can still experience significant fatigue.',
      },
    ],
  },
  {
    slug: 'epworth-sleepiness-scale',
    title: 'Is the Epworth Sleepiness Scale Measuring What You Think?',
    description:
      'You scored normal on the ESS but feel terrible. Recent research by Drs. Gold and Stoohs shows the ESS conflates sleepiness and fatigue — and may be screening out the patients who need help most.',
    date: '2026-03-12',
    readTime: '8 min read',
    tags: ['ESS', 'Fatigue', 'UARS', 'Research'],
    ogDescription:
      'The Epworth Sleepiness Scale conflates sleepiness and fatigue. If your main symptom is exhaustion rather than drowsiness, the ESS may miss your problem entirely.',
  },
  {
    slug: 'what-is-cns-sensitization',
    title: 'Why Your Brain Might Matter More Than Your Airway: Understanding CNS Sensitization in Sleep-Disordered Breathing',
    description:
      'Your flow limitation is mild, but your arousals are through the roof. A growing body of research points to central nervous system sensitization — and your AirwayLab data might already be showing it.',
    date: '2026-03-09',
    readTime: '8 min read',
    tags: ['UARS', 'Sensitization', 'Flow Limitation', 'Arousals', 'Research'],
    ogDescription:
      'Mild flow limitation but sky-high arousals? Research points to CNS sensitization. Learn what this pattern means and how AirwayLab detects it.',
  },
  {
    slug: 'understanding-flow-limitation',
    title: 'Understanding Flow Limitation in Your PAP Data: The Hidden Metric Beyond AHI',
    seoTitle: 'CPAP Flow Limitation Explained: What Your Machine Doesn\'t Tell You',
    description:
      'What is cpap flow limitation and why does your machine miss it? Learn how flow limitation differs from apneas, how the Glasgow Index scores it, and how to find it in your breathing data.',
    date: '2026-03-06',
    readTime: '9 min read',
    tags: ['Flow Limitation', 'PAP', 'AHI', 'Glasgow Index', 'NED', 'RERAs', 'Getting Started'],
    ogDescription:
      'What is CPAP flow limitation and why does your machine miss it? Learn how the Glasgow Index scores it and how to analyse it in your PAP breathing data.',
    faqItems: [
      {
        question: 'What is flow limitation on CPAP?',
        answer: 'Flow limitation on CPAP is partial narrowing of the upper airway during sleep that restricts airflow without causing a complete collapse. Unlike apneas and hypopneas, flow-limited breaths produce a characteristic flat-topped inspiratory waveform rather than the normal rounded shape. CPAP machines track AHI but do not score flow limitation, so it can go undetected even when your airway is significantly narrowed each night.',
      },
      {
        question: 'What is flow limitation and why does my AHI miss it?',
        answer: 'Flow limitation is partial airway narrowing that restricts airflow during inspiration without fully blocking it. AHI only counts apneas (complete stops) and hypopneas (significant reductions with oxygen drops). Flow limitation falls below these thresholds, so AHI stays low while the underlying breathing pattern shows airway narrowing.',
      },
      {
        question: 'How is flow limitation detected in PAP data?',
        answer: 'Flow limitation is detected through breath shape analysis of the waveform data recorded on your PAP machine SD card. Key scoring methods include the Glasgow Index (9-component breath shape score, range 0-9), NED (Negative Effort Dependence, measuring whether increased effort decreases airflow), and estimated RERA detection. These require dedicated analysis software that reads the raw EDF files.',
      },
      {
        question: 'What is the Glasgow Index?',
        answer: 'The Glasgow Index is a breath shape scoring system developed at the University of Glasgow. It examines nine components of each inspiratory waveform -- including flatness, skewness, multi-peak patterns, and amplitude variability -- scoring each from 0 to 1 for an overall range of 0 to 9. Higher scores indicate more waveform distortion consistent with flow limitation.',
      },
    ],
  },
  {
    slug: 'beyond-ahi',
    title: 'Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You',
    seoTitle: 'Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading',
    description:
      'The Apnea-Hypopnea Index has been the gold standard for decades. But a growing body of research shows it misses critical breathing events. Here\'s what you should be tracking instead.',
    date: '2026-02-20',
    readTime: '10 min read',
    tags: ['AHI', 'Sleep Metrics', 'Research'],
    ogDescription:
      'AHI has been sleep medicine\'s gold standard for decades, but research shows it misses flow limitation, RERAs, and breathing instability. Learn what matters.',
    faqItems: [
      {
        question: 'What does AHI mean and why is it not enough?',
        answer: 'AHI, or Apnea-Hypopnea Index, counts the number of complete breathing pauses (apneas) and significant partial reductions (hypopneas) per hour of sleep. It is the primary metric used to diagnose and monitor sleep apnea. However, AHI misses flow limitation (partial airway narrowing below event thresholds), RERAs (respiratory effort-related arousals), and breathing irregularity -- patterns that research shows can affect sleep quality even when AHI is normal.',
      },
      {
        question: 'Why is AHI not a reliable measure of sleep apnea severity?',
        answer: 'AHI counts all events equally regardless of duration (a 10-second apnea equals a 60-second one), ignores oxygen desaturation severity, misses flow limitation and RERAs entirely, and does not account for event clustering. Research shows AHI alone is a poor predictor of cardiovascular outcomes and daytime symptoms.',
      },
      {
        question: 'What metrics should I track instead of AHI?',
        answer: 'More informative metrics include the Glasgow Index (flow shape score that captures the full spectrum of airway narrowing), estimated RERA Index (respiratory events AHI misses), hypoxic burden (total oxygen desaturation load), and breath-to-breath variability. Several of these can be derived from your PAP SD card data.',
      },
    ],
  },
  {
    slug: 'pap-data-privacy',
    title: 'Your PAP Data Belongs to You: Privacy in Sleep Medicine',
    seoTitle: 'CPAP Data Privacy: Who Sees Your Sleep Data and How to Protect It',
    description:
      'Every night, your PAP machine collects intimate health data. Where does it go? Who can see it? And what are your rights? A look at privacy in the age of connected sleep devices.',
    date: '2026-02-05',
    readTime: '7 min read',
    tags: ['Privacy', 'Data Rights', 'ResMed'],
    ogDescription:
      'Who can see your CPAP data? Your insurer, equipment provider, and device maker may have access. Learn your data rights and how to keep your sleep data private.',
    faqItems: [
      {
        question: 'Can my insurance company see my CPAP data?',
        answer: 'Yes, in many cases. If your PAP machine has a cellular modem (most ResMed AirSense models do), data is automatically transmitted to manufacturer cloud servers. Your DME provider and insurance company can request compliance data, which typically includes AHI, usage hours, and leak rates. Some insurance plans require minimum nightly usage and can affect coverage decisions based on this data. Your insurance contract determines exactly what data they receive.',
      },
      {
        question: 'Who can see my CPAP data?',
        answer: 'Your PAP data may be accessible to: the device manufacturer (ResMed, Philips) via their cloud servers, your DME (equipment provider) via platforms like AirView, your insurance company for compliance monitoring, and your sleep physician. Modern PAP machines with cellular modems transmit data automatically.',
      },
      {
        question: 'Can I analyse my PAP data without uploading it to the cloud?',
        answer: 'Yes. Your PAP machine stores detailed data locally on its SD card, which is actually more detailed than what gets transmitted to the cloud. Tools like AirwayLab process this data entirely in your browser without any server upload, giving you full analysis while keeping your data private.',
      },
    ],
  },
  {
    slug: 'what-is-glasgow-index-cpap',
    title: 'What Is the Glasgow Index in CPAP/BiPAP Data?',
    description:
      'The Glasgow Index scores the shape of each breath during sleep on nine components. AirwayLab calculates it automatically from your ResMed EDF data -- free, in your browser.',
    date: '2026-04-05',
    readTime: '5 min read',
    tags: ['Glasgow Index', 'Flow Limitation', 'CPAP', 'Metrics'],
    ogDescription:
      'The Glasgow Index scores the shape of each breath during sleep on nine components. AirwayLab calculates it automatically from your ResMed EDF data -- free, in your browser.',
    faqItems: [
      {
        question: 'What is the Glasgow Index in CPAP data?',
        answer:
          'The Glasgow Index measures the shape of your inspiratory flow curve during sleep. It analyses each breath on nine components -- including skew, flat top, and variable amplitude -- to detect waveform irregularities associated with upper airway narrowing. A higher score means more irregularities were detected across the night.',
      },
      {
        question: 'Where does the Glasgow Index appear in AirwayLab?',
        answer:
          'Open the Glasgow tab after loading your ResMed SD card data. You will see your overall nightly score, a component-level breakdown, and a trend view across multiple nights.',
      },
      {
        question: 'Is a high Glasgow Index a problem?',
        answer:
          'The Glasgow Index is a data description of your breathing waveform shapes. It is not a clinical finding or diagnosis. A high score describes a pattern -- its clinical significance depends on context that only your clinician can assess.',
      },
    ],
  },
  {
    slug: 'resmed-airsense-10-sd-card',
    title: 'How to Get Your ResMed AirSense 10 Data Into AirwayLab (Step by Step)',
    description:
      'Learn how to find, remove, and read the SD card from your ResMed AirSense 10. Step-by-step guide to getting your CPAP data into AirwayLab for detailed analysis.',
    date: '2026-04-04',
    readTime: '7 min read',
    tags: ['Getting Started', 'CPAP', 'ResMed', 'AirSense 10', 'SD Card'],
    ogDescription:
      'Learn how to find, remove, and read the SD card from your ResMed AirSense 10. Step-by-step guide to getting your CPAP data into AirwayLab for detailed analysis.',
    faqItems: [
      {
        question: 'How often should I check my AirSense 10 data?',
        answer: 'That is entirely up to you. Some people check weekly, others monthly. The SD card stores months of data, so there is no rush. Many users find a monthly review gives them a useful picture of trends without being overwhelming.',
      },
      {
        question: 'Will removing the SD card from my AirSense 10 affect my therapy?',
        answer: 'No. Your AirSense 10 continues to provide therapy without the SD card. It just will not record detailed session data until the card is back. Your therapy settings are stored in the machine\'s internal memory, not on the card.',
      },
      {
        question: 'What is in the DATALOG folder on a ResMed AirSense 10 SD card?',
        answer: 'The DATALOG folder contains your nightly session data in EDF (European Data Format) files. Each subfolder is named by date and contains flow waveforms, pressure data, leak rates, and respiratory event annotations for that night. AirwayLab reads these files automatically -- you do not need to understand EDF format.',
      },
      {
        question: 'Can I use a different SD card in my AirSense 10?',
        answer: 'Yes. Any standard SD card (2GB or larger, formatted as FAT32) works with the AirSense 10. If your original card fills up, copy the DATALOG folder to your computer before replacing it to preserve historical data.',
      },
    ],
  },
  {
    slug: 'what-is-wat-score-cpap',
    title: 'What Is the WAT Score in CPAP Data?',
    description:
      'WAT (Wobble Analysis Tool) is three metrics in one: FL Score, breathing regularity, and periodic breathing detection. AirwayLab calculates it from your ResMed EDF files.',
    date: '2026-04-05',
    readTime: '5 min read',
    tags: ['WAT Score', 'Flow Limitation', 'CPAP', 'Metrics'],
    ogDescription:
      'WAT (Wobble Analysis Tool) bundles FL Score, breathing regularity, and periodic breathing into one view. AirwayLab calculates all three from your ResMed EDF data -- nothing uploaded.',
    faqItems: [
      {
        question: 'What does WAT stand for in CPAP analysis?',
        answer:
          'WAT stands for Wobble Analysis Tool. It is a bundle of three independent metrics calculated by AirwayLab from your inspiratory flow data: FL Score (flow limitation percentage), Regularity (sample entropy of minute ventilation), and Periodicity Index (cyclical breathing detection via Fourier analysis).',
      },
      {
        question: 'What is the FL Score in AirwayLab?',
        answer:
          "AirwayLab's FL Score is a continuous 0-100 percentage measuring how much of your inspiratory waveform shows flattening compared to a normal rounded profile. It is calculated per breath from your raw EDF data, independent of ResMed's firmware.",
      },
      {
        question: 'What is the Periodicity Index in CPAP data?',
        answer:
          'The Periodicity Index uses Fourier analysis to detect cyclical breathing patterns repeating on a 30-100 second cycle. A higher value suggests oscillating breathing patterns rather than stable ventilation throughout the night.',
      },
    ],
  },
  {
    slug: 'resmed-airsense-11-sd-card',
    title: 'How to Get Your ResMed AirSense 11 Data Into AirwayLab',
    description:
      'Step-by-step guide to accessing your ResMed AirSense 11 SD card data. Learn how to find the card, read the DATALOG folder, and analyze your CPAP data in AirwayLab.',
    date: '2026-04-04',
    readTime: '7 min read',
    tags: ['Getting Started', 'CPAP', 'ResMed', 'AirSense 11', 'SD Card'],
    ogDescription:
      'Step-by-step guide to accessing your ResMed AirSense 11 SD card data. Learn how to find the card, read the DATALOG folder, and analyze your CPAP data in AirwayLab.',
    faqItems: [
      {
        question: 'Does the AirSense 11 always come with an SD card?',
        answer: 'Most AirSense 11 units ship with a micro SD card pre-installed. If yours did not come with one, you can insert any micro SD card formatted as FAT32 (2GB or larger). The micro SD card usually sits inside a full-size SD adapter.',
      },
      {
        question: 'My AirSense 11 connects to myAir. Do I still need the SD card for AirwayLab?',
        answer: 'Yes, if you want detailed flow waveform data. myAir receives summary data over cellular, not the full waveform data that the SD card stores. The SD card contains the breath-by-breath flow signal that AirwayLab uses to detect flow limitation and breathing pattern instability.',
      },
      {
        question: 'Is AirSense 11 data different from AirSense 10 data?',
        answer: 'The core data is the same -- flow waveforms, pressure, leaks, and events. The file format has minor differences between models, but AirwayLab handles both automatically. Some early AirSense 11 firmware versions had slightly different DATALOG structures, which AirwayLab\'s parser detects and adapts to.',
      },
      {
        question: 'Can I use AirwayLab and myAir at the same time?',
        answer: 'Absolutely. They do not interfere with each other. myAir is useful for quick daily check-ins. AirwayLab gives you the deeper breath-by-breath analysis that myAir does not provide.',
      },
    ],
  },
  {
    slug: 'what-is-ned-sleep-apnea',
    title: 'What Is NED (Negative Effort Dependence) in PAP Therapy Data?',
    description:
      'NED measures a breathing pattern where greater respiratory effort produces less airflow. AirwayLab calculates NED per breath from your ResMed EDF data, free in your browser.',
    date: '2026-04-05',
    readTime: '6 min read',
    tags: ['NED', 'Flow Limitation', 'CPAP', 'RERA', 'Metrics'],
    ogDescription:
      'NED (Negative Effort Dependence) describes breaths where harder effort produces less airflow. AirwayLab scores NED per breath from your ResMed SD card data -- free, private, browser-only.',
    faqItems: [
      {
        question: 'What is Negative Effort Dependence (NED) in sleep apnea?',
        answer:
          'NED is a breathing characteristic where increasing respiratory effort produces less inspiratory airflow rather than more -- the opposite of normal breathing. In a NED breath, the harder the respiratory muscles work, the more the airway resists. NED is calculated per breath from the shape of the inspiratory flow waveform.',
      },
      {
        question: 'What is the NED score formula?',
        answer:
          'AirwayLab calculates the NED score as: (peak flow - mid-inspiration flow) / peak flow x 100. A higher percentage means a larger drop in flow during the mid-inspiratory phase, the waveform signature of effort-dependent restriction.',
      },
      {
        question: 'What is RERA detection in AirwayLab?',
        answer:
          "AirwayLab's RERA detection identifies sequences of 3-15 consecutive breaths showing progressive flow limitation features followed by a recovery breath. It uses NED slope, recovery breath shape, and sigh detection. This is a flow-based heuristic from EDF data -- it is not equivalent to polysomnography-based RERA scoring by a sleep clinician.",
      },
    ],
  },
  {
    slug: 'what-is-uars',
    title: 'What Is UARS? Upper Airway Resistance Syndrome Explained for PAP Users',
    seoTitle: 'What Is UARS? Upper Airway Resistance Syndrome Explained for PAP Users',
    description:
      'Upper Airway Resistance Syndrome (UARS) is a sleep breathing disorder standard AHI scoring routinely misses. Learn what UARS is, how it differs from OSA, and what your PAP data can reveal.',
    date: '2026-04-19',
    readTime: '10 min read',
    tags: ['UARS', 'Flow Limitation', 'AHI', 'RERAs', 'Sleep Apnea'],
    ogDescription:
      'What is UARS sleep apnea? Learn how Upper Airway Resistance Syndrome differs from OSA, why AHI misses it, and what your PAP data can reveal.',
    faqItems: [
      {
        question: 'Is UARS the same as sleep apnea?',
        answer:
          'UARS and obstructive sleep apnea (OSA) are related but distinct conditions. Both involve airway narrowing during sleep and disrupted sleep architecture. The key difference is the type of event: OSA is defined by apneas and hypopneas, while UARS is characterized by increased airway resistance and respiratory effort-related arousals without the airflow reduction threshold being met. Many clinicians consider UARS part of a spectrum of sleep-disordered breathing rather than a completely separate category.',
      },
      {
        question: 'Can someone have a normal sleep study but still have UARS?',
        answer:
          'Yes. Standard polysomnography and most home sleep tests score AHI (apneas + hypopneas per hour). UARS events — RERAs — are not included in AHI. A person with significant UARS may have an AHI below the diagnostic threshold for OSA while experiencing dozens of respiratory-effort arousals per hour.',
      },
      {
        question: 'Why do I still feel tired even though my CPAP data looks good?',
        answer:
          'A low AHI on your device report does not mean your breathing was undisturbed. Flow limitation can persist without triggering scored events. Other causes include suboptimal pressure, pressure setting mismatch, mask leak, or sleep disorders not related to airway function. Discuss persistent fatigue with your clinical team.',
      },
      {
        question: 'Can PAP therapy treat UARS?',
        answer:
          'PAP therapy (CPAP, APAP, or BiPAP) is commonly used by people with UARS. Positive airway pressure addresses airway resistance by maintaining open airway patency throughout the night, which can reduce the frequency of effort-related arousals. Your clinician can help interpret your full data picture in context.',
      },
      {
        question: 'How is UARS diagnosed?',
        answer:
          'There is no single universally accepted diagnostic standard. In practice, evaluation may involve in-lab polysomnography with attention to RERA scoring, clinical history, symptom presentation, and sometimes esophageal pressure monitoring. A sleep specialist familiar with RERA-based scoring and flow limitation analysis can provide further evaluation if UARS is suspected.',
      },
      {
        question: 'What is a RERA?',
        answer:
          'A Respiratory Effort-Related Arousal is a brief awakening from sleep caused by increased respiratory effort against airway resistance, without meeting the criteria for a scored apnea or hypopnea. RERAs are the defining event of UARS. AirwayLab can display RERA data when it is present in your device recording.',
      },
    ],
  },
  {
    slug: 'cpap-flow-limitation-score-0-5-meaning',
    title: 'CPAP Flow Limitation Score Explained: What 0, 0.5, and 1.0 Mean',
    description:
      'ResMed devices report flow limitation on a 0, 0.5, 1.0 scale. Here is what each value means in your data, how it appears in OSCAR, and how AirwayLab\'s FL Score relates to it.',
    date: '2026-04-05',
    readTime: '5 min read',
    tags: ['Flow Limitation', 'FL Score', 'OSCAR', 'CPAP', 'ResMed'],
    ogDescription:
      "ResMed devices record flow limitation as 0, 0.5, or 1.0. Learn what each value means, how OSCAR plots it, and how AirwayLab's continuous FL Score gives more granular insight.",
    faqItems: [
      {
        question: 'What does 0.5 flow limitation mean on a CPAP?',
        answer:
          'A flow limitation value of 0.5 from a ResMed device means the machine detected moderate flattening of the inspiratory waveform at that moment. The airway is narrowing enough to restrict airflow, but not at maximum severity. These values are assigned by ResMed firmware and stored in the FLOW_LIMIT channel of your EDF data.',
      },
      {
        question: 'What does a FL score of 1.0 mean on a ResMed device?',
        answer:
          'A FL value of 1.0 means the device detected significant waveform flattening -- the top of the inspiratory curve is flat rather than rounded, indicating strong airway narrowing. This is the most severe categorical level in ResMed\'s three-point scale.',
      },
      {
        question: "What is the difference between OSCAR's FL channel and AirwayLab's FL Score?",
        answer:
          "OSCAR plots ResMed's FL channel: a categorical 0/0.5/1.0 snapshot updated every ~2 seconds by device firmware. AirwayLab's FL Score is a continuous 0-100 percentage calculated per breath from the raw inspiratory waveform, independent of ResMed's firmware. Both describe the same underlying flow signal from different perspectives.",
      },
    ],
  },
  {
    slug: 'resmed-aircurve-bipap-sd-card',
    title: 'How to Get Your ResMed AirCurve 10 or AirCurve 11 BiPAP Data Into AirwayLab',
    description:
      'How to access SD card data from your ResMed AirCurve 10 or AirCurve 11 BiPAP machine. Step-by-step guide to reading your bilevel therapy data in AirwayLab.',
    date: '2026-04-04',
    readTime: '7 min read',
    tags: ['Getting Started', 'BiPAP', 'ResMed', 'AirCurve', 'SD Card'],
    ogDescription:
      'How to access SD card data from your ResMed AirCurve 10 or AirCurve 11 BiPAP machine. Step-by-step guide to reading your bilevel therapy data in AirwayLab.',
    faqItems: [
      {
        question: 'I am on BiPAP. Is AirwayLab still useful for me?',
        answer: 'Yes. AirwayLab\'s flow limitation and breathing pattern analysis works with bilevel data. The core analysis -- detecting partial airway narrowing and breathing instability -- applies regardless of whether you are on CPAP or BiPAP. Bilevel sessions also display both IPAP and EPAP pressure channels.',
      },
      {
        question: 'Does AirwayLab show IPAP and EPAP separately for AirCurve users?',
        answer: 'Yes. Bilevel sessions display both pressure channels so you can see how your machine adjusted IPAP and EPAP throughout the night. This is particularly useful for VAuto users whose machine adjusts EPAP automatically.',
      },
      {
        question: 'Where is the SD card slot on the AirCurve 10?',
        answer: 'The AirCurve 10\'s SD card slot is on the back of the machine, near the bottom, behind a small cover or rubber flap near the power connection. It uses a standard full-size SD card.',
      },
      {
        question: 'My AirCurve has an older firmware. Will my data work with AirwayLab?',
        answer: 'AirwayLab supports EDF files from all AirCurve 10 and AirCurve 11 firmware versions. The parser handles format variations across firmware releases automatically.',
      },
    ],
  },
  {
    slug: 'what-is-flow-limitation-cpap',
    title: 'What Is Flow Limitation on CPAP?',
    seoTitle: 'What Is Flow Limitation on CPAP? | AirwayLab',
    description:
      'Flow limitation on CPAP means your airway is partially narrowing during sleep. Learn what the waveform shows, why it matters when AHI looks fine, and what to note for your clinician.',
    date: '2026-04-19',
    readTime: '6 min read',
    tags: ['Flow Limitation', 'CPAP', 'AHI', 'UARS', 'RERA'],
    ogDescription:
      'Flow limitation on CPAP means your airway is partially narrowing during sleep. Learn what the waveform shows, why it matters when AHI looks fine, and what to note for your clinician.',
    faqItems: [
      {
        question: 'What does flow limitation mean on CPAP?',
        answer:
          'Flow limitation on CPAP refers to a partial narrowing of the upper airway during inspiration that causes the flow rate curve to flatten, meaning airflow is capped despite continued breathing effort. It is not a complete obstruction and is not scored in AHI, but can appear in your waveform data.',
      },
      {
        question: 'Is flow limitation the same as an apnea?',
        answer:
          'No. An apnea is a complete cessation of airflow. Flow limitation is a partial narrowing that constrains airflow without stopping it. It sits below the threshold for a scored apnea or qualifying hypopnea.',
      },
      {
        question: 'Can you have flow limitation with a low AHI?',
        answer:
          'Yes. AHI counts apneas and qualifying hypopneas; flow limitation events are not included in that count. Some users see frequent flow limitation in their waveform data while their AHI remains in a normal range.',
      },
      {
        question: 'How do I see flow limitation in OSCAR or AirwayLab?',
        answer:
          'Look at the Flow Rate waveform. Breaths affected by flow limitation show a flattened or plateaued top on the inspiratory curve rather than a smooth rounded arch. AirwayLab lets you zoom into individual breaths to inspect the curve shape.',
      },
      {
        question: 'Should I be worried about flow limitation on CPAP?',
        answer:
          'This is a question for your clinician. Flow limitation is one data point among many. Whether it is clinically significant in your situation depends on your full history, how you are sleeping, and what your care team observes. Bring your data to your next appointment and discuss what you are seeing.',
      },
    ],
  },
  {
    slug: 'cpap-leak-rate-meaning',
    title: 'CPAP Leak Rate: What It Means and When to Worry',
    seoTitle: 'CPAP Leak Rate: What It Means and When to Worry — AirwayLab',
    description:
      "Your CPAP records total and unintentional leak rate every night. Learn what the numbers mean, what's acceptable, and how to read leak data in OSCAR and AirwayLab.",
    date: '2026-04-20',
    readTime: '6 min read',
    tags: ['Leak Rate', 'CPAP', 'OSCAR', 'ResMed', 'Data Quality'],
    ogDescription:
      "Your CPAP records total and unintentional leak rate every night. Learn what the numbers mean, what's acceptable, and how to read leak data in OSCAR and AirwayLab.",
    faqItems: [
      {
        question: 'What is a normal CPAP leak rate?',
        answer:
          "There's no single universal figure — it depends on your mask type, therapy pressure, and machine brand. ResMed machines typically flag sessions with sustained unintentional leak above ~24 L/min as \"Large Leak.\" In OSCAR, a 95th percentile unintentional leak below roughly 24 L/min is often cited as a reasonable reference point, but what's appropriate for your specific setup is a question for your clinician.",
      },
      {
        question: 'What is the difference between total leak and unintentional leak?',
        answer:
          'Total leak is all the air leaving your CPAP circuit, including the intentional vent leak your mask is designed to produce (to flush exhaled CO₂). Unintentional leak — also called residual leak — is total leak minus the designed vent flow. Unintentional leak is the figure that indicates whether your mask seal is holding.',
      },
      {
        question: 'What does "Large Leak" mean on my ResMed machine?',
        answer:
          '"Large Leak" is ResMed\'s flag in myAir and AirSense device reports, indicating that unintentional leak exceeded a threshold for a meaningful portion of your session. It\'s primarily a data-quality indicator: event detection (AHI, flow limitation readings) may be less reliable for that session. Your clinician can help assess recurring Large Leak flags in your therapy context.',
      },
      {
        question: 'Can high leak rate affect my AHI reading?',
        answer:
          "Yes. When unintentional leak is high, the pressure algorithm's ability to accurately detect apnoeas and hypopnoeas is reduced. AHI figures from high-leak nights may be less reliable. Your clinician can help interpret these figures in the context of your therapy.",
      },
      {
        question: 'How do I read my leak rate in OSCAR?',
        answer:
          'Open OSCAR and load your CPAP data from your SD card. In the daily view, look for the "Leak Rate" chart. OSCAR calculates unintentional (residual) leak by subtracting the vent flow curve for your mask model. The statistics panel shows 95th percentile, median, and maximum values. Make sure OSCAR has your correct mask selected in settings — the right mask profile is essential for an accurate calculation.',
      },
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}
