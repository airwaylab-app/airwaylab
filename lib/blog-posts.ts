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
    title: 'How to Read Your CPAP Data (And Why AHI Isn\'t the Whole Story)',
    description:
      'Your PAP machine records thousands of data points every night. AHI only shows part of the picture. Learn how to read your CPAP data properly -- flow limitation, breathing patterns, and the metrics that matter.',
    date: '2026-04-03',
    readTime: '12 min read',
    tags: ['CPAP', 'Getting Started', 'AHI', 'Flow Limitation', 'OSCAR'],
    ogDescription:
      'Your PAP machine records thousands of data points every night, but AHI only tells part of the story. Learn how to read your CPAP data and understand the metrics beyond AHI.',
    faqItems: [
      {
        question: 'What data does my CPAP machine record?',
        answer: 'Most modern PAP machines record detailed flow waveforms, pressure data, leak rates, respiratory events, machine settings, and session timing. This data is stored on the SD card in EDF format.',
      },
      {
        question: 'Is AHI the only metric that matters?',
        answer: 'AHI counts complete and partial airway closures per hour. It doesn\'t capture flow limitation, breathing pattern instability, or RERAs, which can also affect sleep quality. Deeper analysis of your flow data reveals these patterns.',
      },
      {
        question: 'How do I access my CPAP data?',
        answer: 'Remove the SD card from your PAP machine, insert it into a card reader, and open the data with analysis software like OSCAR (for raw waveforms) or AirwayLab (for automated scoring and pattern analysis).',
      },
      {
        question: 'Does AirwayLab upload my data?',
        answer: 'No. All analysis runs in your browser. Your data never leaves your device unless you explicitly opt in to optional server features.',
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
      'Research shows inspiratory flow limitation predicts sleepiness independent of arousals and AHI. Learn what this means for tracking your PAP therapy.',
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
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}
