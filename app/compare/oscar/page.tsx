import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  AlertTriangle,
  BarChart3,
  BookOpen,
  Globe,
  Layers,
  Lock,
  Monitor,
  Scale,
} from 'lucide-react';
import { FAQItem } from '@/components/common/faq-item';

export const metadata: Metadata = {
  title: 'AirwayLab vs OSCAR: Which CPAP Analysis Tool Do You Need?',
  description:
    'Detailed comparison of AirwayLab and OSCAR for CPAP data analysis. See how automated flow limitation scoring complements interactive waveform browsing. Both tools are free and open source.',
  openGraph: {
    title: 'AirwayLab vs OSCAR: Which CPAP Analysis Tool Do You Need?',
    description:
      'Detailed comparison of AirwayLab and OSCAR for CPAP data analysis. Automated flow limitation scoring meets interactive waveform browsing.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/compare/oscar',
  },
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
      name: 'Compare CPAP Tools',
      item: 'https://airwaylab.app/compare',
    },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'AirwayLab vs OSCAR',
      item: 'https://airwaylab.app/compare/oscar',
    },
  ],
};

const faqData = [
  {
    question: 'Should I switch from OSCAR to AirwayLab?',
    answer:
      'No -- use both. OSCAR excels at interactive waveform inspection and supports many devices. AirwayLab adds automated flow limitation scoring, RERA detection, and composite metrics that OSCAR does not compute. They solve different problems and work best together.',
  },
  {
    question: 'Does AirwayLab support all the same devices as OSCAR?',
    answer:
      'No. AirwayLab currently supports ResMed AirSense 10 and AirCurve 10 series only. OSCAR supports ResMed, Philips Respironics, Fisher & Paykel, and other manufacturers. If you use a non-ResMed device, OSCAR is your primary option.',
  },
  {
    question: 'Can I import OSCAR data into AirwayLab?',
    answer:
      'Not directly. Both tools read from the same source: your ResMed SD card. Upload the same DATALOG folder to AirwayLab that you use with OSCAR. There is no need to export/import between them.',
  },
  {
    question: 'Is AirwayLab as accurate as OSCAR?',
    answer:
      'They measure different things. OSCAR accurately displays raw waveform data and machine-reported events. AirwayLab computes additional metrics (Glasgow Index, FL Score, NED, RERA estimates) using published research methodologies. Both are accurate at what they do -- they are complementary, not competing.',
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

export default function CompareOscarPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 text-xs text-muted-foreground" aria-label="Breadcrumb">
        <Link href="/compare" className="transition-colors hover:text-foreground">
          Compare Tools
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">AirwayLab vs OSCAR</span>
      </nav>

      {/* Header */}
      <div className="mb-10 sm:mb-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          AirwayLab vs OSCAR: Which CPAP Analysis Tool Do You Need?
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          OSCAR and AirwayLab are both free, open-source tools for analysing CPAP data. They are not
          competitors -- they solve different problems and many users get the most value from using
          both. Here is how they differ and when to use each.
        </p>
      </div>

      {/* What OSCAR Does Well */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Monitor className="h-5 w-5 text-blue-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What OSCAR Does Well</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR is a mature, reliable desktop application with a loyal community and features built
            over many years:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Interactive waveform browsing</strong> with zoom,
                pan, and event marking at breath-by-breath resolution
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Multi-device support</strong> including ResMed,
                Philips, F&amp;P, and others
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Long-term historical data</strong> stored locally
                with trend views spanning months and years
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Detailed event logs</strong> showing individual
                apnea, hypopnea, and leak events on a timeline
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
              <span>
                <strong className="text-foreground">Active community</strong> on ApneaBoard.com with
                years of shared knowledge and support
              </span>
            </li>
          </ul>
          <p>
            For manual waveform inspection and event-by-event review, OSCAR is unmatched. If you need
            to zoom into a specific 30-second window and examine individual breaths, OSCAR is the
            right tool.
          </p>
        </div>
      </section>

      {/* What AirwayLab Adds */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Layers className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What AirwayLab Adds</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR shows you the raw data. AirwayLab processes that data through four research-grade
            analysis engines and tells you what it means:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">
                Automated Flow Limitation Scoring
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Four independent engines (Glasgow Index, WAT, NED, Oximetry) analyse every breath
                for flow limitation. You get composite scores instead of visually scanning thousands
                of breaths yourself.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">RERA Detection</p>
              <p className="mt-1 text-xs text-muted-foreground">
                AirwayLab&apos;s NED engine identifies sequences of flow-limited breaths that end in
                arousals, estimating a RERA index and Respiratory Disturbance Index that OSCAR cannot
                compute.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Glasgow Index</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A 9-component breath shape scoring system that synthesises thousands of breaths into
                a single actionable score. Track it over time to see how your breathing patterns
                change across nights.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Browser-Based</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No installation required. Upload your SD card from any device with a browser. All
                analysis runs locally in a Web Worker -- your data never leaves your device.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Side-by-Side Comparison */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Side-by-Side Comparison</h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="py-3 pr-4 text-left font-semibold text-foreground">Feature</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">OSCAR</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">AirwayLab</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Interactive waveform zoom</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">Viewer only</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Multi-device support</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">ResMed only</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Long-term data storage</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">30-day local cache</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Flow limitation scoring</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">4 engines</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">RERA detection</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (NED)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Glasgow Index</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Oximetry analysis</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">Basic</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">17 metrics</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">AI-powered insights</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (opt-in)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Runs in browser</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No (desktop)</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Privacy</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Local files</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Browser-only</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Open source</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (GPL-3.0)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Cost</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Free</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Free core</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Using Both Together */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold sm:text-2xl">Using Both Tools Together</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            OSCAR and AirwayLab are complementary. The most effective workflow uses both:
          </p>
          <div className="space-y-3">
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                1. Start with AirwayLab for the big picture
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload your SD card, get your Glasgow Index, FL Score, RERA estimate, and
                Estimated Arousal Index. These composite metrics tell you whether flow limitation
                is a problem and how severe it is. The traffic light system makes interpretation
                straightforward.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                2. Use OSCAR to investigate specifics
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                If AirwayLab flags elevated flow limitation in the second half of the night (H2),
                open that session in OSCAR and zoom into the waveforms. Look for the specific events
                and patterns. OSCAR&apos;s interactive zoom is unmatched for this kind of detailed
                inspection.
              </p>
            </div>
            <div className="rounded-xl border border-border/50 p-4">
              <p className="text-sm font-semibold text-foreground">
                3. Track trends in AirwayLab, verify in OSCAR
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                After a pressure or EPR change, monitor your AirwayLab metrics across nights. If a
                metric shifts significantly, confirm the change by inspecting representative
                waveforms in OSCAR. This gives you both statistical confidence and visual
                verification.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* When to use each */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">When to Use Each Tool</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <p className="text-sm font-semibold text-blue-400">OSCAR is better when you...</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>Need to browse individual waveforms interactively</li>
              <li>Use a non-ResMed device (Philips, F&amp;P)</li>
              <li>Want years of historical data in one view</li>
              <li>Prefer a desktop application</li>
              <li>Already know how to read flow waveforms</li>
              <li>Need to cross-reference machine-flagged events</li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">
              AirwayLab is better when you...
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>Want automated flow limitation analysis</li>
              <li>Need a quick summary without manual waveform review</li>
              <li>Want metrics beyond AHI (Glasgow, NED, RERA)</li>
              <li>Prefer browser-based tools with no installation</li>
              <li>Want AI-powered insights about your patterns</li>
              <li>Need exportable reports for your clinician</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Privacy: Both Tools Get It Right</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Both OSCAR and AirwayLab keep your data under your control. OSCAR stores everything
            locally on your computer. AirwayLab processes everything in your browser using Web
            Workers, and no data leaves your device unless you explicitly opt in to features like AI
            insights or community data contribution.
          </p>
          <p>
            Both tools are open source, so you can verify the privacy claims yourself. This is
            notable compared to proprietary tools like myAir and SleepHQ that upload your health data
            to corporate servers.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold sm:text-2xl">Frequently Asked Questions</h2>
        <div className="rounded-xl border border-border/50 bg-card/30 px-5">
          {faqData.map((item) => (
            <FAQItem key={item.question} question={item.question}>
              <p>{item.answer}</p>
            </FAQItem>
          ))}
        </div>
      </section>

      {/* Learn more */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Learn More</h2>
        </div>
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>
            <Link href="/blog/oscar-alternative" className="text-primary hover:text-primary/80">
              OSCAR vs AirwayLab: A Deeper Dive
            </Link>
            {' -- '}full blog post exploring the relationship between both tools.
          </p>
          <p>
            <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
              Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You
            </Link>
            {' -- '}the research case for metrics beyond AHI.
          </p>
          <p>
            <Link href="/about" className="text-primary hover:text-primary/80">
              AirwayLab Methodology
            </Link>
            {' -- '}detailed documentation of all four analysis engines.
          </p>
          <p>
            <a
              href="https://www.sleepfiles.com/OSCAR/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80"
            >
              OSCAR Official Site
            </a>
            {' -- '}download and documentation for OSCAR.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Try AirwayLab Free</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card and get flow limitation analysis in minutes. Use alongside OSCAR
          for the most complete picture of your therapy. No installation, no account required, 100%
          private.
        </p>
        <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/analyze"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-glow transition-colors hover:bg-primary/90"
          >
            Analyze Your Data <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/getting-started"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Getting Started Guide
          </Link>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="mt-10 mb-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Medical Disclaimer</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AirwayLab is not a medical device and is not FDA-cleared or CE-marked. It is provided for
            educational and informational purposes only. The analysis results should not be used as a
            substitute for professional medical advice, diagnosis, or treatment. Always consult
            qualified healthcare providers regarding your sleep therapy and any changes to PAP
            settings.
          </p>
        </div>
      </section>
    </div>
  );
}
