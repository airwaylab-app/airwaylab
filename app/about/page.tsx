import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  Waves,
  HeartPulse,
  Wind,
  ExternalLink,
  Github,
  Shield,
  BookOpen,
  Scale,
  AlertTriangle,
  ArrowRight,
  Compass,
  TrendingUp,
  Eye,
  Users,
} from 'lucide-react';
import { FAQItem } from '@/components/common/faq-item';

export const metadata: Metadata = {
  title: 'About AirwayLab — Methodology & FAQ',
  description:
    'Learn how AirwayLab analyses PAP flow limitation using four research-grade engines: Glasgow Index, WAT, NED, and Oximetry. Browser-based, privacy-first, open-source, and free.',
  openGraph: {
    title: 'About AirwayLab — Methodology & FAQ',
    description:
      'Learn how AirwayLab analyses PAP flow limitation using four research-grade engines. Open-source, browser-based, free.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/about',
  },
};

/* ------------------------------------------------------------------ */
/*  FAQ data (used for both JSON-LD schema and rendered UI)            */
/* ------------------------------------------------------------------ */

const faqData = [
  {
    question: 'What PAP devices are supported?',
    answer:
      "AirwayLab currently supports ResMed AirSense 10 and AirCurve 10 series machines (CPAP, AutoSet, VPAP, ASV). These machines store detailed flow waveform data in EDF format on the SD card. AirSense 11 / AirCurve 11: ResMed's newer generation machines use an updated EDF format with different signal names. AirwayLab may partially work with AirSense 11 data, but full support is in development and results are not yet validated. Philips Respironics and other manufacturers use different data formats and are not currently supported.",
  },
  {
    question: 'How do I get the data from my SD card?',
    answer:
      'Remove the SD card from your ResMed machine and insert it into your computer (you may need an SD card reader). When uploading to AirwayLab, select the DATALOG folder \u2014 this contains the EDF files with your flow waveform data. AirwayLab automatically finds and groups the relevant files by night.',
  },
  {
    question: 'Is my data safe?',
    answer:
      'Yes. All core analysis runs entirely in your browser using Web Workers \u2014 your sleep data stays on your device by default. No cookies are used. We use Plausible for privacy-first, cookie-free page-view analytics that collect zero personal data. Optional features like AI-powered insights, cloud storage, or data contribution require your explicit consent before any data is sent to a server, and raw waveform data is never transmitted. The source code is open for inspection.',
  },
  {
    question: 'What pulse oximeters are supported?',
    answer:
      'AirwayLab supports CSV exports from the Viatom/Checkme O2 Max wrist pulse oximeter. The CSV should contain SpO\u2082 and heart rate columns with timestamps. Oximetry data is optional \u2014 all four analysis engines work with SD card data alone, and the oximetry pipeline activates only when oximetry CSVs are provided.',
  },
  {
    question: 'How do I interpret the Glasgow Index?',
    answer:
      'The Glasgow Index scores each breath on 9 flow limitation characteristics, producing an overall score from 0 to 8 (lower is better). Generally: below 2.0 is in the lower range, 2.0\u20133.0 suggests moderate flow limitation scores, and above 3.0 suggests elevated flow limitation scores. Your clinician can help interpret these findings in context.',
  },
  {
    question: 'What is the difference between Glasgow, WAT, and NED?',
    answer:
      'These are three independent methods of detecting flow limitation, each with different strengths. Glasgow scores breath shapes holistically (9 descriptors). WAT analyzes population-level patterns (regularity, periodicity). NED measures the specific ratio of peak-to-mid flow that indicates airway narrowing, plus automated RERA event detection. Using all three together gives a more complete picture than any single metric.',
  },
  {
    question: 'Why can Glasgow and NED be low but FL Score high (or vice versa)?',
    answer:
      "Each metric detects flow limitation using a different method. Glasgow Index scores 9 breath-shape characteristics (skew, spikes, flat tops, multi-peaks, etc.). FL Score (WAT engine) measures how much of the tidal volume variance is concentrated at the flow peaks across all breaths. NED Mean measures the per-breath ratio of peak flow to mid-inspiratory flow. A high FL Score with low Glasgow can happen when breaths are moderately flat-topped but don't show the specific shape distortions Glasgow targets. A low NED with high Glasgow can occur when breath shapes are abnormal in ways that don't affect the peak-to-mid flow ratio.",
  },
  {
    question: 'What is the Estimated Arousal Index (EAI) and how is it calculated?',
    answer:
      'The Estimated Arousal Index (EAI) estimates how many times per hour your brain briefly wakes up during sleep, based on breathing pattern changes. True arousals can only be measured with EEG (brain wave monitoring), but respiratory pattern changes correlate well with cortical arousals. AirwayLab detects arousals by looking for sudden spikes in respiratory rate (>20% above a 120-second rolling baseline) or tidal volume (>30% above baseline). A 15-second refractory period prevents double-counting. An EAI below 10/hr is in the lower range. An EAI above 15/hr is elevated -- your clinician can help interpret this pattern in context.',
  },
  {
    question: 'How is the FL Score calculated?',
    answer:
      'The FL Score is computed by the WAT (Wobble Analysis Tool) engine. For each window of breaths, it calculates the ratio of tidal volume variance in the top half of the signal versus the total variance. In normal breathing, airflow ramps up smoothly \u2014 the variance is distributed across the full waveform. In flow-limited breathing, the airflow hits a ceiling, creating a flat-topped pattern where most of the variance is concentrated at the peaks. A higher FL Score means more of your breaths show this flat-topped pattern, reported as a percentage.',
  },
  {
    question: 'Can I share results with my sleep doctor?',
    answer:
      'Yes. Use the export buttons in the dashboard to download your results as CSV (for spreadsheets), JSON (raw data), or open a print-ready PDF report you can save and share. You can also copy a forum-formatted summary for posting on ApneaBoard or Reddit. Many users share their AirwayLab results alongside OSCAR data when consulting with sleep physicians.',
  },
  {
    question: 'How does AirwayLab compare to OSCAR?',
    answer:
      'OSCAR is an excellent tool for detailed session-by-session review with interactive waveform browsing. AirwayLab complements OSCAR by providing automated flow limitation analysis (Glasgow Index, WAT, NED) that OSCAR does not compute. AirwayLab is also browser-based (no installation needed) and privacy-first (your data stays on your device by default). Many users benefit from using both tools together.',
  },
];

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqData.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

