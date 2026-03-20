import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  AlertTriangle,
  BookOpen,
  Cloud,
  DollarSign,
  Globe,
  Lock,
  Scale,
  Smartphone,
} from 'lucide-react';
import { FAQItem } from '@/components/common/faq-item';

export const metadata: Metadata = {
  title: 'AirwayLab vs SleepHQ: Privacy-First CPAP Analysis Compared',
  description:
    'Compare AirwayLab and SleepHQ for CPAP data analysis. Browser-only privacy vs cloud convenience, four analysis engines vs basic metrics, free open-source vs $15/month subscription.',
  openGraph: {
    title: 'AirwayLab vs SleepHQ: Privacy-First CPAP Analysis Compared',
    description:
      'Compare AirwayLab and SleepHQ for CPAP data analysis. Browser-only privacy vs cloud convenience, free open-source vs $15/month subscription.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/compare/sleephq',
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
      name: 'AirwayLab vs SleepHQ',
      item: 'https://airwaylab.app/compare/sleephq',
    },
  ],
};

const faqData = [
  {
    question: 'Is SleepHQ safe to use with my health data?',
    answer:
      'SleepHQ stores your data on their cloud servers. They have privacy policies in place, but your sleep data does leave your device. If keeping your health data entirely local is important to you, AirwayLab processes everything in your browser by default -- no data leaves your device unless you explicitly opt in.',
  },
  {
    question: 'Why is AirwayLab free when SleepHQ charges $15/month?',
    answer:
      'AirwayLab is open source (GPL-3.0) and runs entirely in your browser, which means minimal server costs for core analysis. Premium features like AI-powered insights are optional paid additions. SleepHQ runs on cloud infrastructure with mobile apps, which has higher operating costs. Both are valid business models for different approaches.',
  },
  {
    question: 'Can I use both SleepHQ and AirwayLab?',
    answer:
      'Yes. They read from the same SD card data. SleepHQ gives you mobile convenience and cloud access, while AirwayLab gives you deeper flow limitation analysis and privacy. Some users use SleepHQ for daily quick checks and AirwayLab for detailed analysis when adjusting settings.',
  },
  {
    question: 'Does SleepHQ have flow limitation analysis like AirwayLab?',
    answer:
      'No. SleepHQ focuses on standard metrics (AHI, leak rate, usage hours) with charting and trends. It does not compute flow limitation scores, Glasgow Index, NED, RERA estimates, or the other research-grade metrics AirwayLab provides. These metrics are what differentiate AirwayLab from every other CPAP analysis tool.',
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

export default function CompareSleepHQPage() {
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
        <span className="text-foreground">AirwayLab vs SleepHQ</span>
      </nav>

      {/* Header */}
      <div className="mb-10 sm:mb-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          AirwayLab vs SleepHQ: Privacy-First CPAP Analysis Compared
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          SleepHQ and AirwayLab both aim to help CPAP users understand their therapy data, but they
          take fundamentally different approaches. SleepHQ prioritises cloud convenience and mobile
          access. AirwayLab prioritises privacy, analysis depth, and open-source transparency.
        </p>
      </div>

      {/* Key Differences */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Scale className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Key Differences</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <Lock className="mb-2 h-5 w-5 text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-400">Privacy</p>
            <p className="mt-1 text-xs text-muted-foreground">
              AirwayLab processes everything in your browser. SleepHQ uploads your data to cloud
              servers. For health data, this distinction matters.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <Globe className="mb-2 h-5 w-5 text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-400">Analysis Depth</p>
            <p className="mt-1 text-xs text-muted-foreground">
              AirwayLab runs four research-grade engines for flow limitation. SleepHQ provides
              standard metrics (AHI, leaks, usage) with charting.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <DollarSign className="mb-2 h-5 w-5 text-emerald-400" />
            <p className="text-sm font-semibold text-emerald-400">Cost</p>
            <p className="mt-1 text-xs text-muted-foreground">
              AirwayLab&apos;s core analysis is free and always will be. SleepHQ starts at $15/month
              for full features.
            </p>
          </div>
        </div>
      </section>

      {/* What SleepHQ Does Well */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Cloud className="h-5 w-5 text-purple-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What SleepHQ Does Well</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            SleepHQ has built a popular platform with genuine strengths for users who value
            convenience:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Mobile app</strong> with push notifications and
                quick daily summaries
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Cloud storage</strong> for accessing your data
                from any device without carrying an SD card
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Auto-sync</strong> from some devices, reducing
                the manual SD card upload step
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Multi-device support</strong> beyond just ResMed
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-purple-400" />
              <span>
                <strong className="text-foreground">Large user community</strong> with 100K+ users
                providing social proof and shared insights
              </span>
            </li>
          </ul>
          <p>
            If you want a &quot;check your phone in the morning&quot; experience and don&apos;t mind
            cloud data storage, SleepHQ delivers that well.
          </p>
        </div>
      </section>

      {/* Where AirwayLab Differs */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Smartphone className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">Where AirwayLab Differs</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab takes a different approach: deeper analysis, stronger privacy, and open-source
            transparency:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Four Analysis Engines</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Glasgow Index, WAT (FL Score, Regularity, Periodicity), NED (RERA detection,
                Flatness Index, M-shape), and a 17-metric Oximetry pipeline. SleepHQ provides
                standard metrics that PAP machines already report.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">True Browser-Only Processing</p>
              <p className="mt-1 text-xs text-muted-foreground">
                All analysis runs in a Web Worker in your browser. Your sleep data never leaves your
                device unless you explicitly consent to optional features like AI insights. No account
                required for core analysis.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Open Source (GPL-3.0)</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Every line of code is auditable. You can verify exactly what happens with your health
                data. SleepHQ is proprietary -- you trust their word on what happens with your data.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Free Core Analysis</p>
              <p className="mt-1 text-xs text-muted-foreground">
                All four engines, insights, exports, and persistence are free. Premium AI-powered
                analysis is an optional paid addition, not a paywall around essential features.
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
                <th className="px-4 py-3 text-center font-semibold text-foreground">SleepHQ</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">AirwayLab</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
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
                <td className="py-2.5 pr-4">Mobile app</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Cloud storage</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">Optional (opt-in)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Auto-sync from device</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Some devices</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No (SD card)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Multi-device support</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">ResMed only</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Data stays on device</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No (cloud)</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (default)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Open source</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (GPL-3.0)</td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4">Cost</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground">$15/mo</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Free core</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* When to use each */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">When to Use Each Tool</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
            <p className="text-sm font-semibold text-purple-400">SleepHQ is better when you...</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>Want a mobile app for daily quick checks</li>
              <li>Prefer automatic cloud sync over manual SD card uploads</li>
              <li>Use a non-ResMed device</li>
              <li>Value convenience over analysis depth</li>
              <li>Don&apos;t mind your health data being stored on remote servers</li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">
              AirwayLab is better when you...
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>Want your health data to stay on your device</li>
              <li>Need flow limitation analysis beyond standard AHI</li>
              <li>Want to track Glasgow Index, NED, and RERA metrics</li>
              <li>Prefer open-source tools you can verify</li>
              <li>Want comprehensive analysis without a monthly subscription</li>
              <li>Need exportable reports for your clinician</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Privacy deep dive */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Privacy Difference</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            Sleep data is health data. Where it goes and who can access it matters. The two tools
            take opposite approaches:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4">
              <p className="text-sm font-semibold text-purple-400">SleepHQ: Cloud-First</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your data is uploaded to SleepHQ&apos;s servers for processing and storage. This
                enables mobile access and device sync but means your health data lives on third-party
                infrastructure. SleepHQ is a US-based company subject to US data laws.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">AirwayLab: Browser-First</p>
              <p className="mt-1 text-xs text-muted-foreground">
                All core analysis runs entirely in your browser via Web Workers. Your data never
                leaves your device unless you explicitly consent to optional features like AI insights
                (which sends only aggregate metrics, never raw waveforms). The code is open for
                inspection.
              </p>
            </div>
          </div>
          <p>
            Neither approach is objectively &quot;better&quot; -- it depends on your privacy
            priorities. If you are comfortable with cloud storage for the convenience benefits,
            SleepHQ works well. If you want your health data to stay under your direct control,
            AirwayLab is built for that from the ground up.
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
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation
            </Link>
            {' -- '}what flow limitation is and why standard metrics miss it.
          </p>
          <p>
            <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
              Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You
            </Link>
            {' -- '}the research case for metrics beyond AHI.
          </p>
          <p>
            <Link href="/privacy" className="text-primary hover:text-primary/80">
              AirwayLab Privacy Policy
            </Link>
            {' -- '}exactly what data AirwayLab collects (and does not collect).
          </p>
          <p>
            <Link href="/compare/oscar" className="text-primary hover:text-primary/80">
              AirwayLab vs OSCAR
            </Link>
            {' -- '}how AirwayLab compares to the desktop waveform viewer.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Try AirwayLab Free</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card and get flow limitation analysis in minutes. Four research-grade
          engines, composite metrics, RERA detection, and trend tracking. No installation, no account
          required, 100% private.
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
