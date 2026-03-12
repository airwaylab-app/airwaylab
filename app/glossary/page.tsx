import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, BookOpen } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Sleep Apnea & PAP Therapy Glossary | AirwayLab',
  description:
    'Definitions of sleep-disordered breathing terms, PAP therapy concepts, and AirwayLab analysis metrics. From AHI to UARS, explained for PAP users.',
  keywords: [
    'sleep apnea glossary',
    'PAP therapy terms',
    'CPAP glossary',
    'flow limitation definition',
    'AHI definition',
    'RERA definition',
    'UARS definition',
    'Glasgow Index',
    'NED sleep',
    'ODI definition',
  ],
  openGraph: {
    title: 'Sleep Apnea & PAP Therapy Glossary | AirwayLab',
    description:
      'Definitions of sleep-disordered breathing terms, PAP therapy concepts, and AirwayLab analysis metrics. From AHI to UARS, explained for PAP users.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/glossary',
  },
};

/* ------------------------------------------------------------------ */
/*  Types & data                                                      */
/* ------------------------------------------------------------------ */

type GlossaryCategory =
  | 'sleep-disordered-breathing'
  | 'airwaylab-metrics'
  | 'pap-therapy'
  | 'data-analysis';

type GlossaryTerm = {
  id: string;
  term: string;
  category: GlossaryCategory;
  definition: string;
  link?: string;
};

const CATEGORY_STYLES: Record<
  GlossaryCategory,
  { label: string; className: string }
> = {
  'sleep-disordered-breathing': {
    label: 'Sleep-Disordered Breathing',
    className: 'bg-blue-500/10 text-blue-400',
  },
  'airwaylab-metrics': {
    label: 'AirwayLab Metrics',
    className: 'bg-emerald-500/10 text-emerald-400',
  },
  'pap-therapy': {
    label: 'PAP Therapy',
    className: 'bg-amber-500/10 text-amber-400',
  },
  'data-analysis': {
    label: 'Data & Analysis',
    className: 'bg-purple-500/10 text-purple-400',
  },
};

