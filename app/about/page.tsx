'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Activity,
  Waves,
  HeartPulse,
  Wind,
  ChevronDown,
  ExternalLink,
  Github,
  Shield,
  BookOpen,
  Scale,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  FAQ Accordion Item                                                */
/* ------------------------------------------------------------------ */

function FAQItem({ question, children }: { question: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-border/40 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left text-sm font-medium text-foreground transition-colors hover:text-primary"
        aria-expanded={open}
      >
        {question}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`grid transition-all duration-200 ${
          open ? 'grid-rows-[1fr] pb-4' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden text-sm leading-relaxed text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

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
      'The overall Glasgow Index is the sum of 8 components (Top Heavy is computed but excluded from the total), yielding a 0\u20138 scale where lower is better.',
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
      'M-shape detection identifies breaths with a characteristic mid-inspiratory dip suggesting upper airway oscillation.',
      'RERA detection: sequences of \u22653 breaths with progressively rising NED slope, terminated by a recovery breath with sudden NED drop. Reported as events per hour.',
    ],
    reference: 'NED concept from Tamisier et al. RERA detection adapted from clinical scoring criteria.',
    link: null,
  },
  {
    icon: HeartPulse,
    name: 'Oximetry Pipeline',
    subtitle: '16-Metric SpO\u2082 & Heart Rate Framework',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/20',
    bgColor: 'bg-rose-500/5',
    description:
      'Comprehensive pulse oximetry analysis for Viatom/Checkme O2 Max data, computing desaturation indices, heart rate surge patterns, and coupled cardio-respiratory events.',
    methodology: [
      'ODI-3% and ODI-4%: Oxygen Desaturation Index at 3% and 4% thresholds, computed as events per hour of recording.',
      'Time below threshold: Percentage of recording time with SpO\u2082 < 90% and < 94%.',
      'HR surge detection: Clinical surges (>8 and >10 bpm above 30-second baseline) and rolling mean surges (>6 and >8 bpm above 5-minute rolling mean).',
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
      {/* Page Header */}
      <div className="mb-10 sm:mb-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          About AirwayLab
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          AirwayLab is a free, open-source sleep analysis dashboard that
          processes ResMed CPAP and BiPAP SD card data directly in your browser.
          Four research-grade analysis engines run entirely client-side using Web
          Workers &mdash; your data never leaves your device.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-500">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          <span>100% client-side processing &middot; Zero data upload &middot; Your sleep data never leaves your device</span>
        </div>
      </div>

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
          <FAQItem question="What CPAP machines are supported?">
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
            Yes. AirwayLab processes everything in your browser using Web
            Workers. No data is uploaded to any server and no cookies are used.
            We use Plausible for privacy-first, cookie-free page-view analytics
            that collect zero personal data. Your sleep data never leaves your
            device. The source code is open for inspection.
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
            better). Generally: <strong className="text-foreground">below 2.0</strong> is
            considered good therapy, <strong className="text-foreground">2.0&ndash;3.0</strong>{' '}
            suggests moderate flow limitation worth discussing with your
            clinician, and <strong className="text-foreground">above 3.0</strong> indicates
            significant flow limitation that may warrant pressure or settings
            adjustment.
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
            (no installation needed) and privacy-first (no data leaves your
            browser). Many users benefit from using both tools together.
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
              Zero data collection
            </h3>
          </div>
          <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
              All analysis runs in your browser via Web Workers &mdash; nothing
              is uploaded to any server.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
              No cookies, no fingerprinting. Optional privacy-first analytics
              (Plausible) collect zero personal data. AirwayLab does not know
              who you are.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
              No server-side processing. The page loads once and all
              computation happens locally in your browser.
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
            changes to CPAP/BiPAP settings.
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
