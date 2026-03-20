export interface FAQItem {
  question: string;
  answer: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO date
  readTime: string;
  tags: string[];
  ogDescription: string;
  faqItems?: FAQItem[];
}

export const blogPosts: BlogPost[] = [
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
    description:
      'An AHI under 5 doesn\'t mean your therapy is working. Flow limitation, RERAs, and autonomic stress can fragment your sleep without showing up in standard metrics. Here\'s how to find out.',
    date: '2026-03-17',
    readTime: '9 min read',
    tags: ['AHI', 'Fatigue', 'Flow Limitation', 'Getting Started'],
    ogDescription:
      'Your AHI is normal but you\'re still tired? Flow limitation and RERAs may be disrupting your sleep without triggering scored events. Learn how to check your PAP data.',
    faqItems: [
      {
        question: 'Why am I still tired with a normal AHI on CPAP?',
        answer: 'A normal AHI (under 5) only means your airway isn\'t fully collapsing often. Flow limitation -- partial airway narrowing that restricts airflow without triggering a scored event -- can still fragment your sleep and cause fatigue. RERAs, autonomic stress responses, and sleep architecture disruption are common causes that AHI completely misses.',
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
    description:
      'OSCAR shows your waveforms. AirwayLab analyses them. A practical comparison of the two open-source PAP data tools, with a workflow for using both together.',
    date: '2026-03-17',
    readTime: '8 min read',
    tags: ['OSCAR', 'CPAP Software', 'Flow Limitation', 'Comparison'],
    ogDescription:
      'Comparing OSCAR and AirwayLab for PAP therapy analysis. OSCAR excels at waveform browsing; AirwayLab adds automated flow limitation scoring, RERA detection, and AI insights.',
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
    title: 'Understanding Flow Limitation: What Your PAP Machine Doesn\'t Tell You',
    description:
      'Flow limitation is the subtle breathing restriction your AHI score completely ignores. Learn what it is, why it matters, and how to detect it in your own PAP data.',
    date: '2026-03-06',
    readTime: '8 min read',
    tags: ['Flow Limitation', 'PAP', 'Sleep Apnea'],
    ogDescription:
      'Your AHI might be low, but flow limitation could still be disrupting your sleep. Learn what flow limitation is and why it matters for PAP therapy.',
    faqItems: [
      {
        question: 'What is flow limitation and why does my AHI miss it?',
        answer: 'Flow limitation is partial airway narrowing that restricts airflow during inspiration without causing a complete collapse. AHI only counts apneas (complete stops) and hypopneas (significant reductions with oxygen drops). Flow limitation falls below these thresholds, so AHI stays low while your airway is still significantly narrowed.',
      },
      {
        question: 'What causes flow limitation on PAP therapy?',
        answer: 'Common causes include: pressure set too low (the most common cause), EPR (Expiratory Pressure Relief) set too high, sleeping on your back (supine position increases gravitational airway collapse), and significant mask leak that reduces effective pressure delivery.',
      },
      {
        question: 'How do I detect flow limitation in my CPAP data?',
        answer: 'Your ResMed SD card contains detailed flow waveforms that can be analysed for flow limitation patterns. Key metrics include the Glasgow Index (breath shape score), NED (Negative Effort Dependence), Flatness Index, and estimated RERA count. Tools like AirwayLab compute these automatically from your SD card data.',
      },
    ],
  },
  {
    slug: 'beyond-ahi',
    title: 'Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You',
    description:
      'The Apnea-Hypopnea Index has been the gold standard for decades. But a growing body of research shows it misses critical breathing events. Here\'s what you should be tracking instead.',
    date: '2026-02-20',
    readTime: '10 min read',
    tags: ['AHI', 'Sleep Metrics', 'Research'],
    ogDescription:
      'AHI is the most commonly used metric in sleep medicine, but research shows it misses important breathing patterns. Discover what metrics actually matter.',
    faqItems: [
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
    description:
      'Every night, your PAP machine collects intimate health data. Where does it go? Who can see it? And what are your rights? A look at privacy in the age of connected sleep devices.',
    date: '2026-02-05',
    readTime: '7 min read',
    tags: ['Privacy', 'Data Rights', 'ResMed'],
    ogDescription:
      'Your PAP device collects detailed health data every night. Learn who has access to it, what your rights are, and how to take control of your sleep data.',
    faqItems: [
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
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllSlugs(): string[] {
  return blogPosts.map((p) => p.slug);
}