const GLOSSARY_TERMS: GlossaryTerm[] = [
  // ---- Sleep-Disordered Breathing ----
  {
    id: 'ahi',
    term: 'AHI (Apnea-Hypopnea Index)',
    category: 'sleep-disordered-breathing',
    definition:
      'The number of apneas and hypopneas per hour of sleep. AHI is the most widely used measure of sleep apnea severity, but it only counts complete or near-complete airflow reductions. Significant flow limitation and RERAs are not included in AHI, which is why a \u201cnormal\u201d AHI does not necessarily mean effective therapy. Severity scale: normal < 5/hr, mild 5\u201315/hr, moderate 15\u201330/hr, severe > 30/hr.',
  },
  {
    id: 'apnea',
    term: 'Apnea (Obstructive, Central, Mixed)',
    category: 'sleep-disordered-breathing',
    definition:
      'A complete or near-complete cessation of airflow lasting at least 10 seconds. Obstructive apneas occur when the airway physically collapses despite continued respiratory effort. Central apneas occur when the brain temporarily stops sending signals to breathe. Mixed apneas begin as central and become obstructive. PAP machines report these as separate event types.',
  },
  {
    id: 'arousal',
    term: 'Arousal / Cortical Arousal / Respiratory Arousal',
    category: 'sleep-disordered-breathing',
    definition:
      'A brief shift in brain wave activity lasting at least 3 seconds, indicating a partial awakening from sleep. Respiratory arousals are triggered by breathing events (apneas, hypopneas, RERAs, or flow limitation). True arousals can only be measured by EEG. AirwayLab estimates arousal-like events from respiratory pattern changes (sudden increases in respiratory rate or tidal volume) as the Estimated Arousal Index (EAI).',
  },
  {
    id: 'flow-limitation',
    term: 'Flow Limitation / Inspiratory Flow Limitation (IFL)',
    category: 'sleep-disordered-breathing',
    definition:
      'Partial narrowing of the upper airway during inspiration that restricts airflow without causing a complete collapse. On a flow waveform, flow limitation appears as a flattened inspiratory peak rather than the normal rounded shape. It is the core phenomenon that AirwayLab analyses. Flow limitation can cause sleep fragmentation and symptoms even when AHI is normal, because the increased respiratory effort triggers micro-arousals or activates the body\u2019s stress response.',
    link: '/about/flow-limitation',
  },
  {
    id: 'hypopnea',
    term: 'Hypopnea',
    category: 'sleep-disordered-breathing',
    definition:
      'A partial reduction in airflow (at least 30% reduction from baseline) lasting at least 10 seconds, associated with either an oxygen desaturation of 3\u20134% or a cortical arousal. Hypopneas represent partial airway obstruction \u2014 more common than complete apneas in most people on PAP therapy. AirwayLab detects hypopneas from flow amplitude drops when EVE.edf event files are not available.',
    link: '/about',
  },
  {
    id: 'rera',
    term: 'RERA (Respiratory Effort-Related Arousal)',
    category: 'sleep-disordered-breathing',
    definition:
      'A sequence of breaths showing increasing respiratory effort (flow limitation) that does not meet the criteria for apnea or hypopnea, but terminates in a cortical arousal. RERAs are a hallmark of Upper Airway Resistance Syndrome (UARS). They are not counted in standard AHI but can significantly fragment sleep. AirwayLab\u2019s NED engine detects RERA-like events by identifying sequences of flow-limited breaths terminated by a recovery breath.',
    link: '/about',
  },
  {
    id: 'uars',
    term: 'UARS (Upper Airway Resistance Syndrome)',
    category: 'sleep-disordered-breathing',
    definition:
      'A condition where the airway is narrowed enough to increase respiratory effort and cause arousals, but not enough to produce apneas or hypopneas that register on standard testing. People with UARS often have a normal or near-normal AHI but experience significant daytime symptoms \u2014 fatigue, unrefreshing sleep, morning headaches. Flow limitation analysis (Glasgow Index, FL Score, NED) is the primary tool for identifying UARS on PAP therapy.',
    link: '/about/flow-limitation',
  },

  // ---- AirwayLab Metrics ----
  {
    id: 'amplitude-cv',
    term: 'Amplitude CV (Coefficient of Variation)',
    category: 'airwaylab-metrics',
    definition:
      'Computed by dividing the night into 5-minute epochs and measuring the coefficient of variation (standard deviation / mean) of peak inspiratory flow within each epoch. Normal tidal breathing has approximately 15\u201320% CV. Higher values indicate the airway is intermittently compromising \u2014 even if individual breath shapes look normal by NED. Below 20% is normal, 20\u201330% borderline, above 30% elevated.',
  },
  {
    id: 'brief-obstruction-index',
    term: 'Brief Obstruction Index',
    category: 'airwaylab-metrics',
    definition:
      'Detected by tracking peak inspiratory flow (Qpeak) against a rolling 30-breath median baseline. When Qpeak drops more than 40% from baseline for just 1\u20132 breaths, it counts as a brief obstruction \u2014 too short for standard hypopnea scoring (which requires 10+ seconds) but representing a momentary airway collapse. Below 3/hr is normal, 3\u20136/hr borderline, above 6/hr elevated.',
  },
  {
    id: 'combined-fl',
    term: 'Combined FL Percentage',
    category: 'airwaylab-metrics',
    definition:
      'The percentage of breaths classified as flow-limited by either NED (\u226534%) or Flatness Index (\u22650.85). Combines both detection methods to catch obstruction that either method alone might miss. Below 20% indicates well-controlled therapy, 20\u201340% is borderline, above 40% suggests significant residual flow limitation.',
  },
  {
    id: 'eai',
    term: 'EAI (Estimated Arousal Index)',
    category: 'airwaylab-metrics',
    definition:
      'An estimate of cortical arousals per hour based on respiratory pattern changes. AirwayLab detects arousals by identifying sudden spikes in respiratory rate (>20% above a 120-second rolling baseline) or tidal volume (>30% above baseline). Each spike suggests a micro-awakening where the brain briefly wakes, takes a few deeper or faster breaths, then returns to sleep. A 15-second refractory period prevents double-counting. EAI below 5/hr is considered good, 5\u201310/hr borderline, above 10/hr suggests significant sleep fragmentation. Note: true arousals require EEG measurement; this is a flow-based estimate.',
    link: '/about',
  },
  {
    id: 'fl-score',
    term: 'FL Score (Flow Limitation Score)',
    category: 'airwaylab-metrics',
    definition:
      'A population-level metric from the WAT engine that measures how much tidal volume variance is concentrated at the flow peaks across all breaths. In normal breathing, variance is distributed across the full waveform. In flow-limited breathing, the airflow hits a ceiling (flat-topped pattern), concentrating variance at the peaks. Reported as a percentage: an FL Score of 60 means 60% of breath windows showed significant flow limitation. Scores below 30 are considered good, 30\u201350 borderline, above 50 indicates significant flow limitation.',
    link: '/about',
  },
  {
    id: 'flatness-index',
    term: 'Flatness Index',
    category: 'airwaylab-metrics',
    definition:
      'The ratio of mean inspiratory flow to peak inspiratory flow for a single breath. A perfectly rectangular (completely flow-limited) breath would have a Flatness Index of 1.0. A normal rounded breath typically has a Flatness Index around 0.65\u20130.75. Values of 0.85 or above indicate significant flow limitation \u2014 the inspiratory flow plateau is essentially flat, meaning the airway is acting as a fixed-resistance bottleneck.',
  },
  {
    id: 'glasgow-index',
    term: 'Glasgow Index',
    category: 'airwaylab-metrics',
    definition:
      'A composite flow limitation score computed per breath across 9 shape characteristics: skewness, spikiness, flat-top pattern, top-heaviness, multi-peak pattern, no-pause pattern, inspiratory rate variability, multi-breath pattern, and variable amplitude. Each component is scored 0\u20131 based on the proportion of breaths exhibiting that characteristic. The overall Glasgow Index sums 8 components (Top Heavy is computed but excluded from the total), yielding a 0\u20138 scale where lower is better. Scores below 1.0 indicate well-controlled therapy, 1.0\u20132.0 is borderline, and above 2.0 suggests significant flow limitation. Originally developed by DaveSkvn (GPL-3.0).',
    link: '/about/glasgow-index',
  },
  {
    id: 'hr-surge',
    term: 'HR Surge',
    category: 'airwaylab-metrics',
    definition:
      'A sudden increase in heart rate following a respiratory event, detected by AirwayLab\u2019s oximetry pipeline. Clinical surges are measured against a 30-second baseline at thresholds of 8, 10, 12, and 15 bpm. Rolling mean surges use a 5-minute baseline with a 5-second sustain requirement. HR surges often accompany oxygen desaturations \u2014 when both occur within 30 seconds, they are counted as coupled events, strongly suggesting a respiratory arousal. Requires oximetry data.',
    link: '/about/oximetry-analysis',
  },
  {
    id: 'm-shape',
    term: 'M-shape (Breath Pattern)',
    category: 'airwaylab-metrics',
    definition:
      'A characteristic inspiratory flow pattern where the flow waveform shows two peaks with a dip in between, resembling the letter M. The mid-inspiratory dip (valley below 80% of peak flow in the middle 50% of inspiration) suggests upper airway oscillation or instability during the breath. M-shaped breaths are a specific marker of dynamic upper airway obstruction and are tracked separately from general flow limitation.',
  },
  {
    id: 'ned',
    term: 'NED (Negative Effort Dependence)',
    category: 'airwaylab-metrics',
    definition:
      'A per-breath measure of flow limitation calculated as (Qpeak \u2212 Qmid) / Qpeak \u00d7 100, where Qpeak is peak inspiratory flow and Qmid is flow at the midpoint of inspiration. When the airway narrows during inhalation, mid-inspiratory flow drops below peak flow, producing a higher NED value. NED mean below 15% indicates well-controlled breathing, 15\u201325% is borderline, above 25% suggests significant flow limitation. The NED engine also detects RERA events, M-shaped breaths, and computes the Flatness Index.',
    link: '/about',
  },
  {
    id: 'odi',
    term: 'ODI-3 / ODI-4 (Oxygen Desaturation Index)',
    category: 'airwaylab-metrics',
    definition:
      'The number of times per hour that blood oxygen (SpO\u2082) drops by 3% (ODI-3) or 4% (ODI-4) from a 2-minute rolling baseline. Each drop is a desaturation event, indicating a breathing disruption that affected oxygen levels. ODI-3 below 5/hr is normal, 5\u201315/hr is moderate, above 15/hr is elevated. ODI-4 uses a stricter threshold and is typically lower. Requires oximetry data from a compatible pulse oximeter (Viatom/Checkme O2 Max).',
    link: '/about/oximetry-analysis',
  },
  {
    id: 'periodicity-index',
    term: 'Periodicity Index',
    category: 'airwaylab-metrics',
    definition:
      'Computed by applying FFT (Fast Fourier Transform) spectral analysis to minute ventilation, looking for power concentrated in the 0.01\u20130.03 Hz frequency band. This band corresponds to breathing cycles of 30\u2013100 seconds, characteristic of periodic breathing or Cheyne-Stokes respiration. A high Periodicity Index suggests cyclical breathing patterns where ventilation waxes and wanes regularly \u2014 a pattern associated with central sleep apnea, heart failure, or high-altitude breathing. Scores below 20 are normal, above 40 warrants clinical discussion.',
  },
  {
    id: 'regularity-score',
    term: 'Regularity Score (Sample Entropy)',
    category: 'airwaylab-metrics',
    definition:
      'A measure of breathing pattern regularity computed using Sample Entropy (SampEn) on minute ventilation data. On PAP therapy, highly regular (low-entropy, repetitive) breathing often indicates a persistently narrowed airway forcing uniform restricted breaths. Lower Regularity Scores reflect healthy natural breath-to-breath variability. Scores below 30 indicate good variability, 30\u201350 is borderline, above 50 suggests overly regular breathing patterns consistent with sustained flow limitation.',
  },

  // ---- PAP Therapy ----
  {
    id: 'apap',
    term: 'APAP (Automatic Positive Airway Pressure)',
    category: 'pap-therapy',
    definition:
      'A PAP device that automatically adjusts pressure within a set range based on detected breathing events. Also called AutoSet (ResMed) or Auto-CPAP. APAP increases pressure when it detects flow limitation or apneas and decreases pressure when breathing is stable. The min/max pressure range is set by the clinician. Most ResMed AirSense 10/11 devices operate in APAP mode by default.',
  },
  {
    id: 'asv',
    term: 'ASV (Adaptive Servo-Ventilation)',
    category: 'pap-therapy',
    definition:
      'A specialised PAP mode designed for complex or treatment-emergent central sleep apnea. ASV monitors breathing patterns and provides variable pressure support \u2014 increasing support when breathing weakens and decreasing support when breathing is stable. It aims to stabilise breathing without over-ventilating. Contraindicated in patients with certain types of heart failure.',
  },
  {
    id: 'bipap',
    term: 'BiPAP / VPAP (Bilevel Positive Airway Pressure)',
    category: 'pap-therapy',
    definition:
      'A PAP device that provides two different pressures: a higher pressure during inspiration (IPAP) and a lower pressure during expiration (EPAP). The difference between IPAP and EPAP is called pressure support. BiPAP is used when CPAP alone cannot resolve flow limitation, when higher pressures are needed for comfort, or when ventilatory support is required. ResMed calls their bilevel devices VPAP.',
  },
  {
    id: 'cpap',
    term: 'CPAP (Continuous Positive Airway Pressure)',
    category: 'pap-therapy',
    definition:
      'A therapy device that delivers a single fixed air pressure through a mask to keep the upper airway open during sleep. The pressure acts as a pneumatic splint, preventing the airway from collapsing. CPAP is the first-line treatment for obstructive sleep apnea. The prescribed pressure is typically determined by a titration study.',
  },
  {
    id: 'epr',
    term: 'EPR (Expiratory Pressure Relief)',
    category: 'pap-therapy',
    definition:
      'A ResMed comfort feature that reduces pressure during exhalation by 1, 2, or 3 cmH\u2082O below the therapeutic pressure. Makes breathing out against positive pressure feel more natural. EPR settings can affect flow limitation analysis: higher EPR means more pressure drop during the transition from expiration to inspiration, which can sometimes allow the airway to narrow. Available in settings 0 (off), 1, 2, or 3.',
  },
  {
    id: 'leak-rate',
    term: 'Leak Rate',
    category: 'pap-therapy',
    definition:
      'The amount of air escaping from the PAP mask seal, measured in litres per minute (L/min). Some intentional leak is built into every mask (the exhalation port). Unintentional leak occurs when the mask does not seal properly. Excessive leak (typically above 24 L/min on ResMed devices) can compromise therapy effectiveness because the machine cannot maintain the prescribed pressure, and can render flow waveform data unreliable for analysis.',
  },
  {
    id: 'pressure-support',
    term: 'Pressure Support',
    category: 'pap-therapy',
    definition:
      'The difference between inspiratory pressure (IPAP) and expiratory pressure (EPAP) on a bilevel device. For example, if IPAP is 14 cmH\u2082O and EPAP is 10 cmH\u2082O, pressure support is 4 cmH\u2082O. Higher pressure support provides more assistance during inhalation, which can help overcome upper airway resistance and reduce flow limitation. Typical range is 2\u20136 cmH\u2082O.',
  },
  {
    id: 'titration',
    term: 'Titration',
    category: 'pap-therapy',
    definition:
      'The process of determining the optimal PAP pressure for a patient. In-lab titration involves a sleep study where a technician adjusts pressure throughout the night based on observed breathing events. Auto-titration uses an APAP device to self-adjust over several nights. The goal is to find the lowest pressure that eliminates apneas, hypopneas, and flow limitation while maintaining comfort.',
  },

  // ---- Data & Analysis ----
  {
    id: 'brp-edf',
    term: 'BRP.edf',
    category: 'data-analysis',
    definition:
      'The EDF file on a ResMed SD card that contains the flow waveform data. BRP stands for Breathing Parameters. This is the primary file AirwayLab analyses \u2014 it contains the raw inspiratory and expiratory flow signal at the device\u2019s sampling rate (typically 25 Hz for AirSense 10). Located in the DATALOG folder, with one file per recording session.',
  },
  {
    id: 'edf',
    term: 'EDF (European Data Format)',
    category: 'data-analysis',
    definition:
      'A standardised file format for storing multichannel time-series data, widely used for physiological signals including sleep studies. ResMed PAP machines store detailed breath-by-breath flow waveform data in EDF files on the SD card. Each EDF file contains a header with signal metadata (sampling rate, channels, calibration) followed by binary data records. AirwayLab parses EDF files entirely in the browser.',
  },
  {
    id: 'eve-edf',
    term: 'EVE.edf',
    category: 'data-analysis',
    definition:
      'The EDF file on a ResMed SD card that contains machine-scored respiratory events (apneas, hypopneas, flow limitation flags). When present, AirwayLab uses the machine\u2019s own event counts for hypopnea reporting rather than its own detection algorithm, since the machine has access to internal algorithms that cannot be replicated from flow data alone.',
  },
  {
    id: 'h1-h2-split',
    term: 'H1/H2 Split',
    category: 'data-analysis',
    definition:
      'A division of the night\u2019s data into two equal halves \u2014 first half (H1) and second half (H2) \u2014 at the midpoint of the recording. AirwayLab reports separate metrics for each half to reveal patterns related to sleep position, REM sleep (which increases in the second half of the night), or progressive airway changes. The split point is the midpoint of the concatenated data, not midnight.',
  },
  {
    id: 'oscar',
    term: 'OSCAR (Open Source CPAP Analysis Reporter)',
    category: 'data-analysis',
    definition:
      'A free, open-source desktop application for reviewing PAP therapy data. OSCAR provides detailed session-by-session waveform browsing with interactive zoom and event marking. AirwayLab complements OSCAR by providing automated flow limitation analysis (Glasgow Index, WAT, NED) that OSCAR does not compute. Many PAP users benefit from using both tools together.',
  },
  {
    id: 'sampling-rate',
    term: 'Sampling Rate',
    category: 'data-analysis',
    definition:
      'The number of data points recorded per second for a signal, measured in Hertz (Hz). ResMed AirSense 10 devices typically record flow data at 25 Hz (25 samples per second). Higher sampling rates provide more detail but larger file sizes. AirwayLab reads the sampling rate from the EDF header \u2014 it is never hardcoded, because different devices and signal types may use different rates.',
  },
  {
    id: 'str-edf',
    term: 'STR.edf',
    category: 'data-analysis',
    definition:
      'The EDF file on a ResMed SD card that contains machine settings and summary statistics. STR stands for Statistics. AirwayLab reads STR.edf to extract therapy pressure, mode, EPR setting, leak data, and machine-reported AHI for each session. This provides context for the flow limitation analysis.',
  },
  {
    id: 'traffic-light-system',
    term: 'Traffic Light System',
    category: 'data-analysis',
    definition:
      'AirwayLab\u2019s colour-coded severity indicator for metrics. Green (emerald) indicates values in the healthy range, amber indicates borderline values worth monitoring, and red indicates elevated values that may warrant clinical discussion. Thresholds are defined per metric based on clinical literature and community consensus. The traffic light colour appears on metric cards and trend charts throughout the dashboard.',
    link: '/analyze',
  },
];