/* ------------------------------------------------------------------ */
/*  Engine methodology cards                                          */
/* ------------------------------------------------------------------ */

const engines = [
  {
    icon: Activity,
    name: 'Glasgow Index',
    subtitle: 'Flow Limitation Scoring',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/5',
    description:
      'A 9-component scoring system that evaluates each breath for flow limitation characteristics. Originally developed by DaveSkvn as an open-source analyzer (GPL-3.0), ported and validated for AirwayLab.',
    methodology: [
      'Each inspiration is segmented from the raw flow signal using zero-crossing detection with minimum window filtering.',
      'Nine shape descriptors are computed per breath: Skew, Spike, Flat Top, Top Heavy, Multi-Peak, No Pause, Inspiratory Rate, Multi-Breath, and Variable Amplitude.',
      'Each component is scored 0\u20131 based on statistical thresholds derived from the breath population.',
      'The overall Glasgow Index is the sum of all 9 components, yielding a 0\u20139 scale where lower is better.',
    ],
    reference: 'Based on Glasgow Sleep Centre flow limitation analysis methodology.',
    link: '/about/glasgow-index',
  },
  {
    icon: Waves,
    name: 'WAT (Wobble Analysis Tool)',
    subtitle: 'Ventilation Pattern Analysis',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-500/5',
    description:
      'Three complementary metrics that assess flow limitation severity, breathing regularity, and periodic breathing patterns from the flow signal.',
    methodology: [
      'FL Score: Computes the ratio of top-half tidal volume variance to total variance across breath windows. Higher scores indicate more flow-limited breathing.',
      'Regularity Score: Uses Sample Entropy (SampEn) on minute ventilation to quantify breathing pattern regularity. Higher values indicate more stable, regular breathing.',
      'Periodicity Index: Applies FFT spectral analysis to minute ventilation, looking for power concentration in the 0.01\u20130.03 Hz band characteristic of periodic breathing (30\u2013100 second cycles).',
    ],
    reference: 'Sample Entropy method per Richman & Moorman (2000). FFT periodicity per established sleep medicine practice.',
    link: null,
  },
  {
    icon: Wind,
    name: 'NED Analysis',
    subtitle: 'Negative Effort Dependence',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-500/5',
    description:
      'Breath-by-breath analysis of flow limitation using the ratio of peak inspiratory flow to mid-inspiratory flow, with automated RERA event detection.',
    methodology: [
      'NED = (Qpeak \u2212 Qmid) / Qpeak, where Qpeak is peak inspiratory flow and Qmid is flow at 50% of inspiratory time. Higher NED indicates more flow limitation.',
      'Flatness Index (FI) measures how flat the inspiratory flow plateau is. FI \u2265 0.85 indicates significant flow limitation.',
      'M-shape detection identifies breaths with a characteristic mid-inspiratory dip showing oscillation in the flow waveform.',
      'RERA detection: sequences of \u22653 breaths with progressively rising NED slope, terminated by a recovery breath with sudden NED drop. Reported as events per hour.',
    ],
    reference: 'NED concept from Tamisier et al. RERA detection adapted from clinical scoring criteria.',
    link: null,
  },
  {
    icon: HeartPulse,
    name: 'Oximetry Pipeline',
    subtitle: '17-Metric SpO\u2082 & Heart Rate Framework',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/20',
    bgColor: 'bg-rose-500/5',
    description:
      'Comprehensive pulse oximetry analysis for Viatom/Checkme O2 Max data, computing desaturation indices, heart rate surge patterns, and coupled cardio-respiratory events.',
    methodology: [
      'ODI-3% and ODI-4%: Oxygen Desaturation Index at 3% and 4% thresholds, computed as events per hour of recording.',
      'Time below threshold: Percentage of recording time with SpO\u2082 < 90% and < 94%.',
      'HR surge detection: Clinical surges (>8, >10, >12, and >15 bpm above 30-second baseline) and rolling mean surges (>10 and >15 bpm above 5-minute rolling mean).',
      'Coupled events: Simultaneous SpO\u2082 desaturation + HR surge within a time window, suggesting respiratory arousal.',
      'First-half vs second-half night comparison to detect positional or REM-related patterns.',
    ],
    reference: 'ODI methodology per AASM scoring manual. Double-tracking artifact correction applied.',
    link: '/about/oximetry-analysis',
  },
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                    */
/* ------------------------------------------------------------------ */

export default function AboutPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Page Header */}
      <div className="mb-10 sm:mb-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          About AirwayLab
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          PAP machines collect detailed breath-by-breath data every night — but most of it stays
          locked on an SD card, invisible to patients and ignored by clinicians who only check AHI.
          Millions of people are &ldquo;treated&rdquo; with AHI under 5 but still wake up exhausted because
          flow limitation, RERAs, and breathing pattern instability go undetected.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          We believe your breathing data belongs to you. AirwayLab makes that data visible,
          understandable, and actionable — with open-source code you can audit, analysis that runs
          entirely in your browser, and a free tier that will always include the complete toolkit.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Four research-grade analysis engines process your ResMed SD card data client-side
          via Web Workers. No tracking, no cookies — just the insights your
          machine already collected but never showed you.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-500">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          <span>Private by default &middot; Open source &middot; You control your data</span>
        </div>
      </div>

      {/* ---- Our Approach ---- */}
      <section id="our-approach" className="mb-12 sm:mb-16">
        <div className="mb-6 flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Our Approach
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
            <h3 className="mb-2 text-sm font-semibold text-emerald-400">Free Tier — Complete Analysis</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              AirwayLab&apos;s core analysis — Glasgow Index, WAT, NED, oximetry, insights, exports — is free
              and always will be. We believe everyone on PAP therapy deserves access to research-grade
              analysis, regardless of their budget or technical skill.
            </p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
            <h3 className="mb-2 text-sm font-semibold text-blue-400">Open Source — Verifiable Trust</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Every line of code is open source (GPL-3.0). Your sleep data is health data — we think
              you should be able to verify exactly what happens with it. That&apos;s why the code is
              open source and analysis runs in your browser by default.
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
            <h3 className="mb-2 text-sm font-semibold text-amber-400">Premium — Sustaining Development</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Building and maintaining a tool like this takes time. Premium features like AI-powered
              therapy insights help fund continued development. They&apos;re genuinely useful
              additions — not features we removed from the free tier to charge for.
            </p>
          </div>
        </div>
      </section>

      {/* ---- Our Vision ---- */}
      <section id="our-vision" className="mb-12 sm:mb-16">
        <div className="mb-6 flex items-center gap-2.5">
          <Compass className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Our Vision
          </h2>
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                <Eye className="h-4 w-4 text-emerald-400" />
              </div>
              <div className="mt-2 h-full w-px bg-border/50" />
            </div>
            <div className="pb-4">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-sm font-semibold">Your data, visible</h3>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Now
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                PAP machines collect rich breath-by-breath flow data every night, but most of it stays invisible —
                locked on an SD card, inaccessible to the people it belongs to. AirwayLab makes that data visible
                and understandable. Four research-grade engines analyse flow limitation, RERAs, and breathing
                patterns that standard AHI metrics miss. Everything runs in your browser, so your data stays yours.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-400" />
              </div>
              <div className="mt-2 h-full w-px bg-border/50" />
            </div>
            <div className="pb-4">
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-sm font-semibold">Shared insights, collective intelligence</h3>
                <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                  Next
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Individual analysis is powerful, but the real potential is collective. With your consent,
                anonymised breathing data can be contributed to a growing research dataset.
                Patterns hidden in thousands of real-world therapy nights that no single sleep lab has the scale to
                find. This data powers better analysis algorithms for everyone.
              </p>
              <Link
                href="/research"
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-blue-400 transition-colors hover:text-blue-300"
              >
                Learn more about our research programme <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
                <TrendingUp className="h-4 w-4 text-amber-400" />
              </div>
            </div>
            <div>
              <div className="mb-1 flex items-center gap-2">
                <h3 className="text-sm font-semibold">Smarter therapy for everyone</h3>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  Future
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Aggregated insights from thousands of real-world nights could help researchers, clinicians, and
                device manufacturers understand real-world therapy patterns at scale — beyond AHI. Better data
                means better algorithms. Better algorithms mean better therapy. Better therapy means better sleep
                for millions of people.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---- Methodology Section ---- */}
      <section className="mb-12 sm:mb-16">
        <div className="mb-6 flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Methodology
          </h2>
        </div>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          AirwayLab uses four independent analysis engines, each targeting a
          different aspect of sleep-disordered breathing. All algorithms are
          deterministic and reproducible &mdash; the same input always produces
          the same output.
        </p>
        <p className="mb-8">
          <Link
            href="/about/flow-limitation"
            className="inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
          >
            New to flow limitation? Start here <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </p>

        <div className="flex flex-col gap-6">
          {engines.map((engine) => (
            <div
              key={engine.name}
              className={`rounded-xl border ${engine.borderColor} ${engine.bgColor} p-5 sm:p-6`}
            >
              <div className="mb-3 flex items-center gap-3">
                <engine.icon className={`h-5 w-5 ${engine.color}`} />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">
                    {engine.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {engine.subtitle}
                  </p>
                </div>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                {engine.description}
              </p>
              <div className="mb-3">
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
                  How it works
                </h4>
                <ol className="flex flex-col gap-2">
                  {engine.methodology.map((step, i) => (
                    <li
                      key={i}
                      className="flex gap-3 text-xs leading-relaxed text-muted-foreground"
                    >
                      <span className="mt-px shrink-0 font-mono text-[10px] text-muted-foreground/50">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] italic text-muted-foreground/60">
                  {engine.reference}
                </p>
                {engine.link && (
                  <Link
                    href={engine.link}
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Deep dive <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- FAQ Section ---- */}
      <section className="mb-12 sm:mb-16">
        <h2 className="mb-6 text-lg font-semibold tracking-tight sm:text-xl">
          Frequently Asked Questions
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 px-5">
          <FAQItem question="What PAP devices are supported?">
            <p className="mb-3">
              AirwayLab currently supports <strong className="text-foreground">ResMed AirSense 10</strong> and{' '}
              <strong className="text-foreground">AirCurve 10</strong> series machines (CPAP, AutoSet,
              VPAP, ASV). These machines store detailed flow waveform data in EDF
              format on the SD card.
            </p>
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="text-xs">
                <strong className="text-foreground">AirSense 11 / AirCurve 11:</strong> ResMed&rsquo;s
                newer generation machines use an updated EDF format with different
                signal names. AirwayLab may partially work with AirSense 11 data,
                but full support is in development and results are not yet validated.
                If you have an AirSense 11, you&rsquo;re welcome to try &mdash; please{' '}
                <a href="https://github.com/airwaylab-app/airwaylab/issues" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-foreground hover:text-primary">
                  report any issues
                </a>{' '}
                to help us improve compatibility.
              </p>
            </div>
            <p>
              Philips Respironics and other manufacturers use different
              data formats and are not currently supported.
            </p>
          </FAQItem>

          <FAQItem question="How do I get the data from my SD card?">
            Remove the SD card from your ResMed machine and insert it into your
            computer (you may need an SD card reader). When uploading to
            AirwayLab, select the <strong className="text-foreground">DATALOG</strong> folder &mdash; this
            contains the EDF files with your flow waveform data. AirwayLab
            automatically finds and groups the relevant files by night.
          </FAQItem>

          <FAQItem question="Is my data safe?">
            Yes. All core analysis runs entirely in your browser using Web
            Workers &mdash; your sleep data stays on your device by default.
            No cookies are used. We use Plausible for privacy-first, cookie-free
            page-view analytics that collect zero personal data. Optional
            features like AI-powered insights or cloud storage require your
            explicit consent before any data is sent to a server, and raw
            waveform data is never transmitted. The source code is open for
            inspection.
          </FAQItem>

          <FAQItem question="What pulse oximeters are supported?">
            AirwayLab supports CSV exports from the{' '}
            <strong className="text-foreground">Viatom/Checkme O2 Max</strong> wrist pulse
            oximeter. The CSV should contain SpO&#8322; and heart rate columns
            with timestamps. Oximetry data is optional &mdash; all four analysis
            engines work with SD card data alone, and the oximetry pipeline
            activates only when oximetry CSVs are provided.
          </FAQItem>

          <FAQItem question="How do I interpret the Glasgow Index?">
            The Glasgow Index scores each breath on 9 flow limitation
            characteristics, producing an overall score from 0 to 8 (lower is
            better). Generally: <strong className="text-foreground">below 2.0</strong> is in the
            lower range, <strong className="text-foreground">2.0&ndash;3.0</strong>{' '}
            suggests moderate flow limitation scores, and{' '}
            <strong className="text-foreground">above 3.0</strong> suggests elevated
            flow limitation scores. Your clinician can help interpret these
            findings in context.
          </FAQItem>

          <FAQItem question="What is the difference between Glasgow, WAT, and NED?">
            These are three independent methods of detecting flow limitation,
            each with different strengths. <strong className="text-foreground">Glasgow</strong>{' '}
            scores breath shapes holistically (9 descriptors).{' '}
            <strong className="text-foreground">WAT</strong> analyzes population-level patterns
            (regularity, periodicity). <strong className="text-foreground">NED</strong> measures
            the specific ratio of peak-to-mid flow that indicates airway
            narrowing, plus automated RERA event detection. Using all three
            together gives a more complete picture than any single metric.
          </FAQItem>

          <FAQItem question="Why can Glasgow and NED be low but FL Score high (or vice versa)?">
            <p className="mb-3">
              This is one of the most common questions, and it makes sense once you understand that each
              metric detects flow limitation using a <em>different method</em>:
            </p>
            <ul className="mb-3 flex flex-col gap-2">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-blue-400" />
                <span>
                  <strong className="text-foreground">Glasgow Index</strong> scores 9 breath-shape characteristics
                  (skew, spikes, flat tops, multi-peaks, etc.). It catches a wide range of waveform abnormalities,
                  not just classic flow limitation.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                <span>
                  <strong className="text-foreground">FL Score</strong> (WAT engine) measures how much of the
                  tidal volume variance is concentrated at the flow peaks across all breaths. It&rsquo;s a
                  population-level flatness measure &mdash; it looks at the <em>overall distribution</em>, not
                  individual breath shapes.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                <span>
                  <strong className="text-foreground">NED Mean</strong> measures the per-breath ratio of peak flow
                  to mid-inspiratory flow. It specifically targets the pattern where the airway narrows during
                  inhalation, causing mid-flow to drop below peak flow.
                </span>
              </li>
            </ul>
            <p className="mb-3">
              A <strong className="text-foreground">high FL Score with low Glasgow</strong> can happen when breaths
              are moderately flat-topped (the WAT flatness detector picks this up) but don&rsquo;t show the specific
              shape distortions Glasgow targets (abnormal skew, spikes, multi-peaks). The breathing is restricted
              but uniformly so.
            </p>
            <p>
              A <strong className="text-foreground">low NED with high Glasgow</strong> can occur when breath shapes
              are abnormal in ways that don&rsquo;t affect the peak-to-mid flow ratio &mdash; for example, variable
              amplitude or unusual timing patterns. These are real abnormalities, just not the specific
              &ldquo;negative effort&rdquo; pattern NED looks for.
            </p>
          </FAQItem>

          <FAQItem question="What is the Estimated Arousal Index (EAI) and how is it calculated?">
            <p className="mb-3">
              The <strong className="text-foreground">Estimated Arousal Index (EAI)</strong> estimates how many
              times per hour your brain briefly wakes up during sleep, based on breathing pattern changes.
              True arousals can only be measured with EEG (brain wave monitoring), but respiratory pattern
              changes correlate well with cortical arousals.
            </p>
            <p className="mb-3">
              AirwayLab detects arousals by looking for sudden spikes in{' '}
              <strong className="text-foreground">respiratory rate</strong> (&gt;20% above a 120-second rolling
              baseline) or <strong className="text-foreground">tidal volume</strong> (&gt;30% above baseline).
              Each spike suggests a micro-awakening &mdash; your brain briefly wakes up, takes a few deeper or
              faster breaths, then returns to sleep. A 15-second refractory period prevents double-counting
              closely spaced events.
            </p>
            <p>
              An EAI below 10/hr is in the lower range. An EAI above 15/hr is elevated -- your clinician
              can help interpret this pattern in context, even if your AHI appears low.
            </p>
          </FAQItem>

          <FAQItem question="How is the FL Score calculated?">
            <p className="mb-3">
              The <strong className="text-foreground">FL Score</strong> is computed by the WAT (Wobble Analysis Tool)
              engine. For each window of breaths, it calculates the ratio of tidal volume variance in the
              top half of the signal versus the total variance.
            </p>
            <p className="mb-3">
              In normal breathing, airflow ramps up smoothly and rounds off naturally &mdash; the variance is
              distributed across the full waveform. In flow-limited breathing, the airflow hits a ceiling
              (the airway is partially narrowed), creating a flat-topped pattern where most of the variance
              is concentrated at the peaks.
            </p>
            <p>
              A higher FL Score means more of your breaths show this flat-topped pattern. It&rsquo;s reported as
              a percentage: an FL Score of 60% means 60% of your breath windows showed significant flow
              limitation characteristics.
            </p>
          </FAQItem>

          <FAQItem question="Can I share results with my sleep doctor?">
            Yes. Use the export buttons in the dashboard to download your results
            as CSV (for spreadsheets), JSON (raw data), or open a print-ready PDF
            report you can save and share. You can also copy a forum-formatted
            summary for posting on ApneaBoard or Reddit. Many users share their
            AirwayLab results alongside OSCAR data when consulting with sleep
            physicians.
          </FAQItem>

          <FAQItem question="How does AirwayLab compare to OSCAR?">
            OSCAR is an excellent tool for detailed session-by-session review
            with interactive waveform browsing. AirwayLab complements OSCAR by
            providing automated flow limitation analysis (Glasgow Index, WAT,
            NED) that OSCAR does not compute. AirwayLab is also browser-based
            (no installation needed) and privacy-first (your data stays on your
            device by default). Many users benefit from using both tools together.
          </FAQItem>
        </div>
      </section>

      {/* ---- Contributing Section ---- */}
      <section className="mb-12 sm:mb-16">
        <h2 className="mb-6 text-lg font-semibold tracking-tight sm:text-xl">
          Contributing
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 sm:p-6">
          <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
            AirwayLab is open source under the GPL-3.0 license. Contributions
            are welcome &mdash; whether that&apos;s code, bug reports, feature
            requests, or documentation improvements.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <a
              href="https://github.com/airwaylab-app/airwaylab"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              <Github className="h-4 w-4" />
              View on GitHub
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
            <a
              href="https://github.com/airwaylab-app/airwaylab/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              Report an Issue
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          </div>
        </div>
      </section>

      {/* ---- Privacy Section ---- */}
      <section className="mb-12 sm:mb-16">
        <h2 className="mb-6 text-lg font-semibold tracking-tight sm:text-xl">
          Privacy
        </h2>
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <Shield className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Privacy by default
            </h3>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
              All core analysis runs in your browser via Web Workers &mdash;
              your sleep data stays on your device by default.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
              No cookies, no fingerprinting. Optional privacy-first analytics
              (Plausible) collect zero personal data. AirwayLab does not know
              who you are.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
              Optional server features (AI insights, cloud storage, data
              contribution) require your explicit consent. Raw waveform data
              is never transmitted &mdash; only aggregate metrics.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
              Source code is open for inspection &mdash; verify the privacy
              claims yourself.
            </li>
          </ul>
        </div>
      </section>

      {/* ---- Disclaimer Section ---- */}
      <section className="mb-8">
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

      {/* ---- License ---- */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
        <Scale className="h-3.5 w-3.5" />
        <span>
          AirwayLab is licensed under the{' '}
          <a
            href="https://www.gnu.org/licenses/gpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 transition-colors hover:text-muted-foreground"
          >
            GNU General Public License v3.0
          </a>
          . Glasgow Index engine based on GPL-3.0 code by DaveSkvn.
        </span>
      </div>
    </div>
  );
}
