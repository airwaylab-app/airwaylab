/* ------------------------------------------------------------------ */
/*  Glossary data — rich content for individual term pages             */
/*  Used by /glossary (hub) and /glossary/[term] (individual pages)    */
/* ------------------------------------------------------------------ */

export type GlossaryCategory =
  | 'sleep-disordered-breathing'
  | 'airwaylab-metrics'
  | 'pap-therapy'
  | 'data-analysis'
  | 'oximetry';

export type NormalRange = {
  label: string;
  range: string;
  color: 'emerald' | 'amber' | 'red';
};

export type FAQItem = {
  question: string;
  answer: string;
};

export type GlossaryTerm = {
  slug: string;
  title: string;
  shortDescription: string;
  fullDescription: string;
  normalRanges: NormalRange[] | null;
  howAirwayLabMeasures: string | null;
  relatedTerms: string[];
  relatedBlogPosts: { slug: string; title: string }[];
  faqItems: FAQItem[];
  category: GlossaryCategory;
};

export const CATEGORY_STYLES: Record<
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
  oximetry: {
    label: 'Oximetry',
    className: 'bg-rose-500/10 text-rose-400',
  },
};

export const GLOSSARY_TERMS: GlossaryTerm[] = [
  /* ================================================================ */
  /*  CORE METRICS                                                    */
  /* ================================================================ */
  {
    slug: 'ahi',
    title: 'AHI (Apnea-Hypopnea Index)',
    shortDescription:
      'The number of apneas and hypopneas per hour of sleep. The most widely used measure of sleep apnea severity, but it misses flow limitation and RERAs.',
    fullDescription:
      'The Apnea-Hypopnea Index (AHI) counts the number of complete airflow cessations (apneas) and significant airflow reductions (hypopneas) per hour of sleep. It has been the primary metric in sleep medicine for decades, with severity categorised as: normal (fewer than 5 events per hour), mild (5 to 15), moderate (15 to 30), and severe (above 30).\n\nHowever, AHI has significant limitations. It treats all events equally regardless of duration or oxygen impact. A 10-second apnea counts the same as a 60-second one. More importantly, AHI completely misses flow limitation and RERAs (Respiratory Effort-Related Arousals), which means a person can have an AHI under 5 while still experiencing significant sleep disruption from partial airway narrowing.\n\nThis is why many CPAP users with a "normal" AHI still feel exhausted. Their machine reports success, but the breathing restrictions that actually fragment their sleep go undetected by this single number. AirwayLab exists to fill this gap by analysing the flow waveform data that AHI ignores.',
    normalRanges: [
      { label: 'Normal', range: '< 5 events/hr', color: 'emerald' },
      { label: 'Mild', range: '5-15 events/hr', color: 'amber' },
      { label: 'Moderate to Severe', range: '> 15 events/hr', color: 'red' },
    ],
    howAirwayLabMeasures:
      'AirwayLab reads machine-reported AHI from the STR.edf file on your ResMed SD card. However, AirwayLab is specifically designed to go beyond AHI by computing flow limitation metrics (Glasgow Index, FL Score, NED) that detect the breathing problems AHI misses.',
    relatedTerms: ['rera', 'rdi', 'flow-limitation', 'hypopnea', 'obstructive-sleep-apnea'],
    relatedBlogPosts: [
      { slug: 'beyond-ahi', title: 'Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You' },
      { slug: 'ahi-normal-still-tired', title: 'Your AHI Is Normal But You\'re Still Exhausted' },
    ],
    faqItems: [
      {
        question: 'What is a normal AHI on CPAP therapy?',
        answer:
          'On CPAP therapy, an AHI below 5 events per hour is generally considered well-controlled. However, a normal AHI does not guarantee effective therapy. Flow limitation and RERAs can still fragment sleep without being counted in AHI.',
      },
      {
        question: 'Why am I still tired with a normal AHI?',
        answer:
          'AHI only counts complete or near-complete airflow reductions. Partial airway narrowing (flow limitation) and Respiratory Effort-Related Arousals (RERAs) can disrupt sleep without triggering an AHI event. Tools like AirwayLab analyse flow waveform data to detect these hidden breathing problems.',
      },
      {
        question: 'How is AHI different from RDI?',
        answer:
          'AHI counts only apneas and hypopneas. RDI (Respiratory Disturbance Index) also includes RERAs, making it a more comprehensive measure of breathing disruption. A person with an AHI of 3 might have an RDI of 15 if they have frequent RERAs.',
      },
    ],
    category: 'sleep-disordered-breathing',
  },
  {
    slug: 'glasgow-index',
    title: 'Glasgow Index',
    shortDescription:
      'A composite breath-shape scoring system that evaluates 9 flow limitation characteristics per breath on a 0-9 scale. Lower scores indicate better therapy.',
    fullDescription:
      'The Glasgow Index is a comprehensive breath shape scoring system originally developed by DaveSkvn as an open-source flow limitation analyser (GPL-3.0), ported and validated for AirwayLab. It scores each inspiration across 9 independent shape characteristics: skewness, spikiness, flat-top pattern, top-heaviness, multi-peak pattern, no-pause pattern, inspiratory rate variability, multi-breath pattern, and variable amplitude.\n\nEach component is scored from 0 to 1 based on the proportion of breaths exhibiting that characteristic. The overall Glasgow Index is the sum of all 9 components, yielding a 0-9 scale where lower is better. In practice, typical scores range from 0 to about 3, and scores above 3 are rare, indicating very significant flow limitation problems.\n\nThe Glasgow Index is a holistic breath-shape score. Unlike NED, which specifically measures peak-to-mid flow drops, or FL Score, which detects flat-topped breathing patterns, the Glasgow Index catches many types of waveform abnormality including unusual timing patterns, variable amplitude, and multi-peak breathing. For multi-session nights, AirwayLab uses duration-weighted averaging to combine scores accurately.',
    normalRanges: [
      { label: 'Good', range: '< 1.0', color: 'emerald' },
      { label: 'Borderline', range: '1.0-2.0', color: 'amber' },
      { label: 'Elevated', range: '> 2.0', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The Glasgow Index engine segments each inspiration from the raw 25 Hz flow signal using zero-crossing detection. It then computes 9 shape descriptors per breath and aggregates them into per-component scores (0-1 each) and an overall Glasgow Index (0-9 scale). Multi-session nights use duration-weighted averaging. Results appear on the Glasgow tab in the dashboard with a radar chart showing all 9 components.',
    relatedTerms: ['fl-score', 'ned-mean', 'flow-limitation', 'flatness-index', 'm-shape'],
    relatedBlogPosts: [
      { slug: 'understanding-flow-limitation', title: 'Understanding Flow Limitation: What Your PAP Machine Doesn\'t Tell You' },
      { slug: 'ahi-normal-still-tired', title: 'Your AHI Is Normal But You\'re Still Exhausted' },
    ],
    faqItems: [
      {
        question: 'What is a good Glasgow Index score?',
        answer:
          'A Glasgow Index below 1.0 indicates well-controlled therapy with minimal flow limitation. Scores between 1.0 and 2.0 are borderline and worth monitoring. Scores above 2.0 suggest significant flow limitation that may be worth discussing with your clinician.',
      },
      {
        question: 'Why does my Glasgow Index disagree with my FL Score?',
        answer:
          'Glasgow and FL Score detect flow limitation using different methods. Glasgow scores 9 breath-shape characteristics holistically, while FL Score measures population-level flatness. A high FL Score with low Glasgow can happen when breaths are moderately flat-topped but do not show the specific shape distortions Glasgow targets. Using all three metrics together gives the most complete picture.',
      },
      {
        question: 'What are the 9 Glasgow Index components?',
        answer:
          'The 9 components are: Skew (asymmetry of the inspiratory waveform), Spike (sharp peaks), Flat Top (plateau pattern), Top Heavy (concentration of flow in early inspiration), Multi-Peak (multiple peaks per breath), No Pause (absent expiratory pause), Inspiratory Rate (breathing rate variability), Multi-Breath (inter-breath pattern changes), and Variable Amplitude (inconsistent breath sizes).',
      },
    ],
    category: 'airwaylab-metrics',
  },
  {
    slug: 'fl-score',
    title: 'FL Score (Flow Limitation Score)',
    shortDescription:
      'A population-level metric measuring how much tidal volume variance is concentrated at flow peaks, indicating flat-topped (flow-limited) breathing. Reported as a percentage.',
    fullDescription:
      'The FL Score is computed by the WAT (Wobble Analysis Tool) engine and measures flow limitation at the population level across all breaths in a session. For each breath window, it calculates the ratio of tidal volume variance in the top half of the signal versus the total variance.\n\nIn normal breathing, airflow ramps up smoothly and rounds off naturally, distributing variance across the full waveform. In flow-limited breathing, the airflow hits a ceiling because the airway is partially narrowed, creating a flat-topped pattern where most of the variance is concentrated at the peaks.\n\nA higher FL Score means more of your breaths show this flat-topped pattern. An FL Score of 60 means 60% of breath windows showed significant flow limitation characteristics. Unlike the Glasgow Index (which scores individual breath shapes) or NED (which measures specific peak-to-mid flow drops), FL Score provides a broader population-level view of how much flow limitation is present across your entire session.',
    normalRanges: [
      { label: 'Good', range: '< 30%', color: 'emerald' },
      { label: 'Borderline', range: '30-50%', color: 'amber' },
      { label: 'Elevated', range: '> 50%', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The WAT engine computes FL Score by analysing tidal volume variance ratios across breath windows. It divides each window into upper and lower halves and measures how much variance is concentrated in the top half. Results appear on the Flow Analysis tab alongside Regularity and Periodicity metrics.',
    relatedTerms: ['glasgow-index', 'ned-mean', 'flow-limitation', 'sample-entropy', 'periodicity-index'],
    relatedBlogPosts: [
      { slug: 'understanding-flow-limitation', title: 'Understanding Flow Limitation: What Your PAP Machine Doesn\'t Tell You' },
      { slug: 'ahi-normal-still-tired', title: 'Your AHI Is Normal But You\'re Still Exhausted' },
    ],
    faqItems: [
      {
        question: 'What does an FL Score of 40% mean?',
        answer:
          'An FL Score of 40% means that 40% of the breath windows in your session showed significant flow limitation patterns. The breathing in those windows was flat-topped rather than normally rounded, indicating the airway was partially narrowed. This is in the borderline range and worth discussing with your clinician.',
      },
      {
        question: 'Is FL Score the same as the Glasgow Index?',
        answer:
          'No. FL Score and Glasgow Index are independent metrics that detect flow limitation using different methods. FL Score is a population-level flatness measure from the WAT engine. Glasgow Index scores 9 individual breath-shape characteristics. They often agree but can diverge because they measure different aspects of airway restriction.',
      },
    ],
    category: 'airwaylab-metrics',
  },
  {
    slug: 'ned-mean',
    title: 'NED Mean (Negative Effort Dependence)',
    shortDescription:
      'A per-breath measure of flow limitation calculated as the ratio of peak inspiratory flow to mid-inspiratory flow. Higher values indicate more airway narrowing during inhalation.',
    fullDescription:
      'Negative Effort Dependence (NED) is a per-breath metric that quantifies flow limitation by comparing peak inspiratory flow (Qpeak) to flow at the midpoint of inspiration (Qmid). The formula is NED = (Qpeak - Qmid) / Qpeak x 100. When the airway narrows during inhalation, mid-inspiratory flow drops below peak flow, producing a higher NED value.\n\nThe NED Mean is the average of this ratio across all breaths in the night. It provides a sensitive, specific measure of the classic flow limitation pattern where the airway progressively narrows during each breath. A NED Mean below 15% indicates well-controlled breathing effort, while values above 25% suggest significant airway narrowing.\n\nThe NED engine also computes several related metrics: Flatness Index (mean/peak flow ratio per breath), Tpeak/Ti ratio (time to peak flow as a fraction of inspiratory time), M-shape detection (identifying breaths with characteristic mid-inspiratory dips), and automated RERA detection (sequences of flow-limited breaths terminated by recovery breaths). Together, these provide a comprehensive per-breath analysis of airway resistance.',
    normalRanges: [
      { label: 'Good', range: '< 15%', color: 'emerald' },
      { label: 'Borderline', range: '15-25%', color: 'amber' },
      { label: 'Elevated', range: '> 25%', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The NED engine analyses every breath in the flow waveform, computing Qpeak and Qmid for each inspiration. The NED Mean, plus per-breath Flatness Index, M-shape percentage, RERA count, and H1/H2 splits are displayed on the NED Analysis tab in the dashboard.',
    relatedTerms: ['flatness-index', 'glasgow-index', 'fl-score', 'rera', 'm-shape', 'eai'],
    relatedBlogPosts: [
      { slug: 'understanding-flow-limitation', title: 'Understanding Flow Limitation: What Your PAP Machine Doesn\'t Tell You' },
      { slug: 'hidden-respiratory-events', title: 'The Hidden Respiratory Events Your Flow Data Isn\'t Showing You' },
    ],
    faqItems: [
      {
        question: 'What does a NED Mean of 20% indicate?',
        answer:
          'A NED Mean of 20% means that on average across all breaths, mid-inspiratory flow was 20% lower than peak flow. This indicates moderate airway narrowing during inhalation. It falls in the borderline range and suggests some residual flow limitation that may benefit from therapy adjustments.',
      },
      {
        question: 'How is NED different from the Flatness Index?',
        answer:
          'NED measures the specific ratio of peak flow to mid-inspiratory flow, capturing the classic flow limitation drop. Flatness Index measures the overall ratio of mean flow to peak flow, detecting how rectangular (flat-topped) the breath is. A breath can have high Flatness Index (very flat) but low NED if the flatness is uniform, and vice versa. Both are computed by the same NED engine.',
      },
    ],
    category: 'airwaylab-metrics',
  },
  {
    slug: 'flatness-index',
    title: 'Flatness Index',
    shortDescription:
      'The ratio of mean inspiratory flow to peak inspiratory flow per breath. Values of 0.85 or above indicate significant flow limitation with a flat-topped breath pattern.',
    fullDescription:
      'The Flatness Index measures how rectangular (flat-topped) each inspiratory breath is by computing the ratio of mean flow to peak flow. A perfectly rectangular breath, representing complete flow limitation where the airway acts as a fixed-resistance bottleneck, would have a Flatness Index of 1.0. A normal rounded breath typically has a Flatness Index around 0.65 to 0.75.\n\nWhen the Flatness Index reaches 0.85 or above, it indicates significant flow limitation. The inspiratory flow plateau is essentially flat, meaning airflow cannot increase further despite continued respiratory effort. The airway has become a flow-limiting orifice.\n\nThe Flatness Index complements NED by detecting a different aspect of flow limitation. NED specifically measures the peak-to-mid flow drop (progressive narrowing during inspiration), while Flatness Index measures overall breath rectangularity. A breath can be very flat (high FI) without much NED if the flow plateau is consistent throughout inspiration. AirwayLab uses both metrics together with the Glasgow Index and FL Score to provide the most complete assessment of airway restriction.',
    normalRanges: [
      { label: 'Normal', range: '< 0.75', color: 'emerald' },
      { label: 'Borderline', range: '0.75-0.85', color: 'amber' },
      { label: 'Flow-Limited', range: '> 0.85', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The NED engine computes Flatness Index for every breath in the flow waveform as mean inspiratory flow divided by peak inspiratory flow. It is reported as part of the NED Analysis tab, and breaths with FI above 0.85 are counted towards the Combined FL Percentage.',
    relatedTerms: ['ned-mean', 'fl-score', 'flow-limitation', 'combined-fl-percentage'],
    relatedBlogPosts: [
      { slug: 'understanding-flow-limitation', title: 'Understanding Flow Limitation: What Your PAP Machine Doesn\'t Tell You' },
    ],
    faqItems: [
      {
        question: 'What does a high Flatness Index mean?',
        answer:
          'A Flatness Index above 0.85 means the inspiratory flow waveform is nearly rectangular. During inspiration, airflow quickly rises to a plateau and stays flat, indicating the airway is acting as a fixed-resistance bottleneck. This is a clear sign of flow limitation.',
      },
      {
        question: 'How is the Flatness Index different from NED?',
        answer:
          'Flatness Index measures overall breath rectangularity (mean flow divided by peak flow). NED measures the specific drop from peak to mid-inspiratory flow. A breath can be flat (high FI) but have consistent flow throughout (low NED), or vice versa. Both are markers of flow limitation but capture different patterns.',
      },
    ],
    category: 'airwaylab-metrics',
  },
  {
    slug: 'tpeak-ti',
    title: 'Tpeak/Ti Ratio',
    shortDescription:
      'The time to peak inspiratory flow as a fraction of total inspiratory time. A low ratio may indicate early peaking and progressive airway narrowing.',
    fullDescription:
      'The Tpeak/Ti ratio measures where in the inspiratory cycle peak flow occurs, expressed as a fraction of total inspiratory time (Ti). In normal breathing, peak flow typically occurs around 30-40% of the way through inspiration. Values significantly below or above this range can indicate abnormal breathing patterns.\n\nA very low Tpeak/Ti (early peaking) followed by declining flow suggests the airway opens briefly at the start of inspiration but progressively narrows as effort increases. A very high Tpeak/Ti (late peaking) may indicate delayed airway opening or unusual respiratory muscle activation patterns.\n\nImportant caveat: on BiPAP therapy, Tpeak/Ti can be unreliable because the machine-delivered pressure support affects when peak flow occurs. The timing of the pressure transition from EPAP to IPAP interacts with the natural flow pattern, making it difficult to separate airway behaviour from machine behaviour. AirwayLab reports this metric but clinical interpretation should focus primarily on NED and Flatness Index for BiPAP users.',
    normalRanges: [
      { label: 'Normal', range: '0.25-0.45', color: 'emerald' },
      { label: 'Abnormal', range: '< 0.25 or > 0.45', color: 'amber' },
    ],
    howAirwayLabMeasures:
      'The NED engine computes Tpeak/Ti for every breath by finding the time of peak inspiratory flow and dividing by total inspiratory time. The per-breath values are averaged for the night summary. Note: this metric is less reliable on BiPAP therapy due to pressure support interference.',
    relatedTerms: ['ned-mean', 'flatness-index', 'flow-limitation', 'bipap'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'What does Tpeak/Ti tell me about my breathing?',
        answer:
          'Tpeak/Ti shows where in each breath your peak airflow occurs. Normal breathing peaks around 30-40% through inspiration. Early peaking followed by declining flow suggests progressive airway narrowing during the breath.',
      },
      {
        question: 'Why is Tpeak/Ti unreliable on BiPAP?',
        answer:
          'On BiPAP, the machine delivers higher pressure during inspiration (IPAP) and lower pressure during expiration (EPAP). The timing of this pressure transition affects when peak flow occurs, making it hard to separate airway behaviour from machine-driven flow patterns. NED and Flatness Index are more reliable for BiPAP users.',
      },
    ],
    category: 'airwaylab-metrics',
  },
  {
    slug: 'rera',
    title: 'RERA (Respiratory Effort-Related Arousal)',
    shortDescription:
      'A sequence of flow-limited breaths that terminates in a cortical arousal without meeting criteria for apnea or hypopnea. A hallmark of Upper Airway Resistance Syndrome.',
    fullDescription:
      'A Respiratory Effort-Related Arousal (RERA) is a breathing event where respiratory effort increases progressively over a sequence of breaths due to airway narrowing, but the airflow reduction does not meet the criteria for apnea (complete cessation) or hypopnea (significant reduction with oxygen drop). The sequence ends when the brain triggers a brief cortical arousal to restore normal airflow.\n\nRERAs are significant because they fragment sleep without being counted in the standard AHI metric. A person with an AHI of 2 (normal) but a RERA index of 15 per hour is experiencing substantial sleep disruption. RERAs are a hallmark of Upper Airway Resistance Syndrome (UARS), where the airway is narrow enough to increase breathing effort and cause arousals but not narrow enough to produce the apneas and hypopneas that AHI measures.\n\nTrue RERA scoring requires EEG to detect cortical arousals. AirwayLab estimates RERA-like events from the flow waveform by identifying sequences of 3 to 15 consecutive breaths with progressively worsening NED scores, terminated by a recovery breath (sudden NED drop). This provides a useful estimate of respiratory effort arousals from SD card data alone.',
    normalRanges: [
      { label: 'Good', range: '< 5/hr', color: 'emerald' },
      { label: 'Borderline', range: '5-10/hr', color: 'amber' },
      { label: 'Elevated', range: '> 10/hr', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The NED engine detects RERA-like events by finding sequences of 3-15 breaths where NED exceeds 20% or Flatness Index exceeds 0.85, with a rising NED slope terminated by a recovery breath (NED drops below 10%). The estimated RERA index (events per hour) is reported on the NED Analysis tab.',
    relatedTerms: ['ahi', 'rdi', 'uars', 'flow-limitation', 'ned-mean', 'eai'],
    relatedBlogPosts: [
      { slug: 'hidden-respiratory-events', title: 'The Hidden Respiratory Events Your Flow Data Isn\'t Showing You' },
      { slug: 'ahi-normal-still-tired', title: 'Your AHI Is Normal But You\'re Still Exhausted' },
    ],
    faqItems: [
      {
        question: 'Are RERAs included in my AHI score?',
        answer:
          'No. AHI only counts apneas and hypopneas. RERAs are not included in AHI but are included in RDI (Respiratory Disturbance Index). This is why some people have a normal AHI but still experience significant sleep disruption from RERAs.',
      },
      {
        question: 'Can AirwayLab detect real RERAs?',
        answer:
          'AirwayLab detects RERA-like events from flow waveform patterns. True RERA scoring requires EEG to confirm cortical arousals. AirwayLab identifies the characteristic respiratory pattern (progressive flow limitation followed by a recovery breath) that precedes RERAs, providing a useful estimate from SD card data alone.',
      },
    ],
    category: 'sleep-disordered-breathing',
  },
  {
    slug: 'rdi',
    title: 'RDI (Respiratory Disturbance Index)',
    shortDescription:
      'The total number of respiratory events per hour, including apneas, hypopneas, and RERAs. A more comprehensive measure than AHI alone.',
    fullDescription:
      'The Respiratory Disturbance Index (RDI) is a comprehensive measure of breathing disruption that includes all respiratory events: apneas (complete airflow cessation), hypopneas (significant airflow reduction), and RERAs (effort-related arousals). By including RERAs, RDI captures a fuller picture of sleep-disordered breathing than AHI alone.\n\nThe difference between AHI and RDI can be dramatic. A person with an AHI of 3 (normal) might have an RDI of 20 (moderate-severe) if they have frequent RERAs. This distinction is especially important in Upper Airway Resistance Syndrome (UARS), where AHI looks normal but RERAs are fragmenting sleep.\n\nAirwayLab estimates RDI by combining its RERA detection (flow-limited breath sequences terminated by recovery breaths) with hypopnea detection (sustained flow amplitude drops). This estimated RDI provides a more complete picture of breathing disruption than the machine-reported AHI alone, though a full clinical RDI also requires EEG-confirmed arousals.',
    normalRanges: [
      { label: 'Good', range: '< 5/hr', color: 'emerald' },
      { label: 'Borderline', range: '5-15/hr', color: 'amber' },
      { label: 'Elevated', range: '> 15/hr', color: 'red' },
    ],
    howAirwayLabMeasures:
      'AirwayLab estimates RDI by combining detected RERAs (NED engine) with detected hypopneas (flow amplitude drops sustained for 10+ seconds). Apneas cannot be reliably detected from flow data alone, so this estimate is a conservative lower bound. It is most accurate when apneas are rare, as is typical in UARS.',
    relatedTerms: ['ahi', 'rera', 'hypopnea', 'uars', 'eai'],
    relatedBlogPosts: [
      { slug: 'beyond-ahi', title: 'Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You' },
    ],
    faqItems: [
      {
        question: 'What is the difference between AHI and RDI?',
        answer:
          'AHI counts only apneas and hypopneas. RDI counts apneas, hypopneas, and RERAs (Respiratory Effort-Related Arousals). RDI is always equal to or higher than AHI. The gap between them reveals how many breathing disruptions are being missed by the standard AHI metric.',
      },
      {
        question: 'Why does my estimated RDI differ from my in-lab RDI?',
        answer:
          'AirwayLab estimates RDI from flow data alone. In-lab RDI uses EEG to confirm arousals and has access to additional signals. AirwayLab\'s estimate is a conservative lower bound because it cannot detect apneas from flow data and relies on respiratory patterns to estimate arousals that normally require EEG confirmation.',
      },
    ],
    category: 'sleep-disordered-breathing',
  },
  {
    slug: 'eai',
    title: 'EAI (Estimated Arousal Index)',
    shortDescription:
      'An estimate of cortical arousals per hour based on respiratory pattern changes. Detects spikes in respiratory rate and tidal volume that suggest micro-awakenings.',
    fullDescription:
      'The Estimated Arousal Index (EAI) provides an estimate of how many times per hour the brain briefly wakes during sleep, based on breathing pattern changes detected in the flow waveform. True cortical arousals can only be measured with EEG (brain wave monitoring), but the respiratory patterns that accompany arousals can be detected from flow data.\n\nAirwayLab detects arousal-like events by identifying breaths where respiratory rate spikes more than 35% above a 120-second rolling baseline and tidal volume spikes more than 50% above baseline simultaneously, with at least 2 of the preceding 5 breaths showing flow limitation (NED above 20% or Flatness Index above 0.85). A 30-second refractory period prevents double-counting.\n\nImportant context: EAI is a secondary marker. Research from Dr. Avram Gold and others suggests that flow limitation itself drives symptoms via the limbic and HPA axis stress response, independent of arousals. AirwayLab presents EAI alongside primary flow limitation metrics (Glasgow Index, FL Score, NED) because flow limitation may be the more important clinical indicator for understanding symptoms.',
    normalRanges: [
      { label: 'Good', range: '< 5/hr', color: 'emerald' },
      { label: 'Borderline', range: '5-10/hr', color: 'amber' },
      { label: 'Elevated', range: '> 10/hr', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The NED engine computes EAI by scanning for simultaneous spikes in respiratory rate and tidal volume relative to rolling baselines, with a flow-limitation precondition requirement. A 30-second refractory window prevents double-counting. Results appear on the Overview and NED Analysis tabs.',
    relatedTerms: ['rera', 'flow-limitation', 'arousal', 'ned-mean'],
    relatedBlogPosts: [
      { slug: 'arousals-vs-flow-limitation', title: 'Why Flow Limitation May Matter More Than Arousals' },
      { slug: 'what-is-cns-sensitization', title: 'Understanding CNS Sensitization in Sleep-Disordered Breathing' },
    ],
    faqItems: [
      {
        question: 'Is the EAI the same as a clinical arousal index?',
        answer:
          'No. A clinical arousal index requires EEG (brain wave monitoring) to measure cortical arousals directly. EAI is an estimate based on respiratory pattern changes that typically accompany arousals. It provides a useful approximation from SD card data but may read higher or lower than a true EEG-based arousal index.',
      },
      {
        question: 'What does a high EAI mean for my symptoms?',
        answer:
          'A high EAI suggests frequent respiratory-related micro-awakenings. However, research indicates that flow limitation itself may drive symptoms independently of arousals. Check your primary flow limitation metrics (Glasgow Index, FL Score, NED) for the most clinically relevant picture.',
      },
    ],
    category: 'airwaylab-metrics',
  },
  {
    slug: 'odi-3',
    title: 'ODI-3 (Oxygen Desaturation Index, 3%)',
    shortDescription:
      'The number of times per hour blood oxygen drops by 3% or more from a 2-minute rolling baseline. Each drop indicates a breathing disruption that affected oxygen levels.',
    fullDescription:
      'The Oxygen Desaturation Index at 3% threshold (ODI-3) counts the number of times per hour that blood oxygen (SpO2) drops by 3% or more from a 2-minute rolling baseline. Each drop represents a desaturation event, indicating a breathing disruption that was significant enough to reduce oxygen delivery to the blood.\n\nODI-3 is a sensitive measure of respiratory events because even partial airway obstruction that does not meet hypopnea criteria can cause measurable oxygen drops. A person with a low AHI but elevated ODI-3 may have breathing disruptions that are being missed by traditional scoring.\n\nThe 3% threshold captures a broader range of desaturation events than ODI-4 (which requires a 4% drop). This makes ODI-3 more sensitive to subtle breathing disruptions but also means it picks up some events that may be clinically less significant. AirwayLab also computes ODI-4 for comparison, as well as coupled events (where a desaturation occurs alongside a heart rate surge within 30 seconds).',
    normalRanges: [
      { label: 'Normal', range: '< 5/hr', color: 'emerald' },
      { label: 'Moderate', range: '5-15/hr', color: 'amber' },
      { label: 'Elevated', range: '> 15/hr', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The Oximetry Pipeline computes ODI-3 from Viatom/Checkme O2 Max CSV data. It maintains a 2-minute rolling baseline of SpO2 values and counts each drop of 3% or more as a desaturation event. Requires compatible pulse oximetry data uploaded alongside SD card data.',
    relatedTerms: ['odi-4', 'spo2', 'desaturation', 'coupled-events', 'heart-rate-surges'],
    relatedBlogPosts: [
      { slug: 'hidden-respiratory-events', title: 'The Hidden Respiratory Events Your Flow Data Isn\'t Showing You' },
    ],
    faqItems: [
      {
        question: 'Do I need a pulse oximeter for AirwayLab?',
        answer:
          'No. Pulse oximetry data is optional. All four analysis engines work with SD card data alone. The oximetry pipeline activates only when you upload a Viatom/Checkme O2 Max CSV alongside your SD card data. It adds desaturation tracking, heart rate surge detection, and coupled event analysis.',
      },
      {
        question: 'What is the difference between ODI-3 and ODI-4?',
        answer:
          'ODI-3 counts oxygen drops of 3% or more per hour. ODI-4 counts drops of 4% or more. ODI-3 is more sensitive and will always be equal to or higher than ODI-4. ODI-4 uses a stricter threshold, capturing only more significant desaturations.',
      },
    ],
    category: 'oximetry',
  },
  {
    slug: 'odi-4',
    title: 'ODI-4 (Oxygen Desaturation Index, 4%)',
    shortDescription:
      'The number of times per hour blood oxygen drops by 4% or more. Uses a stricter threshold than ODI-3, capturing only more significant oxygen desaturations.',
    fullDescription:
      'The Oxygen Desaturation Index at 4% threshold (ODI-4) counts the number of times per hour that blood oxygen (SpO2) drops by 4% or more from a 2-minute rolling baseline. The 4% threshold is the criterion most commonly used in clinical sleep studies and aligns with the AASM (American Academy of Sleep Medicine) hypopnea scoring criteria.\n\nODI-4 is typically lower than ODI-3 because it requires a larger oxygen drop. This makes it more specific to clinically significant events but less sensitive to subtle desaturations. When ODI-3 is significantly higher than ODI-4, it suggests many events are causing moderate (3-4%) but not severe (4%+) oxygen drops.\n\nIn the context of PAP therapy, an elevated ODI-4 while on treatment warrants clinical attention, as it suggests the current therapy settings are not adequately preventing oxygen desaturation events. AirwayLab reports both ODI-3 and ODI-4 to give a complete picture of desaturation severity.',
    normalRanges: [
      { label: 'Normal', range: '< 3/hr', color: 'emerald' },
      { label: 'Moderate', range: '3-10/hr', color: 'amber' },
      { label: 'Elevated', range: '> 10/hr', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The Oximetry Pipeline computes ODI-4 from Viatom/Checkme O2 Max CSV data using a 2-minute rolling SpO2 baseline. Each drop of 4% or more is counted as a desaturation event. Reported alongside ODI-3 on the Oximetry tab for comparison.',
    relatedTerms: ['odi-3', 'spo2', 'desaturation', 't-below-90'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'Which is more important, ODI-3 or ODI-4?',
        answer:
          'ODI-4 aligns with standard clinical scoring criteria and is the more commonly cited index. ODI-3 is more sensitive and captures subtler desaturations. Both are useful: ODI-4 for comparison with clinical reports, ODI-3 for a more complete picture of breathing disruption.',
      },
    ],
    category: 'oximetry',
  },
  {
    slug: 'sample-entropy',
    title: 'Sample Entropy (Regularity Score)',
    shortDescription:
      'A measure of breathing pattern regularity. On PAP therapy, highly regular breathing often indicates a persistently narrowed airway forcing uniform restricted breaths.',
    fullDescription:
      'Sample Entropy (SampEn) quantifies how predictable and repetitive a time series is. Applied to minute ventilation data from your PAP session, it measures how regular your breathing pattern is throughout the night.\n\nCounterintuitively, very regular breathing on PAP therapy is often a sign of problems, not health. When the airway is persistently narrowed, each breath is forced through the same restricted opening, producing nearly identical breath patterns with low variability. Healthy breathing has natural breath-to-breath variability because the brain constantly adjusts respiratory drive based on chemical feedback.\n\nA high Regularity Score (high Sample Entropy) indicates overly regular, monotonous breathing that may reflect sustained flow limitation. A low score reflects the healthy natural variability expected in well-controlled therapy. This is a WAT engine metric that complements FL Score and Periodicity Index for a complete assessment of ventilation patterns.',
    normalRanges: [
      { label: 'Good variability', range: '< 30', color: 'emerald' },
      { label: 'Borderline', range: '30-50', color: 'amber' },
      { label: 'Overly regular', range: '> 50', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The WAT engine computes Sample Entropy on the minute ventilation time series using standard SampEn parameters (template length m=2, tolerance r=0.2 times the standard deviation). Results appear on the Flow Analysis tab as the Regularity Score.',
    relatedTerms: ['fl-score', 'periodicity-index', 'flow-limitation'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'Why is regular breathing a bad sign on CPAP?',
        answer:
          'Healthy breathing has natural variability because the brain constantly adjusts breathing effort. When the airway is persistently narrowed, each breath is forced through the same restriction, producing monotonously regular breathing. High regularity on PAP therapy often indicates sustained flow limitation.',
      },
    ],
    category: 'airwaylab-metrics',
  },
  {
    slug: 'periodicity-index',
    title: 'Periodicity Index',
    shortDescription:
      'Detects cyclical breathing patterns with 30-100 second cycles using FFT spectral analysis. Elevated values suggest periodic breathing or Cheyne-Stokes respiration.',
    fullDescription:
      'The Periodicity Index is computed by applying Fast Fourier Transform (FFT) spectral analysis to minute ventilation data, looking for power concentrated in the 0.01 to 0.03 Hz frequency band. This band corresponds to breathing cycles of 30 to 100 seconds, which are characteristic of periodic breathing or Cheyne-Stokes respiration.\n\nIn periodic breathing, ventilation waxes and wanes in a regular cyclical pattern. The person breathes progressively deeper, then progressively shallower, sometimes with brief pauses between cycles. This pattern is associated with central sleep apnea, heart failure, high-altitude breathing, and certain neurological conditions.\n\nA high Periodicity Index does not necessarily indicate a specific medical condition but warrants clinical discussion. On PAP therapy, periodic breathing may indicate treatment-emergent central sleep apnea (central events appearing after obstructive events are treated) or inadequate pressure settings. Some ASV (Adaptive Servo-Ventilation) modes are specifically designed to counteract periodic breathing.',
    normalRanges: [
      { label: 'Normal', range: '< 20', color: 'emerald' },
      { label: 'Borderline', range: '20-40', color: 'amber' },
      { label: 'Elevated', range: '> 40', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The WAT engine applies a Cooley-Tukey radix-2 FFT to the minute ventilation time series and measures power in the 0.01-0.03 Hz band. Results appear on the Flow Analysis tab alongside FL Score and Regularity.',
    relatedTerms: ['sample-entropy', 'fl-score', 'central-apnea', 'asv', 'periodic-breathing'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'What does a high Periodicity Index mean?',
        answer:
          'A Periodicity Index above 40 suggests your breathing has a regular cyclical pattern with 30-100 second cycles. This pattern is associated with periodic breathing or Cheyne-Stokes respiration and warrants discussion with your clinician. It may indicate treatment-emergent central sleep apnea or other conditions.',
      },
    ],
    category: 'airwaylab-metrics',
  },
  {
    slug: 'm-shape',
    title: 'M-Shape (Breath Pattern)',
    shortDescription:
      'A characteristic inspiratory flow pattern with two peaks and a mid-inspiratory dip, suggesting upper airway oscillation or dynamic obstruction.',
    fullDescription:
      'An M-shaped breath is a characteristic inspiratory flow pattern where the waveform shows two distinct peaks with a dip in between, resembling the letter M. The mid-inspiratory dip (valley below 80% of peak flow in the middle 50% of inspiration) indicates that the upper airway is oscillating or briefly collapsing and reopening during a single breath.\n\nM-shaped breaths are a specific marker of dynamic upper airway obstruction. Unlike the flat-topped pattern detected by NED and Flatness Index (which indicates steady airway narrowing), M-shapes suggest the airway is unstable, alternating between more and less restricted states within each inspiration.\n\nAirwayLab tracks M-shaped breaths as a percentage of total breaths, reported separately from general flow limitation metrics. A high M-shape percentage, especially combined with elevated NED or Glasgow scores, suggests the airway is not just narrowed but actively oscillating, which may respond differently to therapy adjustments than simple steady-state flow limitation.',
    normalRanges: null,
    howAirwayLabMeasures:
      'The NED engine identifies M-shaped breaths by checking whether any flow valley in the middle 50% of inspiration drops below 80% of peak inspiratory flow. The percentage of M-shaped breaths is reported on the NED Analysis tab.',
    relatedTerms: ['ned-mean', 'flatness-index', 'flow-limitation', 'glasgow-index'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'What causes M-shaped breaths?',
        answer:
          'M-shaped breaths occur when the upper airway briefly narrows or oscillates during inspiration, causing flow to dip before recovering. This pattern suggests dynamic airway instability rather than steady narrowing, and may indicate the airway is on the verge of collapsing during each breath.',
      },
    ],
    category: 'airwaylab-metrics',
  },

  /* ================================================================ */
  /*  CLINICAL CONCEPTS                                               */
  /* ================================================================ */
  {
    slug: 'flow-limitation',
    title: 'Flow Limitation (Inspiratory Flow Limitation)',
    shortDescription:
      'Partial narrowing of the upper airway during inspiration that restricts airflow without complete collapse. The core phenomenon that AirwayLab analyses.',
    fullDescription:
      'Flow limitation is the partial narrowing of the upper airway during inspiration that restricts airflow without causing a complete airway collapse. On a flow waveform, it appears as a flattened inspiratory peak rather than the normal rounded shape. It is the central phenomenon that AirwayLab was built to detect and quantify.\n\nFlow limitation exists on a spectrum between normal breathing and complete obstruction (apnea). While AHI only captures events at the severe end of this spectrum, flow limitation can cause significant sleep disruption at any level. The increased respiratory effort required to breathe through a narrowed airway triggers the body\'s stress response, potentially fragmenting sleep even without full arousals.\n\nResearch from Dr. Avram Gold and others suggests that flow limitation drives symptoms through the limbic and HPA axis stress response, independent of cortical arousals. This explains why many people with a normal AHI and even a low arousal index still experience fatigue, unrefreshing sleep, and other symptoms of sleep-disordered breathing. AirwayLab uses four independent engines (Glasgow Index, WAT, NED, Oximetry) to detect and quantify flow limitation from multiple angles.',
    normalRanges: null,
    howAirwayLabMeasures:
      'AirwayLab detects flow limitation using four independent engines: Glasgow Index (9-component breath shape scoring on a 0-9 scale), WAT FL Score (population-level flatness percentage), NED (per-breath peak-to-mid flow ratio), and Combined FL Percentage (breaths flagged by either NED above 34% or Flatness Index above 0.85). Each engine captures different aspects of airway restriction.',
    relatedTerms: ['glasgow-index', 'fl-score', 'ned-mean', 'flatness-index', 'uars', 'rera'],
    relatedBlogPosts: [
      { slug: 'understanding-flow-limitation', title: 'Understanding Flow Limitation: What Your PAP Machine Doesn\'t Tell You' },
      { slug: 'flow-limitation-and-sleepiness', title: 'Does Flow Limitation Drive Sleepiness?' },
      { slug: 'arousals-vs-flow-limitation', title: 'Why Flow Limitation May Matter More Than Arousals' },
    ],
    faqItems: [
      {
        question: 'What is flow limitation in sleep apnea?',
        answer:
          'Flow limitation is partial narrowing of the upper airway during inspiration that restricts airflow without causing complete collapse. It falls below the threshold for apnea or hypopnea scoring, so it is invisible to AHI. On a flow waveform, it appears as a flattened (flat-topped) inspiratory peak.',
      },
      {
        question: 'Can flow limitation cause symptoms even with a normal AHI?',
        answer:
          'Research has studied the relationship between flow limitation and symptoms like fatigue and unrefreshing sleep. Individual sensitivity to flow limitation varies, and the mechanisms are an active area of research.',
      },
      {
        question: 'How is flow limitation treated?',
        answer:
          'Treatment approaches vary based on the pattern and severity of flow limitation. Your clinician can recommend the right approach based on your complete clinical picture.',
      },
    ],
    category: 'sleep-disordered-breathing',
  },
  {
    slug: 'obstructive-sleep-apnea',
    title: 'Obstructive Sleep Apnea (OSA)',
    shortDescription:
      'A condition where the upper airway repeatedly collapses during sleep, causing breathing pauses. The most common type of sleep apnea, typically treated with PAP therapy.',
    fullDescription:
      'Obstructive Sleep Apnea (OSA) is a sleep disorder where the muscles supporting the upper airway relax during sleep, allowing the soft tissue to collapse and block airflow. Each blockage (apnea) or partial blockage (hypopnea) can last from 10 seconds to over a minute, causing oxygen drops and brief arousals as the brain wakes to restore breathing.\n\nOSA severity is traditionally classified by AHI: mild (5-15 events per hour), moderate (15-30), and severe (above 30). The standard treatment is Positive Airway Pressure (PAP) therapy, which uses air pressure delivered through a mask to splint the airway open during sleep.\n\nHowever, effective treatment goes beyond simply reducing AHI below 5. Residual flow limitation, which falls below the threshold for AHI scoring, can persist even on well-titrated PAP therapy. This is why AirwayLab was created: to detect the flow limitation, RERAs, and breathing instability that standard AHI monitoring misses, giving users and clinicians a more complete picture of therapy effectiveness.',
    normalRanges: null,
    howAirwayLabMeasures: null,
    relatedTerms: ['ahi', 'cpap', 'bipap', 'flow-limitation', 'uars', 'central-apnea'],
    relatedBlogPosts: [
      { slug: 'beyond-ahi', title: 'Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You' },
      { slug: 'how-pap-therapy-works', title: 'How PAP Therapy Actually Works' },
    ],
    faqItems: [
      {
        question: 'What causes obstructive sleep apnea?',
        answer:
          'OSA occurs when the muscles supporting the upper airway (pharynx) relax during sleep, allowing the soft tissue to narrow or collapse. Risk factors include anatomical features (narrow airway, large tonsils, retrognathia), obesity, age, alcohol use, and supine sleeping position.',
      },
      {
        question: 'Can you still have sleep apnea symptoms on CPAP?',
        answer:
          'Yes. Even with CPAP keeping AHI below 5, residual flow limitation can cause fatigue and sleep disruption. This is because AHI only measures complete or near-complete airway obstructions, while partial narrowing (flow limitation) and RERAs continue to fragment sleep.',
      },
    ],
    category: 'sleep-disordered-breathing',
  },
  {
    slug: 'uars',
    title: 'UARS (Upper Airway Resistance Syndrome)',
    shortDescription:
      'A condition where airway narrowing causes sleep fragmentation through increased respiratory effort and RERAs, without producing the apneas or hypopneas that register on standard AHI testing.',
    fullDescription:
      'Upper Airway Resistance Syndrome (UARS) is a condition where the upper airway is narrowed enough to increase respiratory effort and cause sleep-disrupting arousals, but not narrowed enough to produce the apneas or hypopneas that register on standard sleep testing. People with UARS typically have a normal or near-normal AHI but experience significant daytime symptoms including fatigue, unrefreshing sleep, morning headaches, and brain fog.\n\nUARS was first described by Dr. Christian Guilleminault and represents the milder end of the sleep-disordered breathing spectrum. It is characterised by frequent RERAs (Respiratory Effort-Related Arousals) and elevated respiratory effort without the oxygen desaturations typically seen in obstructive sleep apnea.\n\nUARS is notoriously underdiagnosed because standard sleep studies focus on AHI, which looks normal in UARS patients. Flow limitation analysis, using metrics like the Glasgow Index, FL Score, and NED, is the primary tool for identifying UARS on PAP therapy. AirwayLab was partly created to address this diagnostic gap by making flow limitation visible from data that patients already collect.',
    normalRanges: null,
    howAirwayLabMeasures:
      'AirwayLab detects the flow limitation patterns characteristic of UARS using the Glasgow Index (breath shape scoring), FL Score (population-level flatness), NED (per-breath peak-to-mid flow ratio), and RERA detection (sequences of progressively flow-limited breaths). These metrics reveal the breathing disruption that AHI misses in UARS.',
    relatedTerms: ['flow-limitation', 'rera', 'ahi', 'arousal', 'ned-mean', 'glasgow-index'],
    relatedBlogPosts: [
      { slug: 'ahi-normal-still-tired', title: 'Your AHI Is Normal But You\'re Still Exhausted' },
      { slug: 'what-is-cns-sensitization', title: 'Understanding CNS Sensitization in Sleep-Disordered Breathing' },
      { slug: 'arousals-vs-flow-limitation', title: 'Why Flow Limitation May Matter More Than Arousals' },
    ],
    faqItems: [
      {
        question: 'What is the difference between UARS and sleep apnea?',
        answer:
          'Both are forms of sleep-disordered breathing, but they differ in severity. In OSA, the airway collapses enough to cause apneas and hypopneas (scored by AHI). In UARS, the airway narrows but does not collapse fully, causing RERAs and increased respiratory effort without triggering AHI events. Symptoms can be equally debilitating in both conditions.',
      },
      {
        question: 'How is UARS diagnosed?',
        answer:
          'UARS is difficult to diagnose because standard sleep studies focus on AHI, which is typically normal in UARS. Diagnosis requires detecting RERAs (via esophageal manometry or flow limitation analysis) and correlating with symptoms. Flow limitation analysis from PAP SD card data shows breathing patterns associated with UARS -- your clinician can interpret these in the context of your full clinical picture.',
      },
    ],
    category: 'sleep-disordered-breathing',
  },
  {
    slug: 'central-apnea',
    title: 'Central Apnea',
    shortDescription:
      'A breathing pause caused by the brain temporarily failing to send signals to the respiratory muscles. Unlike obstructive apnea, the airway remains open.',
    fullDescription:
      'Central apnea occurs when the brain temporarily stops sending signals to the respiratory muscles, causing a pause in breathing. Unlike obstructive apnea where the airway physically collapses, the airway remains open during a central event but no effort is made to breathe. Central apneas typically last 10 to 30 seconds.\n\nCentral apneas can occur naturally in small numbers (especially during sleep stage transitions), but frequent central events may indicate conditions such as heart failure, stroke, opioid use, or high-altitude exposure. Treatment-emergent central sleep apnea can appear when PAP therapy successfully treats obstructive events, unmasking an underlying central breathing pattern.\n\nCentral apneas often occur in a periodic pattern (Cheyne-Stokes respiration) with a waxing-waning breathing cycle of 30 to 100 seconds. This pattern is detected by AirwayLab\'s Periodicity Index. Standard CPAP cannot treat central apnea; ASV (Adaptive Servo-Ventilation) or BiPAP ST modes with backup rates are typically used.',
    normalRanges: null,
    howAirwayLabMeasures:
      'AirwayLab cannot directly detect central apneas from flow waveform data because central events produce minimal or no flow signal (they look like gaps rather than waveform distortions). However, the WAT engine\'s Periodicity Index can detect the cyclical breathing pattern characteristic of periodic breathing associated with central events.',
    relatedTerms: ['obstructive-sleep-apnea', 'periodic-breathing', 'periodicity-index', 'asv'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'What is the difference between central and obstructive apnea?',
        answer:
          'In obstructive apnea, the airway physically collapses despite continued breathing effort. In central apnea, the brain temporarily stops sending signals to breathe, so there is no breathing effort at all. PAP machines report both types separately.',
      },
      {
        question: 'Can CPAP cause central apneas?',
        answer:
          'Treatment-emergent central sleep apnea can appear when CPAP successfully treats obstructive events. The central events may have been present all along but masked by the obstructive component, or the positive pressure may alter the brain\'s CO2 sensitivity. If central events persist, your clinician may consider ASV or BiPAP with a backup rate.',
      },
    ],
    category: 'sleep-disordered-breathing',
  },
  {
    slug: 'hypopnea',
    title: 'Hypopnea',
    shortDescription:
      'A partial reduction in airflow of at least 30% for at least 10 seconds, associated with an oxygen desaturation or arousal. More common than complete apneas on PAP therapy.',
    fullDescription:
      'A hypopnea is a partial reduction in airflow lasting at least 10 seconds, associated with either an oxygen desaturation of 3 to 4% or a cortical arousal. Unlike an apnea (complete or near-complete airflow cessation), a hypopnea represents partial airway obstruction where some airflow continues but at a significantly reduced level.\n\nHypopneas are counted in the AHI alongside apneas and are often more common than complete apneas, especially on PAP therapy where the air pressure prevents full collapse but may not fully prevent partial narrowing. The scoring criteria for hypopneas have changed over the years, leading to inconsistencies between different sleep labs and machines.\n\nOn PAP therapy, residual hypopneas may indicate the pressure is insufficient to fully prevent airway narrowing during certain sleep stages or positions. AirwayLab can detect hypopneas from flow amplitude drops when EVE.edf event files are not present, or it uses the machine\'s own event counts from EVE.edf when available, since the machine has access to internal algorithms that cannot be replicated from flow data alone.',
    normalRanges: null,
    howAirwayLabMeasures:
      'When EVE.edf files are present, AirwayLab uses the machine\'s own hypopnea count. When absent, it detects hypopneas by tracking flow amplitude drops of 30% or more from a rolling baseline, sustained for 10+ seconds. Each detected event is also checked for NED shape to identify events that shape-based analysis would miss.',
    relatedTerms: ['ahi', 'obstructive-sleep-apnea', 'desaturation', 'flow-limitation'],
    relatedBlogPosts: [
      { slug: 'beyond-ahi', title: 'Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You' },
    ],
    faqItems: [
      {
        question: 'What is the difference between an apnea and a hypopnea?',
        answer:
          'An apnea is a complete or near-complete cessation of airflow lasting at least 10 seconds. A hypopnea is a partial reduction (at least 30%) lasting at least 10 seconds, associated with an oxygen drop or arousal. Both are counted in AHI, but hypopneas represent partial rather than complete obstruction.',
      },
    ],
    category: 'sleep-disordered-breathing',
  },
  {
    slug: 'arousal',
    title: 'Arousal (Cortical / Respiratory)',
    shortDescription:
      'A brief shift in brain wave activity lasting at least 3 seconds, indicating a partial awakening from sleep. Respiratory arousals are triggered by breathing events.',
    fullDescription:
      'A cortical arousal is a brief shift in brain wave activity lasting at least 3 seconds, detected by EEG, that indicates a partial awakening from sleep. Arousals do not necessarily mean the person wakes up consciously. They are brief disruptions to sleep architecture that can occur dozens of times per hour without the sleeper being aware.\n\nRespiratory arousals are specifically triggered by breathing events: apneas, hypopneas, RERAs, or flow limitation. The brain detects increased respiratory effort or reduced oxygen and triggers a brief awakening to restore normal breathing. While this is a protective mechanism, frequent arousals fragment sleep and prevent the brain from spending sufficient time in restorative deep sleep stages.\n\nImportant context from research: Dr. Avram Gold\'s work suggests that flow limitation itself may drive symptoms through the limbic and HPA axis stress response, independently of cortical arousals. This means that counting arousals alone may miss the full picture of how sleep-disordered breathing affects daytime functioning. AirwayLab presents arousal estimates alongside primary flow limitation metrics for this reason.',
    normalRanges: null,
    howAirwayLabMeasures:
      'True cortical arousals require EEG measurement. AirwayLab estimates arousal-like events through the EAI (Estimated Arousal Index) by detecting spikes in respiratory rate and tidal volume relative to rolling baselines. This provides a useful approximation from flow data, though the primary focus should be on flow limitation metrics.',
    relatedTerms: ['eai', 'rera', 'flow-limitation', 'uars'],
    relatedBlogPosts: [
      { slug: 'arousals-vs-flow-limitation', title: 'Why Flow Limitation May Matter More Than Arousals' },
      { slug: 'what-is-cns-sensitization', title: 'Understanding CNS Sensitization in Sleep-Disordered Breathing' },
    ],
    faqItems: [
      {
        question: 'Are arousals the main cause of daytime fatigue?',
        answer:
          'Not necessarily. While arousals fragment sleep, research from Dr. Avram Gold suggests that flow limitation itself drives symptoms through a stress response pathway, independently of cortical arousals. Some studies show that controls with over 90% flow-limited breaths can be asymptomatic, suggesting individual sensitivity plays a role.',
      },
    ],
    category: 'sleep-disordered-breathing',
  },
  {
    slug: 'desaturation',
    title: 'Desaturation (Oxygen Desaturation)',
    shortDescription:
      'A drop in blood oxygen (SpO2) from baseline, typically measured at 3% or 4% thresholds. Each desaturation event indicates a breathing disruption that affected oxygen delivery.',
    fullDescription:
      'An oxygen desaturation is a measurable drop in blood oxygen saturation (SpO2) from a baseline level. In sleep medicine, desaturations are typically measured at 3% (more sensitive) or 4% (more specific, aligned with AASM hypopnea scoring) thresholds from a 2-minute rolling baseline.\n\nDesaturations occur when a breathing event, whether an apnea, hypopnea, or significant flow limitation, reduces the amount of oxygen reaching the lungs. The oxygen drop typically lags the breathing event by 20 to 40 seconds due to the circulatory transit time from lungs to the pulse oximeter on the finger or wrist.\n\nThe clinical significance of desaturations depends on their depth, duration, and frequency. Brief, shallow desaturations (3-4% drops) are less concerning than deep, prolonged drops (below 85% or lasting over 30 seconds). AirwayLab tracks both ODI-3 and ODI-4 (desaturation events per hour) and time below thresholds (T<90%, T<94%) to provide a complete picture of oxygen impact.',
    normalRanges: null,
    howAirwayLabMeasures:
      'The Oximetry Pipeline tracks desaturations using a 2-minute rolling SpO2 baseline from Viatom/Checkme O2 Max data. It computes ODI-3 (3% drops), ODI-4 (4% drops), time below 90% and 94%, and nadir SpO2. Requires compatible pulse oximetry data.',
    relatedTerms: ['odi-3', 'odi-4', 'spo2', 't-below-90', 'coupled-events'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'How low should my oxygen go on CPAP?',
        answer:
          'On well-controlled PAP therapy, SpO2 should generally stay above 90% throughout the night. Brief dips to 88-90% may occur normally, but frequent or prolonged drops below 90% warrant clinical discussion. Mean SpO2 above 95% is considered good.',
      },
    ],
    category: 'oximetry',
  },
  {
    slug: 'periodic-breathing',
    title: 'Periodic Breathing',
    shortDescription:
      'A cyclical pattern where breathing depth waxes and wanes over 30-100 second cycles. Associated with central sleep apnea, heart failure, and high-altitude exposure.',
    fullDescription:
      'Periodic breathing is a cyclical breathing pattern where ventilation progressively increases (crescendo), then progressively decreases (decrescendo), often with brief pauses between cycles. The cycle length is typically 30 to 100 seconds. The most well-known form is Cheyne-Stokes respiration, associated with congestive heart failure.\n\nPeriodic breathing occurs when the brain\'s respiratory control feedback loop becomes unstable. Small changes in blood CO2 levels trigger disproportionate responses, creating an oscillating pattern. This can happen in heart failure (delayed circulatory time), at high altitude (reduced oxygen pressure), with certain medications (opioids), and during the transition from wakefulness to sleep.\n\nOn PAP therapy, periodic breathing may indicate treatment-emergent central sleep apnea or an underlying condition that requires specific treatment. Standard CPAP does not effectively treat periodic breathing. ASV (Adaptive Servo-Ventilation) is specifically designed to stabilise this pattern by providing variable pressure support that counters the oscillations.',
    normalRanges: null,
    howAirwayLabMeasures:
      'The WAT engine\'s Periodicity Index detects periodic breathing by applying FFT spectral analysis to minute ventilation and measuring power in the 0.01-0.03 Hz band (corresponding to 30-100 second cycles). A high Periodicity Index indicates cyclical ventilation patterns consistent with periodic breathing.',
    relatedTerms: ['periodicity-index', 'central-apnea', 'asv', 'sample-entropy'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'What causes periodic breathing on CPAP?',
        answer:
          'Periodic breathing on CPAP may indicate treatment-emergent central sleep apnea, heart failure, or CO2 sensitivity issues. The cyclical pattern occurs when the brain\'s respiratory control feedback loop becomes unstable. If your AirwayLab Periodicity Index is elevated, discuss this with your sleep clinician.',
      },
    ],
    category: 'sleep-disordered-breathing',
  },

  /* ================================================================ */
  /*  DEVICE / DATA TERMS                                             */
  /* ================================================================ */
  {
    slug: 'cpap',
    title: 'CPAP (Continuous Positive Airway Pressure)',
    shortDescription:
      'A therapy device delivering a single fixed air pressure through a mask to keep the upper airway open during sleep. The first-line treatment for obstructive sleep apnea.',
    fullDescription:
      'Continuous Positive Airway Pressure (CPAP) is the most common treatment for obstructive sleep apnea. It delivers a single, constant air pressure through a mask worn during sleep. This positive pressure acts as a pneumatic splint, keeping the upper airway open by counteracting the negative inspiratory pressure that would otherwise pull the airway walls inward.\n\nCPAP uses one fixed pressure for both inspiration and expiration. The prescribed pressure is determined through a titration study (either in-lab or via auto-titrating CPAP over several nights). Most modern CPAP devices, such as the ResMed AirSense 10 and 11, can operate in either fixed-pressure CPAP mode or auto-adjusting (APAP/AutoSet) mode.\n\nWhile CPAP is highly effective at preventing complete airway collapse, it may not fully address flow limitation in all users. Some people require BiPAP (bilevel) therapy for additional pressure support during inspiration, or adjustments to EPR (Expiratory Pressure Relief) settings. AirwayLab helps identify whether residual flow limitation persists on current CPAP settings.',
    normalRanges: null,
    howAirwayLabMeasures:
      'AirwayLab reads CPAP pressure settings from the STR.edf file on the SD card and compares prescribed pressure with delivered pressure calculated from the BRP.edf flow and pressure waveforms. This helps verify whether the machine is delivering the intended therapy.',
    relatedTerms: ['bipap', 'asv', 'epr', 'autoset', 'pressure-support', 'obstructive-sleep-apnea'],
    relatedBlogPosts: [
      { slug: 'how-pap-therapy-works', title: 'How PAP Therapy Actually Works' },
    ],
    faqItems: [
      {
        question: 'How does CPAP work?',
        answer:
          'CPAP delivers constant positive air pressure through a mask during sleep. This pressure acts as a pneumatic splint, keeping the upper airway open by counteracting the negative pressure created during inspiration that would otherwise pull the airway walls inward and cause obstruction.',
      },
      {
        question: 'What is the difference between CPAP and APAP?',
        answer:
          'CPAP delivers one fixed pressure. APAP (also called AutoSet on ResMed devices) automatically adjusts pressure within a set range based on detected breathing events, increasing pressure when it detects flow limitation or apneas and decreasing when breathing is stable.',
      },
    ],
    category: 'pap-therapy',
  },
  {
    slug: 'bipap',
    title: 'BiPAP / VPAP (Bilevel Positive Airway Pressure)',
    shortDescription:
      'A PAP device delivering two different pressures: higher during inspiration (IPAP) and lower during expiration (EPAP). Used when CPAP alone cannot resolve flow limitation.',
    fullDescription:
      'Bilevel Positive Airway Pressure (BiPAP) delivers two different pressures: a higher pressure during inspiration (IPAP) and a lower pressure during expiration (EPAP). The difference between IPAP and EPAP is called pressure support, which provides active assistance during inhalation to push air through a narrowed airway.\n\nBiPAP is typically used when CPAP alone cannot adequately resolve flow limitation, when higher pressures are needed for comfort (BiPAP\'s lower expiratory pressure makes breathing out easier), or when ventilatory support is required for conditions like obesity hypoventilation syndrome. ResMed brands their bilevel devices as VPAP.\n\nBiPAP can be used in spontaneous mode (the machine detects your breaths), timed mode (the machine delivers breaths at a set rate), or ST (Spontaneous-Timed) mode (spontaneous with a backup rate). AirwayLab provides specific BiPAP analysis including trigger delay, cycling metrics, time at IPAP, and pressure support validation from the flow and pressure waveforms.',
    normalRanges: null,
    howAirwayLabMeasures:
      'AirwayLab reads BiPAP settings from STR.edf and computes delivered EPAP/IPAP from the BRP.edf pressure channel using P10/P90 percentiles. The Settings tab shows trigger delay, cycling metrics, time at IPAP, I:E ratio, tidal volume CV, and end-expiratory pressure analysis.',
    relatedTerms: ['cpap', 'pressure-support', 'epr', 'asv', 'flow-limitation'],
    relatedBlogPosts: [
      { slug: 'how-pap-therapy-works', title: 'How PAP Therapy Actually Works' },
    ],
    faqItems: [
      {
        question: 'When is BiPAP needed instead of CPAP?',
        answer:
          'BiPAP is typically prescribed when CPAP cannot adequately resolve flow limitation (the pressure needed is too high for comfort), when the patient has difficulty exhaling against a single high pressure, or when additional ventilatory support is needed for conditions like obesity hypoventilation syndrome.',
      },
      {
        question: 'What is pressure support on BiPAP?',
        answer:
          'Pressure support is the difference between IPAP (inspiratory pressure) and EPAP (expiratory pressure). For example, with IPAP of 14 cmH2O and EPAP of 10 cmH2O, pressure support is 4 cmH2O. Higher pressure support provides more breathing assistance during inhalation.',
      },
    ],
    category: 'pap-therapy',
  },
  {
    slug: 'asv',
    title: 'ASV (Adaptive Servo-Ventilation)',
    shortDescription:
      'A specialised PAP mode for complex or treatment-emergent central sleep apnea. Provides variable pressure support that adapts to the breathing pattern in real-time.',
    fullDescription:
      'Adaptive Servo-Ventilation (ASV) is a specialised PAP therapy mode designed for complex or treatment-emergent central sleep apnea. Unlike CPAP (fixed pressure) or BiPAP (two fixed pressures), ASV continuously monitors the breathing pattern and adapts its pressure support in real-time.\n\nASV works by providing more pressure support when breathing weakens and less support when breathing is stable. This counteracts the waxing-waning pattern of periodic breathing by stabilising ventilation without over-ventilating (which can worsen central events by driving CO2 too low). The machine essentially acts as a respiratory stabiliser.\n\nImportant safety note: ASV is contraindicated in patients with certain types of heart failure (specifically, symptomatic heart failure with reduced ejection fraction, LVEF below 45%). The SERVE-HF trial showed increased mortality in this population. ASV is appropriate for treatment-emergent central apnea, complex sleep apnea, and periodic breathing not related to severe heart failure.',
    normalRanges: null,
    howAirwayLabMeasures:
      'AirwayLab reads ASV settings from STR.edf and analyses the resulting flow patterns. All four analysis engines work with ASV data, though the Periodicity Index is particularly relevant for assessing whether ASV is successfully stabilising periodic breathing patterns.',
    relatedTerms: ['central-apnea', 'periodic-breathing', 'bipap', 'cpap', 'periodicity-index'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'What is the difference between ASV and BiPAP?',
        answer:
          'BiPAP delivers two fixed pressures (IPAP and EPAP). ASV continuously adapts its pressure support based on real-time breathing patterns, providing more support when breathing weakens and less when breathing is stable. ASV is specifically designed for central or complex sleep apnea where BiPAP\'s fixed pressures are insufficient.',
      },
    ],
    category: 'pap-therapy',
  },
  {
    slug: 'autoset',
    title: 'AutoSet (APAP)',
    shortDescription:
      'ResMed\'s auto-adjusting PAP mode that automatically adjusts pressure within a set range based on detected breathing events. Also known as APAP.',
    fullDescription:
      'AutoSet is ResMed\'s brand name for their auto-adjusting positive airway pressure (APAP) mode. Instead of delivering a single fixed pressure like standard CPAP, AutoSet automatically adjusts the therapeutic pressure within a clinician-set minimum and maximum range based on detected breathing events.\n\nThe AutoSet algorithm increases pressure when it detects flow limitation, snoring, or apneas, and decreases pressure when breathing is stable. This means the pressure tracks your actual needs throughout the night, which can vary with sleep position, sleep stage, alcohol consumption, and other factors.\n\nAutoSet is the default mode on most ResMed AirSense 10 and 11 devices. It provides an effective balance between therapeutic efficacy and comfort, as the average delivered pressure is often lower than the fixed pressure needed to treat the worst-case scenario. AirwayLab can compare the prescribed AutoSet range with the actual delivered pressures to assess whether the range is appropriate.',
    normalRanges: null,
    howAirwayLabMeasures:
      'AirwayLab reads the prescribed AutoSet pressure range (min/max) from STR.edf and computes the actual delivered pressure from BRP.edf pressure data. Comparing the two shows whether the machine is frequently hitting the pressure ceiling (the machine is frequently reaching the upper pressure limit) or staying near the floor.',
    relatedTerms: ['cpap', 'epr', 'flow-limitation', 'pressure-support'],
    relatedBlogPosts: [
      { slug: 'how-pap-therapy-works', title: 'How PAP Therapy Actually Works' },
    ],
    faqItems: [
      {
        question: 'Is AutoSet better than fixed CPAP?',
        answer:
          'AutoSet adapts to your changing needs throughout the night, which can improve comfort (lower average pressure) while maintaining efficacy. However, some users do better on fixed CPAP if their needs are consistent. Your clinician can determine which mode is more appropriate based on your titration data.',
      },
    ],
    category: 'pap-therapy',
  },
  {
    slug: 'epr',
    title: 'EPR (Expiratory Pressure Relief)',
    shortDescription:
      'A ResMed comfort feature that reduces pressure during exhalation by 1, 2, or 3 cmH2O. Makes breathing out against positive pressure more comfortable.',
    fullDescription:
      'Expiratory Pressure Relief (EPR) is a ResMed comfort feature that reduces the air pressure during exhalation by 1, 2, or 3 cmH2O below the therapeutic pressure. This makes breathing out against positive pressure feel more natural, as the resistance during expiration is reduced.\n\nEPR settings can affect flow limitation analysis because higher EPR creates a larger pressure drop during the transition from expiration to inspiration. This momentary pressure reduction can sometimes allow the airway to narrow briefly at the start of each breath, potentially contributing to flow limitation patterns in the waveform.\n\nAirwayLab reads the EPR setting from the STR.edf file and reports it alongside other therapy settings. If flow limitation metrics are elevated, one potential approach is to reduce EPR (trading comfort for less inspiratory pressure drop). However, EPR changes should be discussed with your clinician, as reducing EPR may affect therapy adherence if it makes the machine less comfortable to use.',
    normalRanges: null,
    howAirwayLabMeasures:
      'AirwayLab reads the EPR setting (0, 1, 2, or 3) from the STR.edf file on the SD card and displays it on the Settings tab. This context helps interpret flow limitation findings, as higher EPR values may contribute to inspiratory flow restriction.',
    relatedTerms: ['cpap', 'autoset', 'pressure-support', 'flow-limitation'],
    relatedBlogPosts: [
      { slug: 'understanding-flow-limitation', title: 'Understanding Flow Limitation: What Your PAP Machine Doesn\'t Tell You' },
    ],
    faqItems: [
      {
        question: 'Does EPR affect flow limitation?',
        answer:
          'EPR can affect flow limitation because it creates a pressure drop during the expiration-to-inspiration transition. Higher EPR settings (2-3) mean the airway experiences a brief period of lower pressure at the start of each breath, which can allow the airway to narrow. Your clinician can assess whether your current EPR setting is appropriate for your breathing patterns.',
      },
    ],
    category: 'pap-therapy',
  },
  {
    slug: 'edf-format',
    title: 'EDF (European Data Format)',
    shortDescription:
      'A standardised file format for multichannel time-series data used by ResMed PAP machines to store breath-by-breath flow waveform data on the SD card.',
    fullDescription:
      'The European Data Format (EDF) is an international standard for storing multichannel time-series physiological data. Originally developed for EEG data in sleep studies, it is now widely used for various physiological signals. ResMed PAP machines store detailed breath-by-breath data in EDF files on the SD card.\n\nEach EDF file contains a fixed-length header with signal metadata (sampling rate, channel names, calibration values, recording dates) followed by binary data records. The header format uses ASCII text, making it human-readable. The data section uses 16-bit signed integers that are converted to physical values using the calibration parameters in the header.\n\nResMed stores several types of EDF files: BRP.edf (flow waveform data, the primary file AirwayLab analyses), STR.edf (machine settings and summary statistics), and EVE.edf (machine-scored respiratory events). AirwayLab parses all three file types entirely in the browser using a custom EDF parser. Note: ResMed uses 2-digit years in EDF headers (years below 85 map to 2000s, 85 and above map to 1900s).',
    normalRanges: null,
    howAirwayLabMeasures:
      'AirwayLab includes a custom EDF parser (lib/parsers/edf-parser.ts) that reads the binary EDF format entirely in the browser. It extracts flow waveform data from BRP.edf, settings from STR.edf, and event data from EVE.edf. The sampling rate is read from the EDF header, never hardcoded.',
    relatedTerms: ['sd-card-data', 'cpap', 'bipap'],
    relatedBlogPosts: [
      { slug: 'pap-data-privacy', title: 'Your PAP Data Belongs to You: Privacy in Sleep Medicine' },
    ],
    faqItems: [
      {
        question: 'What is EDF format?',
        answer:
          'EDF (European Data Format) is a standardised file format for storing physiological time-series data. ResMed PAP machines use EDF to store flow waveform data, machine settings, and event logs on the SD card. AirwayLab parses these EDF files in your browser to extract the data needed for analysis.',
      },
    ],
    category: 'data-analysis',
  },
  {
    slug: 'sd-card-data',
    title: 'SD Card Data',
    shortDescription:
      'The detailed therapy data stored on your ResMed PAP machine\'s SD card, including breath-by-breath flow waveforms, pressure data, and machine settings.',
    fullDescription:
      'ResMed PAP machines store detailed therapy data on an SD card in the DATALOG folder. This data is far more detailed than what the machine transmits to the cloud (via myAir or AirView). The SD card contains the raw breath-by-breath flow waveform sampled at 25 Hz (25 data points per second), which is the data that makes flow limitation analysis possible.\n\nThe SD card data includes: BRP.edf files (flow and pressure waveforms for each recording session), STR.edf (machine settings, session summaries, and machine-reported metrics), EVE.edf (machine-scored respiratory events), and Identification.tgt (device model and serial number). One night of data typically uses 20 to 50 MB.\n\nTo use AirwayLab, you remove the SD card from your ResMed machine (behind a small door on the side), insert it into a computer via an SD card reader, and upload the DATALOG folder. AirwayLab processes everything in your browser without uploading the data to any server.',
    normalRanges: null,
    howAirwayLabMeasures:
      'AirwayLab processes the entire DATALOG folder structure from the SD card. It finds and groups EDF files by recording session, assembles sessions into clinical nights (using the night-grouper), extracts flow waveforms from BRP.edf, reads settings from STR.edf, and reads events from EVE.edf. All processing happens in the browser via Web Workers.',
    relatedTerms: ['edf-format', 'cpap', 'bipap'],
    relatedBlogPosts: [
      { slug: 'pap-data-privacy', title: 'Your PAP Data Belongs to You: Privacy in Sleep Medicine' },
    ],
    faqItems: [
      {
        question: 'How do I get data from my ResMed SD card?',
        answer:
          'Remove the SD card from the slot on the side of your ResMed machine. Insert it into your computer using an SD card reader (built-in or USB adapter). When uploading to AirwayLab, select the DATALOG folder. AirwayLab automatically finds and groups the relevant files by night.',
      },
      {
        question: 'Is SD card data more detailed than myAir?',
        answer:
          'Yes. The SD card contains raw breath-by-breath flow waveforms sampled at 25 Hz. myAir only shows summary statistics (AHI, usage hours, mask fit). The waveform data on the SD card is what makes detailed flow limitation analysis possible.',
      },
    ],
    category: 'data-analysis',
  },
  {
    slug: 'pressure-support',
    title: 'Pressure Support',
    shortDescription:
      'The difference between inspiratory pressure (IPAP) and expiratory pressure (EPAP) on a bilevel device. Higher pressure support provides more breathing assistance.',
    fullDescription:
      'Pressure support is the difference between the inspiratory pressure (IPAP) and expiratory pressure (EPAP) on a bilevel (BiPAP) device. For example, if IPAP is 14 cmH2O and EPAP is 10 cmH2O, pressure support is 4 cmH2O. This pressure boost during inspiration helps push air through a narrowed upper airway.\n\nHigher pressure support provides more assistance during inhalation, which can help overcome upper airway resistance and reduce flow limitation. Typical ranges are 2 to 6 cmH2O. The appropriate level depends on the degree of flow limitation, patient comfort, and underlying condition.\n\nAirwayLab validates delivered pressure support by computing actual IPAP and EPAP from the BRP.edf pressure channel (using P10 and P90 percentiles of the bimodal pressure distribution) and comparing with prescribed settings. This helps verify that the machine is delivering the intended therapy and can reveal issues like insufficient pressure support relative to the prescribed settings.',
    normalRanges: null,
    howAirwayLabMeasures:
      'AirwayLab computes delivered pressure support by measuring the difference between P90 (IPAP estimate) and P10 (EPAP estimate) of the pressure signal from BRP.edf. This is compared with the prescribed IPAP and EPAP from STR.edf to validate actual therapy delivery.',
    relatedTerms: ['bipap', 'cpap', 'epr', 'flow-limitation'],
    relatedBlogPosts: [
      { slug: 'how-pap-therapy-works', title: 'How PAP Therapy Actually Works' },
    ],
    faqItems: [
      {
        question: 'What is a normal pressure support setting?',
        answer:
          'Typical pressure support ranges from 2 to 6 cmH2O. The appropriate level depends on your degree of flow limitation and comfort. Higher pressure support provides more breathing assistance but may feel unnatural if set too high. Your clinician determines the appropriate setting.',
      },
    ],
    category: 'pap-therapy',
  },

  /* ================================================================ */
  /*  OXIMETRY TERMS                                                  */
  /* ================================================================ */
  {
    slug: 'spo2',
    title: 'SpO2 (Blood Oxygen Saturation)',
    shortDescription:
      'The percentage of haemoglobin in the blood that is carrying oxygen. Normal resting SpO2 is 95-100%. Drops below 90% during sleep are clinically significant.',
    fullDescription:
      'SpO2 (peripheral capillary oxygen saturation) is the percentage of haemoglobin molecules in the blood that are carrying oxygen, measured non-invasively using a pulse oximeter. Normal resting SpO2 is 95 to 100%. During sleep, brief dips may occur normally, but sustained or frequent drops indicate breathing disruption.\n\nIn the context of sleep-disordered breathing, SpO2 drops (desaturations) occur when breathing events reduce oxygen delivery to the lungs. The oxygen drop typically lags the breathing event by 20 to 40 seconds due to circulatory transit time. SpO2 values below 90% during sleep are considered clinically significant, and below 85% indicates severe desaturation.\n\nAirwayLab\'s oximetry pipeline provides comprehensive SpO2 analysis from Viatom/Checkme O2 Max data, including mean SpO2, nadir (lowest) SpO2, ODI-3 and ODI-4 (desaturation events per hour), time below 90% and 94%, and H1/H2 night-split comparisons. SpO2 data adds an independent oxygen-level dimension to the flow-based analysis from the four main engines.',
    normalRanges: [
      { label: 'Normal', range: '> 95% mean', color: 'emerald' },
      { label: 'Borderline', range: '92-95% mean', color: 'amber' },
      { label: 'Low', range: '< 92% mean', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The Oximetry Pipeline processes SpO2 data from Viatom/Checkme O2 Max CSV exports. It applies a cleaning pipeline (buffer zone trimming, motion filter, invalid sample removal, range validation) before computing summary statistics, desaturation indices, and time-below-threshold metrics.',
    relatedTerms: ['odi-3', 'odi-4', 'desaturation', 't-below-90', 'coupled-events'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'What pulse oximeter works with AirwayLab?',
        answer:
          'AirwayLab supports CSV exports from the Viatom/Checkme O2 Max wrist pulse oximeter. The CSV should contain SpO2 and heart rate columns with timestamps. Other oximeters may work if their CSV format matches.',
      },
      {
        question: 'What SpO2 level is concerning during sleep?',
        answer:
          'Mean SpO2 above 95% is considered good on PAP therapy. Values between 92-95% are borderline. Below 92% warrants clinical attention. Single dips below 90% are worth tracking, and sustained time below 90% is clinically significant.',
      },
    ],
    category: 'oximetry',
  },
  {
    slug: 'heart-rate-surges',
    title: 'Heart Rate Surges',
    shortDescription:
      'Sudden increases in heart rate following a respiratory event, detected from pulse oximetry data. Often accompany oxygen desaturations as part of the autonomic stress response.',
    fullDescription:
      'Heart rate surges are sudden increases in heart rate that occur following respiratory events. They are part of the autonomic nervous system\'s arousal response to breathing disruption. When the brain detects reduced oxygen or increased respiratory effort, it triggers a sympathetic activation that increases heart rate, blood pressure, and respiratory drive.\n\nAirwayLab detects two types of heart rate surges from oximetry data. Clinical surges are measured against a 30-second baseline at multiple thresholds (8, 10, 12, and 15 bpm above baseline). Rolling mean surges use a 5-minute baseline with a 5-second sustain requirement, making them more sensitive to the gradual autonomic responses that follow respiratory events.\n\nThe clinical significance of heart rate surges increases when they occur alongside oxygen desaturations. When both a desaturation and a heart rate surge occur within 30 seconds of each other, AirwayLab counts this as a coupled event. Coupled events strongly suggest a respiratory arousal, as the combined oxygen and heart rate response indicates the autonomic nervous system is repeatedly being activated by breathing disruption.',
    normalRanges: null,
    howAirwayLabMeasures:
      'The Oximetry Pipeline detects HR surges from Viatom/Checkme O2 Max data using two methods: clinical surges (30-second baseline, thresholds at 8/10/12/15 bpm) and rolling mean surges (5-minute baseline, 5-second sustain). Results include surge counts at each threshold and coupled event counts.',
    relatedTerms: ['coupled-events', 'spo2', 'odi-3', 'desaturation', 'arousal'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'What causes heart rate surges during sleep?',
        answer:
          'Heart rate surges during sleep are typically caused by the autonomic nervous system responding to breathing events. When the brain detects reduced oxygen or increased respiratory effort, it activates the sympathetic nervous system, which increases heart rate and blood pressure. Frequent surges suggest ongoing respiratory disruption.',
      },
    ],
    category: 'oximetry',
  },
  {
    slug: 'coupled-events',
    title: 'Coupled Events',
    shortDescription:
      'Simultaneous oxygen desaturation and heart rate surge occurring within 30 seconds. Strongly suggests a respiratory arousal and combined cardio-respiratory impact.',
    fullDescription:
      'A coupled event occurs when an oxygen desaturation (SpO2 drop of 3% or more) and a heart rate surge happen within 30 seconds of each other. This temporal coincidence strongly suggests that a single respiratory event triggered both responses, representing a combined cardio-respiratory impact.\n\nCoupled events are clinically significant because they indicate that breathing disruptions are affecting both oxygen levels and the autonomic nervous system simultaneously. This dual impact is more disruptive to sleep quality than either a desaturation or a heart rate surge alone. A high coupled event rate suggests frequent, significant respiratory events that are triggering the full arousal cascade.\n\nAirwayLab tracks coupled events by cross-referencing the timestamps of desaturation events with heart rate surges. The 30-second window accounts for the circulatory delay between a breathing event and its effects on peripheral oxygen and heart rate measurements. Coupled events provide a more specific indicator of respiratory arousals than either metric alone.',
    normalRanges: null,
    howAirwayLabMeasures:
      'The Oximetry Pipeline identifies coupled events by cross-referencing ODI desaturation timestamps with HR surge timestamps, counting any pair occurring within a 30-second window. Results appear on the Oximetry tab as coupled event count and rate per hour.',
    relatedTerms: ['heart-rate-surges', 'odi-3', 'desaturation', 'spo2', 'arousal'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'What does a high coupled event rate mean?',
        answer:
          'A high coupled event rate means that breathing disruptions are frequently triggering both oxygen drops and heart rate surges simultaneously. This indicates significant respiratory events that are activating the full autonomic arousal response, which is more disruptive to sleep quality than either response alone.',
      },
    ],
    category: 'oximetry',
  },
  {
    slug: 't-below-90',
    title: 'T<90% (Time Below 90% SpO2)',
    shortDescription:
      'The percentage of recording time with blood oxygen below 90%. Indicates sustained hypoxemia that may affect organ function.',
    fullDescription:
      'T<90% (also written as Time Below 90%) measures the percentage of the recording period during which blood oxygen saturation (SpO2) falls below 90%. This metric captures sustained hypoxemia, which is clinically significant because prolonged low oxygen levels can affect organ function, particularly the brain and cardiovascular system.\n\nWhile ODI measures the frequency of oxygen drops, T<90% measures their cumulative duration. A person might have a low ODI (few events per hour) but high T<90% if each event causes a prolonged desaturation. Conversely, frequent brief desaturations can produce a high ODI with low T<90%.\n\nOn well-controlled PAP therapy, T<90% should be below 5%. Values above 15% indicate significant time with low oxygen during sleep and warrant clinical attention. AirwayLab also reports T<94% as a more sensitive threshold that captures milder but still potentially relevant hypoxemia.',
    normalRanges: [
      { label: 'Good', range: '< 5%', color: 'emerald' },
      { label: 'Borderline', range: '5-15%', color: 'amber' },
      { label: 'Elevated', range: '> 15%', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The Oximetry Pipeline calculates T<90% from Viatom/Checkme O2 Max data by counting the number of valid SpO2 samples below 90% and dividing by total valid samples. Also computes T<94% using the same method with a higher threshold. Reported on the Oximetry tab.',
    relatedTerms: ['spo2', 'odi-3', 'desaturation'],
    relatedBlogPosts: [],
    faqItems: [
      {
        question: 'How much time below 90% SpO2 is concerning?',
        answer:
          'On PAP therapy, less than 5% of time below 90% is considered good. Between 5-15% is borderline. Above 15% is a level your clinician would typically want to review, as it shows extended time with lower blood oxygen.',
      },
    ],
    category: 'oximetry',
  },
  {
    slug: 'combined-fl-percentage',
    title: 'Combined FL Percentage',
    shortDescription:
      'The percentage of breaths classified as flow-limited by either NED (above 34%) or Flatness Index (above 0.85). Combines both detection methods for a more complete picture.',
    fullDescription:
      'The Combined FL Percentage reports the proportion of all breaths in a night that are classified as flow-limited by either of two methods: NED above 34% (indicating significant peak-to-mid flow drop) or Flatness Index above 0.85 (indicating a very flat-topped breath pattern). By combining both detection criteria, it catches flow limitation that either method alone might miss.\n\nNED and Flatness Index detect overlapping but distinct aspects of flow limitation. NED is sensitive to progressive airway narrowing during inspiration (mid-flow dropping below peak). Flatness Index is sensitive to the overall rectangularity of the breath. Some flow-limited breaths show one pattern without the other, so the combined metric provides the most complete per-breath picture.\n\nBelow 20% indicates well-controlled therapy. Between 20 and 40% is borderline. Above 40% suggests significant residual flow limitation. This metric is particularly useful as a single summary number when communicating results to clinicians, as it directly answers the question "what percentage of breaths are flow-limited?"',
    normalRanges: [
      { label: 'Good', range: '< 20%', color: 'emerald' },
      { label: 'Borderline', range: '20-40%', color: 'amber' },
      { label: 'Elevated', range: '> 40%', color: 'red' },
    ],
    howAirwayLabMeasures:
      'The NED engine flags each breath as flow-limited if NED exceeds 34% or Flatness Index exceeds 0.85. The combined count divided by total breaths gives the Combined FL Percentage. It is reported on the Overview and NED Analysis tabs.',
    relatedTerms: ['ned-mean', 'flatness-index', 'fl-score', 'flow-limitation'],
    relatedBlogPosts: [
      { slug: 'understanding-flow-limitation', title: 'Understanding Flow Limitation: What Your PAP Machine Doesn\'t Tell You' },
    ],
    faqItems: [
      {
        question: 'What is the difference between Combined FL% and FL Score?',
        answer:
          'Combined FL% counts the percentage of individual breaths flagged as flow-limited by NED or Flatness Index criteria. FL Score measures population-level flatness across breath windows using tidal volume variance ratios. They often correlate but measure flow limitation at different levels of granularity.',
      },
    ],
    category: 'airwaylab-metrics',
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

export function getTermBySlug(slug: string): GlossaryTerm | undefined {
  return GLOSSARY_TERMS.find((t) => t.slug === slug);
}

export function getAllSlugs(): string[] {
  return GLOSSARY_TERMS.map((t) => t.slug);
}