/* ------------------------------------------------------------------ */
/*  JSON-LD structured data                                           */
/* ------------------------------------------------------------------ */

const glossaryJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  name: 'Sleep Apnea & PAP Therapy Glossary',
  description:
    'Definitions of sleep-disordered breathing terms, PAP therapy concepts, and AirwayLab analysis metrics.',
  url: 'https://airwaylab.app/glossary',
  hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
    '@type': 'DefinedTerm',
    name: t.term,
    description: t.definition,
    url: `https://airwaylab.app/glossary#${t.id}`,
  })),
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://airwaylab.app',
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: 'Glossary',
      item: 'https://airwaylab.app/glossary',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const sorted = [...GLOSSARY_TERMS].sort((a, b) =>
  a.term.localeCompare(b.term)
);

const termsByLetter = sorted.reduce<Record<string, GlossaryTerm[]>>(
  (acc, term) => {
    const letter = term.term.charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(term);
    return acc;
  },
  {}
);

const activeLetters = new Set(Object.keys(termsByLetter));
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function GlossaryPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(glossaryJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Glossary
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Definitions of sleep medicine terms, PAP therapy concepts, and the
          metrics used throughout AirwayLab.
        </p>
      </div>

      {/* A-Z Quick Nav */}
      <nav
        aria-label="Glossary alphabet navigation"
        className="sticky top-16 z-10 -mx-4 mb-8 bg-background/80 px-4 py-3 backdrop-blur-xl"
      >
        <div className="flex flex-wrap gap-1">
          {alphabet.map((letter) =>
            activeLetters.has(letter) ? (
              <a
                key={letter}
                href={`#${letter.toLowerCase()}`}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label={`Jump to letter ${letter}`}
              >
                {letter}
              </a>
            ) : (
              <span
                key={letter}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold text-muted-foreground/30"
                aria-hidden="true"
              >
                {letter}
              </span>
            )
          )}
        </div>
      </nav>

      {/* Terms by letter */}
      <div className="flex flex-col gap-10">
        {alphabet
          .filter((letter) => activeLetters.has(letter))
          .map((letter) => (
            <section key={letter} id={letter.toLowerCase()}>
              <h2 className="mb-4 border-b border-border/50 pb-2 text-lg font-bold tracking-tight">
                {letter}
              </h2>
              <div className="flex flex-col gap-6">
                {termsByLetter[letter].map((term) => (
                  <div key={term.id} id={term.id} className="scroll-mt-28">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground">
                        {term.term}
                      </h3>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${CATEGORY_STYLES[term.category].className}`}
                      >
                        {CATEGORY_STYLES[term.category].label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {term.definition}
                    </p>
                    {term.link && (
                      <Link
                        href={term.link}
                        className="mt-1.5 inline-flex items-center gap-1 text-xs text-primary transition-colors hover:text-primary/80"
                      >
                        See in AirwayLab{' '}
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
      </div>

      {/* Medical Disclaimer */}
      <section className="mt-12 mb-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Medical Disclaimer
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AirwayLab is not a medical device and is not FDA-cleared or
            CE-marked. It is provided for educational and informational purposes
            only. The analysis results should not be used as a substitute for
            professional medical advice, diagnosis, or treatment. Always consult
            qualified healthcare providers regarding your sleep therapy and any
            changes to PAP settings.
          </p>
        </div>
      </section>
    </div>
  );
}
