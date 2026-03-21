import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  AlertTriangle,
  BookOpen,
  Eye,
  Globe,
  Lock,
  Scale,
  Smartphone,
  TrendingUp,
} from 'lucide-react';
import { FAQItem } from '@/components/common/faq-item';

export const metadata: Metadata = {
  title: 'AirwayLab vs myAir: Beyond Basic CPAP Metrics',
  description:
    'Compare AirwayLab and ResMed myAir for CPAP analysis. Go beyond AHI, mask fit, and usage hours with flow limitation scoring, RERA detection, Glasgow Index, and privacy-first browser analysis.',
  openGraph: {
    title: 'AirwayLab vs myAir: Beyond Basic CPAP Metrics',
    description:
      'Compare AirwayLab and ResMed myAir for CPAP analysis. Go beyond AHI with flow limitation scoring, RERA detection, and the Glasgow Index.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/compare/myair',
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
      name: 'AirwayLab vs myAir',
      item: 'https://airwaylab.app/compare/myair',
    },
  ],
};

const faqData = [
  {
    question: 'Should I stop using myAir if I use AirwayLab?',
    answer:
      'Not necessarily. myAir is useful for daily compliance tracking (did I use the machine? How many hours? Any big leaks?). Think of myAir as your daily check-in and AirwayLab as your detailed analysis tool. myAir shows the basics; AirwayLab shows what is happening beneath the surface.',
  },
  {
    question: 'Why does myAir show a good score but I still feel tired?',
    answer:
      'myAir scores are based primarily on AHI, usage hours, mask fit, and mask on/off events. A "good" myAir score means your machine-reported metrics look fine. But it does not measure flow limitation, RERAs, or breathing pattern instability -- the things that often cause residual tiredness despite a low AHI. AirwayLab analyses these hidden patterns.',
  },
  {
    question: 'Does AirwayLab work with myAir data?',
    answer:
      'AirwayLab does not import from myAir. Instead, both tools read from the same ResMed machine. myAir gets its data via cellular upload from the machine. AirwayLab reads the detailed flow waveform data from your SD card, which contains far more information than what myAir receives.',
  },
  {
    question: 'What does AirwayLab see that myAir does not?',
    answer:
      'myAir receives a simplified summary: AHI, usage hours, mask fit, and leak data. The SD card contains the full flow waveform -- every breath, sampled 25 times per second. AirwayLab analyses these raw waveforms to compute flow limitation scores, detect RERAs, calculate the Glasgow Index, and identify breathing pattern abnormalities that the simplified summary hides.',
  },
  {
    question: 'Does myAir share my data with my insurance company?',
    answer:
      'ResMed states that myAir data may be shared with your healthcare provider and, in some regions, with insurance companies for compliance monitoring. AirwayLab processes everything in your browser by default -- your data does not leave your device unless you explicitly opt in. Check the myAir terms of service for your specific region.',
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

export default function CompareMyAirPage() {
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
        <span className="text-foreground">AirwayLab vs myAir</span>
      </nav>

      {/* Header */}
      <div className="mb-10 sm:mb-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          AirwayLab vs myAir: Beyond Basic CPAP Metrics
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          myAir is ResMed&apos;s official companion app and a fine starting point for tracking basic
          CPAP compliance. But if you want to understand <em>why</em> you still feel tired despite a
          good myAir score, you need to look deeper than AHI. That is where AirwayLab comes in.
        </p>
      </div>

      {/* The AHI problem */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Eye className="h-5 w-5 text-amber-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Problem with AHI-Only Analysis</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            myAir shows you four things: AHI (apnea-hypopnea index), usage hours, mask fit events,
            and leak data. These metrics matter for basic compliance, but they miss the most common
            cause of residual tiredness on CPAP: <strong className="text-foreground">flow limitation</strong>.
          </p>
          <p>
            Flow limitation happens when your airway partially narrows during sleep, not enough to
            trigger an apnea or hypopnea (so AHI stays low), but enough to disrupt sleep quality
            through respiratory effort-related arousals (RERAs) and breathing pattern instability.
            Research suggests this affects a significant portion of CPAP users who are &quot;treated&quot;
            by AHI standards but still symptomatic.
          </p>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="text-sm font-semibold text-amber-400">
              Your myAir score can be 100 while flow limitation quietly fragments your sleep.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              A &quot;perfect&quot; myAir score means your AHI is low, you used the machine long
              enough, and your mask fit was acceptable. It says nothing about whether your breathing
              pattern was actually normal or whether subtle flow limitation was disrupting your sleep
              architecture.
            </p>
          </div>
        </div>
      </section>

      {/* What myAir does well */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Smartphone className="h-5 w-5 text-sky-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What myAir Does Well</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            myAir is not a bad app. It serves a specific purpose well:
          </p>
          <ul className="ml-4 space-y-2">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <span>
                <strong className="text-foreground">Automatic data sync</strong> from your ResMed
                machine via cellular connection -- no SD card needed for daily checks
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <span>
                <strong className="text-foreground">Simple daily score</strong> that is easy to
                understand for new CPAP users
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <span>
                <strong className="text-foreground">Coaching tips</strong> for improving mask fit and
                building CPAP habits
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <span>
                <strong className="text-foreground">Free with your device</strong> -- no additional
                cost or setup beyond downloading the app
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />
              <span>
                <strong className="text-foreground">Compliance documentation</strong> -- some
                insurance providers accept myAir data for compliance verification
              </span>
            </li>
          </ul>
          <p>
            For someone newly starting CPAP therapy, myAir is a good introduction. The daily score
            gamification can help build consistent usage habits.
          </p>
        </div>
      </section>

      {/* What AirwayLab reveals */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">What AirwayLab Reveals</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            AirwayLab reads the raw flow waveform data from your SD card -- every breath, sampled 25
            times per second. This is the detailed data that myAir never sees:
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Flow Limitation Scoring</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Four engines analyse every breath for signs of airway narrowing: Glasgow Index (9
                breath shape components), WAT (flatness scoring), NED (peak-to-mid flow ratio), and
                Oximetry (if connected).
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">RERA Detection</p>
              <p className="mt-1 text-xs text-muted-foreground">
                AirwayLab identifies sequences of flow-limited breaths ending in arousals --
                Respiratory Effort-Related Arousals (RERAs) that fragment sleep but never appear in
                your AHI or myAir score.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Glasgow Index</p>
              <p className="mt-1 text-xs text-muted-foreground">
                A composite score (0-8) that summarises the overall health of your breathing pattern
                across 9 clinical dimensions. Lower is better. myAir has no equivalent metric.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">H1/H2 Split Analysis</p>
              <p className="mt-1 text-xs text-muted-foreground">
                AirwayLab compares the first half and second half of your night. Position changes
                and REM sleep often worsen flow limitation later -- a pattern completely invisible in
                myAir.
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
                <th className="px-4 py-3 text-center font-semibold text-foreground">myAir</th>
                <th className="px-4 py-3 text-center font-semibold text-foreground">AirwayLab</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">AHI tracking</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Usage hours</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Mask fit / leak data</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
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
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">17 metrics</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">AI-powered insights</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (opt-in)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">H1/H2 night comparison</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Automatic data sync</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (cellular)</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No (SD card)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Data stays on device</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No (ResMed servers)</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (default)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Open source</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">No</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">Yes (GPL-3.0)</td>
              </tr>
              <tr className="border-b border-border/30">
                <td className="py-2.5 pr-4">Exportable reports</td>
                <td className="px-4 py-2.5 text-center text-muted-foreground/60">Limited</td>
                <td className="px-4 py-2.5 text-center text-emerald-400">CSV, JSON, PDF</td>
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

      {/* When to use each */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Globe className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">When to Use Each Tool</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
            <p className="text-sm font-semibold text-sky-400">myAir is fine when you...</p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>Are new to CPAP and building usage habits</li>
              <li>Just need a daily compliance check</li>
              <li>Want automatic sync without touching the SD card</li>
              <li>Need compliance data for your insurance provider</li>
              <li>Feel well-rested and your AHI is controlled</li>
            </ul>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <p className="text-sm font-semibold text-emerald-400">
              AirwayLab is essential when you...
            </p>
            <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
              <li>Still feel tired despite a good myAir score</li>
              <li>Suspect flow limitation or UARS</li>
              <li>Are adjusting pressure settings or EPR</li>
              <li>Want to understand your breathing patterns in depth</li>
              <li>Need detailed reports for your sleep clinician</li>
              <li>Care about keeping your health data private</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section className="mt-10">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-emerald-400" />
          <h2 className="text-xl font-bold sm:text-2xl">The Privacy Difference</h2>
        </div>
        <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          <p>
            myAir uploads your sleep data to ResMed&apos;s servers automatically via cellular
            connection. This data may be shared with healthcare providers and, depending on your
            region and settings, with insurance companies for compliance monitoring.
          </p>
          <p>
            AirwayLab takes the opposite approach. All core analysis runs entirely in your browser.
            Your data does not leave your device unless you explicitly opt in to optional features
            like AI-powered insights (which sends only aggregate metrics, never raw waveform data).
            The code is open source and auditable.
          </p>
          <p>
            For many CPAP users, the convenience of myAir&apos;s automatic sync outweighs the
            privacy trade-off. But if you prefer to control where your health data goes, AirwayLab
            gives you that control without sacrificing analysis depth.
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
            <Link href="/blog/beyond-ahi" className="text-primary hover:text-primary/80">
              Beyond AHI: Why Your Sleep Apnea Score Might Be Misleading You
            </Link>
            {' -- '}the research case for looking beyond AHI.
          </p>
          <p>
            <Link
              href="/blog/understanding-flow-limitation"
              className="text-primary hover:text-primary/80"
            >
              Understanding Flow Limitation
            </Link>
            {' -- '}what flow limitation is and why it matters.
          </p>
          <p>
            <Link href="/about" className="text-primary hover:text-primary/80">
              AirwayLab Methodology
            </Link>
            {' -- '}how each analysis engine works.
          </p>
          <p>
            <Link href="/compare/oscar" className="text-primary hover:text-primary/80">
              AirwayLab vs OSCAR
            </Link>
            {' -- '}comparison with the open-source desktop tool.
          </p>
          <p>
            <Link href="/compare/sleephq" className="text-primary hover:text-primary/80">
              AirwayLab vs SleepHQ
            </Link>
            {' -- '}comparison with the cloud-based analysis platform.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="mt-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">See What myAir Does Not Show You</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card and discover the flow limitation patterns hiding behind your
          myAir score. Four research-grade engines, composite metrics, RERA detection, and trend
          tracking. No installation, no account required, 100% private.
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
