import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Disclaimer } from '@/components/common/disclaimer';
import { EmailOptIn } from '@/components/common/email-opt-in';
import { GitHubStars } from '@/components/common/github-stars';
import { CommunityCounter } from '@/components/common/community-counter';
import { blogPosts } from '@/lib/blog-posts';
import packageJson from '../package.json';
import {
  Activity,
  Waves,
  BarChart3,
  HeartPulse,
  ArrowRight,
  Upload,
  Cpu,
  LineChart,
  Github,
  Lock,
  Scale,
  HardDrive,
  Stethoscope,
  MessageSquare,
  Play,
  Eye,
  Users,
  Heart,
  Star,
  Shield,
  FileText,
  TrendingUp,
  Clock,
} from 'lucide-react';

/* ─── Mocked dashboard metrics for hero visualization ─── */
const heroMetrics = [
  { label: 'Glasgow', value: '1.4', status: 'good' as const, desc: 'Breath-shape score' },
  { label: 'FL Score', value: '28%', status: 'good' as const, desc: 'Flow limitation severity' },
  { label: 'NED Mean', value: '22%', status: 'warn' as const, desc: 'Negative effort dependence' },
  { label: 'RERA', value: '6.2/hr', status: 'warn' as const, desc: 'Respiratory effort arousals' },
  { label: 'ODI-3', value: '4.1/hr', status: 'good' as const, desc: 'Oxygen desaturation index' },
  { label: 'SpO₂ Mean', value: '95.8%', status: 'good' as const, desc: 'Mean blood oxygen' },
];

const statusColors = {
  good: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  warn: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  bad: 'text-red-400 bg-red-500/10 border-red-500/20',
};

const statusDot = {
  good: 'bg-emerald-500',
  warn: 'bg-amber-500',
  bad: 'bg-red-500',
};

/* ─── Engine data ─── */
const engines = [
  {
    icon: Activity,
    title: 'Glasgow Index',
    desc: 'Scores each breath shape on a clinical 0\u20138 scale. See your nightly average and spot nights where flow limitation spiked.',
    metrics: ['Skew', 'Spike', 'Flat Top', 'Multi-Peak', 'No Pause', 'Variable Amp'],
    example: '1.4',
    unit: 'overall',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: Waves,
    title: 'WAT Analysis',
    desc: 'Detects the breathing restriction your AHI completely misses. Measures tidal volume ratios and breathing regularity.',
    metrics: ['FL Score', 'Sample Entropy', 'FFT Periodicity'],
    example: '28%',
    unit: 'FL score',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: BarChart3,
    title: 'NED Analysis',
    desc: 'Measures negative effort dependence \u2014 a flow pattern associated with upper airway resistance in published research.',
    metrics: ['NED Mean', 'Flatness Index', 'M-Shape', 'RERA Index'],
    example: '6.2',
    unit: 'RERA/hr',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: HeartPulse,
    title: 'Oximetry',
    desc: 'Your full oxygen story: desaturation depth, recovery speed, HR surges, and first-half vs second-half split analysis.',
    metrics: ['ODI-3/4', 'T<90%', 'HR Surges', 'Coupled Events'],
    example: '4.1',
    unit: 'ODI-3/hr',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
];

const steps = [
  {
    icon: Upload,
    num: '01',
    title: 'Upload SD Card',
    desc: 'Select your ResMed DATALOG folder. Optionally add a Viatom/Checkme O2 Max pulse oximetry CSV.',
  },
  {
    icon: Cpu,
    num: '02',
    title: 'In-Browser Analysis',
    desc: 'Four engines run entirely client-side via Web Workers. Zero data transmitted by default — you choose what to share.',
  },
  {
    icon: LineChart,
    num: '03',
    title: 'Explore Results',
    desc: 'Interactive per-night dashboard with traffic-light indicators, multi-night trends, and exportable reports.',
  },
];

const trustItems = [
  {
    icon: Lock,
    title: 'Private by Default',
    desc: 'All analysis runs in your browser. Your data stays on your device unless you choose to share it.',
  },
  {
    icon: Github,
    title: 'Open Source',
    desc: 'GPL-3.0 licensed. Every line of code is publicly auditable on GitHub. Community-driven development.',
  },
  {
    icon: Scale,
    title: 'Research-Grade',
    desc: 'Algorithms ported from peer-reviewed sleep science. Glasgow Index, WAT, NED, and 17-metric oximetry framework.',
  },
];

/* ─── Featured blog posts for homepage section ─── */
const featuredSlugs = [
  'understanding-flow-limitation',
  'ahi-normal-still-tired',
  'pap-data-privacy',
  'oscar-alternative',
] as const;
const featuredPosts = featuredSlugs
  .map((slug) => blogPosts.find((p) => p.slug === slug))
  .filter((p): p is NonNullable<typeof p> => p != null);

/* ─── Landing page FAQ (feeds JSON-LD + LLM citation) ─── */
const landingFaqData = [
  {
    question: 'What is AirwayLab?',
    answer:
      'AirwayLab is a free, open-source web tool that analyses ResMed CPAP and BiPAP SD card data using four research-grade engines: Glasgow Index (breath shape scoring), WAT (flow limitation and periodicity), NED (negative effort dependence and RERA detection), and Oximetry (SpO2 and heart rate analysis). All analysis runs entirely in your browser. No data is uploaded to any server unless you choose to share it.',
  },
  {
    question: 'Is AirwayLab free?',
    answer:
      'Yes. All four analysis engines, up to 3 nights per upload, AI insights, and cloud backup are free. Premium tiers (Supporter $9/month, Champion $25/month) add unlimited AI analysis, extended history, PDF reports, and Discord community access. The free tier is complete and will remain free.',
  },
  {
    question: 'What PAP machines does AirwayLab support?',
    answer:
      'AirwayLab currently supports ResMed AirSense 10, AirCurve 10, and partially AirSense 11. These machines store detailed flow waveform data in EDF format on the SD card. Philips Respironics and other manufacturers use different data formats and are not currently supported.',
  },
  {
    question: 'Is my sleep data private?',
    answer:
      'Yes. All core analysis runs entirely in your browser using Web Workers. Your data stays on your device by default. Optional features like AI insights, cloud backup, and data contribution require your explicit consent. The source code is open-source (GPL-3.0) and publicly auditable.',
  },
  {
    question: 'What is the Glasgow Index?',
    answer:
      'The Glasgow Index is a 9-component scoring system that evaluates each breath for flow limitation characteristics including skew, spike, flat top, multi-peak, and variable amplitude. Scores range from 0 to 9 where lower is better. Below 2.0 is generally considered good therapy. It was originally developed by DaveSkvn as an open-source analyser and ported to AirwayLab.',
  },
  {
    question: 'How is AirwayLab different from OSCAR?',
    answer:
      'OSCAR is a desktop application for interactive breath-by-breath waveform browsing. AirwayLab is a browser-based tool that runs automated flow limitation scoring using four independent engines. OSCAR shows your waveforms; AirwayLab analyses them with composite metrics. They are complementary tools, not competitors. Many users benefit from using both.',
  },
];

const landingFaqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: landingFaqData.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

const softwareAppJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AirwayLab',
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web browser',
  url: 'https://airwaylab.app',
  description:
    'Free, open-source PAP therapy analysis tool. Analyses flow limitation, RERAs, and breathing patterns from ResMed SD card data using four research-grade engines, entirely in the browser.',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  license: 'https://www.gnu.org/licenses/gpl-3.0.html',
  author: {
    '@type': 'Organization',
    name: 'AirwayLab',
    url: 'https://airwaylab.app',
  },
};

export default function Home() {
  return (
    <div className="flex flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(landingFaqJsonLd) }}
      />
      {/* ─── Hero ─── */}
      <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col overflow-hidden sm:min-h-[calc(100vh-4rem)]">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative mx-auto flex-1 px-4 pb-8 pt-12 sm:px-6 sm:pb-12 sm:pt-20">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
            {/* Left: Copy */}
            <div className="flex flex-1 flex-col gap-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[11px] font-medium text-emerald-400">
                  <Lock className="h-3 w-3" />
                  Privacy-First
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  v{packageJson.version}+{process.env.NEXT_PUBLIC_GIT_SHA ?? 'dev'} — Free &amp; Open Source
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                See What Your PAP Data
                <br />
                <span className="text-primary">Actually Shows</span>
              </h1>

              {/* Trust signals — prominent above the fold */}
              <div className="flex flex-col gap-2">
                <div className="inline-flex w-fit items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-sm">
                  <Shield className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span className="text-emerald-300">Your data never leaves your browser</span>
                  <span className="text-muted-foreground">— unless you choose to share it</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Don&apos;t trust us?{' '}
                  <a
                    href="https://github.com/airwaylab-app/airwaylab"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-foreground underline decoration-muted-foreground/40 underline-offset-2 transition-colors hover:decoration-foreground"
                  >
                    Check the code yourself
                  </a>
                  {' '}&mdash; it&apos;s open-source under GPL-3.0.
                </p>
              </div>

              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                Your PAP device says your AHI is fine. But you still wake up exhausted.
                AirwayLab uses the Glasgow Index and three more research-grade engines
                to analyze flow limitation, RERAs, and breathing instability
                that standard metrics miss — automatically, in 60 seconds.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Mobile: Demo primary, Upload secondary */}
                <Link href="/analyze?demo" className="sm:hidden" prefetch={false}>
                  <Button size="lg" className="w-full gap-2 shadow-glow">
                    <Play className="h-4 w-4" /> See Demo
                  </Button>
                </Link>
                <Link href="/analyze" className="sm:hidden" prefetch={false}>
                  <Button variant="outline" size="lg" className="w-full gap-2">
                    <Upload className="h-4 w-4" /> Upload Your SD Card
                  </Button>
                </Link>
                {/* Desktop: Upload primary, Demo secondary */}
                <Link href="/analyze" className="hidden sm:block" prefetch={false}>
                  <Button size="lg" className="gap-2 shadow-glow">
                    <Upload className="h-4 w-4" /> Upload Your SD Card
                  </Button>
                </Link>
                <Link href="/analyze?demo" className="hidden sm:block" prefetch={false}>
                  <Button variant="outline" size="lg" className="gap-2">
                    <Play className="h-4 w-4" /> See Demo
                  </Button>
                </Link>
                <p className="text-[11px] text-muted-foreground/75 sm:hidden">
                  Uploading requires a desktop computer with an SD card reader.
                </p>
                <div className="sm:hidden">
                  <EmailOptIn variant="inline" source="landing-mobile-reminder" />
                </div>
              </div>
              <Link
                href="/about"
                className="text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm"
              >
                Learn about the methodology →
              </Link>
            </div>

            {/* Right: Mocked dashboard metrics (decorative) */}
            <div className="flex-1 lg:max-w-md" aria-hidden="true">
              <div className="rounded-xl border border-border/50 bg-card p-4 shadow-glow-sm sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    Night 2025-01-15 — 7h 42m
                  </span>
                  <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                    BiPAP ST
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {heroMetrics.map((m) => (
                    <div
                      key={m.label}
                      className={`rounded-lg border px-3 py-2.5 ${statusColors[m.status]}`}
                    >
                      <div className="mb-1 flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${statusDot[m.status]}`} />
                        <span className="text-[10px] text-muted-foreground">{m.label}</span>
                      </div>
                      <span className="font-mono text-lg font-semibold tabular-nums">
                        {m.value}
                      </span>
                      <span className="mt-0.5 text-[9px] text-muted-foreground/70">{m.desc}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground/75">
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Good
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" /> Monitor
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-red-500" /> Elevated
                  </div>
                  <span className="ml-auto italic">Example data</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Social Proof (pinned to bottom of hero viewport) ─── */}
        <div className="relative border-t border-border/50 bg-card/20">
          <div className="container mx-auto flex flex-col items-center gap-3 px-4 py-4 sm:px-6 sm:py-5">
            <CommunityCounter variant="research" className="flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-1.5 text-sm font-medium text-rose-300 sm:text-base" />
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
              <GitHubStars className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm" />
              <CommunityCounter className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm" />
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                <Activity className="h-3.5 w-3.5 text-blue-400" />
                <span>4 research-grade engines</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>Private by default</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
                <FileText className="h-3.5 w-3.5 text-primary" />
                <span>GPL-3.0 open source</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Trust Bar ─── */}
      <section className="border-y border-border/50 bg-card/30">
        <div className="container mx-auto grid gap-6 px-4 py-8 sm:grid-cols-3 sm:gap-8 sm:px-6 sm:py-10">
          {trustItems.map((t) => (
            <div key={t.title} className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <t.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{t.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="border-y border-border/50 bg-card/20 py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mb-8 sm:mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              How It Works
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              From SD card to actionable insights in seconds
            </p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-0 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.num} className="relative flex gap-4 pb-8 sm:flex-col sm:items-center sm:pb-0 sm:text-center">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <>
                    <div className="absolute left-5 top-12 hidden h-[1px] w-[calc(100%-40px)] bg-border/50 sm:block" style={{ left: 'calc(50% + 24px)' }} />
                    <div className="absolute left-5 top-12 h-[calc(100%-48px)] w-[1px] bg-border/50 sm:hidden" />
                  </>
                )}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-card font-mono text-xs font-bold text-primary sm:mb-4 sm:h-12 sm:w-12 sm:text-sm">
                  {s.num}
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold">{s.title}</h3>
                  <p className="text-xs leading-relaxed text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/getting-started"
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              Need more detail? Read the step-by-step guide <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </div>

          {/* Mid-page CTA */}
          <div className="mx-auto mt-10 max-w-2xl text-center sm:mt-14">
            <p className="text-sm text-muted-foreground">
              Ready? Upload your SD card to see your results in 60 seconds.
            </p>
            <Link href="/analyze" prefetch={false} className="mt-4 inline-block">
              <Button size="lg" className="gap-2">
                <Upload className="h-4 w-4" /> Upload Your SD Card
              </Button>
            </Link>
          </div>

          {/* What You'll Need */}
          <div className="mx-auto mt-10 max-w-4xl rounded-xl border border-border/50 bg-card/50 p-5 sm:mt-14 sm:p-6">
            <h3 className="mb-3 text-sm font-semibold">What You&apos;ll Need</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-medium">ResMed SD Card</p>
                  <p className="text-[11px] text-muted-foreground">
                    AirSense 10/11 or AirCurve 10 with DATALOG folder. Select the entire SD card or just the DATALOG directory.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Stethoscope className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Pulse Oximetry CSV <span className="text-[10px]">(optional)</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Viatom/Checkme O2 Max CSV for SpO₂, heart rate surges, and coupled cardio-respiratory analysis.
                  </p>
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Use alongside{' '}
              <a
                href="https://www.sleepfiles.com/OSCAR/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-muted-foreground/50 underline-offset-2 transition-colors hover:text-foreground"
              >
                OSCAR
              </a>{' '}
              for automated scoring and a different lens on your therapy data.
            </p>
          </div>

          {/* For Providers */}
          <div className="mx-auto mt-6 max-w-4xl rounded-xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Stethoscope className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Sleep consultant or clinician?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Your patients share a link, you see the full analysis. No software installs, no file transfers.
                </p>
              </div>
            </div>
            <Link
              href="/providers"
              className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              See how AirwayLab fits your workflow <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Not on PAP yet? */}
          <div className="mx-auto mt-6 max-w-4xl rounded-xl border border-border/50 bg-card/30 p-5 sm:p-6">
            <h3 className="text-sm font-semibold">Not on PAP therapy yet?</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              AirwayLab requires PAP flow data from a ResMed SD card.
              If you suspect sleep-disordered breathing but aren&apos;t yet diagnosed,
              talk to your doctor about a sleep study. Our blog has resources
              to help you understand what to ask for.
            </p>
            <Link
              href="/blog"
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
            >
              Read the blog <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Mission ─── */}
      <section className="container mx-auto px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-8 sm:mb-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Why We Built This
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Your machine collects thousands of data points every night. Most of it never gets looked at. We think that&apos;s wrong.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <Eye className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold">AHI Doesn&apos;t Tell the Whole Story</h3>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Millions of PAP users have an AHI under 5 but still feel terrible. Flow limitation, RERAs, and breathing pattern instability go undetected by the one number most clinicians check. AirwayLab makes that hidden data visible.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Lock className="h-4 w-4 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold">Your Data, Your Choice</h3>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Every analysis runs in your browser by default. The code is open source and GPL-3.0 licensed — you can verify exactly what happens with your data. When you&apos;re ready, contributing anonymised scores helps the whole community get better insights.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <Users className="h-4 w-4 text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold">Accessible to Everyone</h3>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Not just people with technical skills. Not just those who can afford specialist clinics. Everyone on PAP therapy deserves access to detailed analysis of their therapy data beyond a single number.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-rose-500/10 p-2">
                <Heart className="h-4 w-4 text-rose-400" />
              </div>
              <h3 className="text-sm font-semibold">Premium Funds Development</h3>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              The free tier is complete and always will be. Premium features like AI-powered therapy insights exist to fund continued development — not to gate essential analysis. If you never pay a cent, you still get the full toolkit.
            </p>
          </div>
        </div>
      </section>

      {/* ─── Vision ─── */}
      <section className="border-y border-border/50 bg-card/20">
        <div className="container mx-auto px-4 py-14 sm:px-6 sm:py-20">
          <div className="mb-8 sm:mb-12">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Where We&apos;re Going
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              AirwayLab is more than a tool — it&apos;s the first step toward a future where breathing data drives better therapy for everyone.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <Eye className="h-4 w-4 text-emerald-400" />
                </div>
                <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-400">
                  Now
                </span>
              </div>
              <h3 className="mb-2 text-sm font-semibold">Your data, visible</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                AirwayLab analyses your SD card data and shows you what your machine can&apos;t — flow limitation, RERAs, breathing patterns. Free, open source, private.
              </p>
            </div>
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Users className="h-4 w-4 text-blue-400" />
                </div>
                <span className="rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                  Next
                </span>
              </div>
              <h3 className="mb-2 text-sm font-semibold">Shared insights, collective intelligence</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                With your explicit consent, contribute anonymised breathing scores to the largest PAP therapy research dataset. Patterns that no single sleep lab has the data to find.
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <TrendingUp className="h-4 w-4 text-amber-400" />
                </div>
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                  Future
                </span>
              </div>
              <h3 className="mb-2 text-sm font-semibold">Smarter therapy for everyone</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Aggregated insights from thousands of real-world nights could help researchers, clinicians, and device manufacturers understand real-world therapy patterns at scale — beyond AHI.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Engine Showcase ─── */}
      <section className="container mx-auto px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-8 sm:mb-12">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Four Engines, One Dashboard
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Research-grade algorithms adapted from peer-reviewed sleep science literature
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {engines.map((e) => (
            <div
              key={e.title}
              className={`group rounded-xl border ${e.border} bg-card/50 p-5 transition-colors hover:bg-card sm:p-6`}
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${e.bg}`}>
                    <e.icon className={`h-4 w-4 ${e.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{e.title}</h3>
                    <p className="text-xs text-muted-foreground">{e.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`font-mono text-xl font-bold tabular-nums ${e.color}`}>
                    {e.example}
                  </span>
                  <div className="text-[10px] text-muted-foreground">{e.unit}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {e.metrics.map((m) => (
                  <span
                    key={m}
                    className="rounded-md border border-border/50 bg-background/50 px-2 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

      </section>

      {/* ─── Dashboard Preview ─── */}
      <section className="container mx-auto px-4 py-14 sm:px-6 sm:py-20">
        <div className="mb-10 text-center sm:mb-14">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            What Your Analysis Looks Like
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Upload once, get a complete picture. Every metric scored, every
            breath analyzed.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {/* Insight Alerts */}
          <div className="group rounded-xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-border">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                <MessageSquare className="h-4 w-4 text-amber-400" />
              </div>
              <h3 className="text-sm font-semibold">Smart Insights</h3>
            </div>
            <div className="space-y-2">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                <p className="text-xs font-medium text-amber-300">Glasgow worsened from previous night</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Changed from 1.2 to 1.8 (+0.6).</p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <p className="text-xs font-medium text-emerald-300">Settings change improved flow limitation</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Glasgow Index went from 2.1 to 1.5.</p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
                <p className="text-xs font-medium text-emerald-300">Trending down over 7 nights</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">Flow limitation is improving (2.1 → 1.8).</p>
              </div>
            </div>
          </div>

          {/* Metric Scores */}
          <div className="group rounded-xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-border">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold">Research-Grade Scoring</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground">Glasgow Index</p>
                <p className="font-mono text-xl font-semibold tabular-nums">1.8</p>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground">FL Score</p>
                <p className="font-mono text-xl font-semibold tabular-nums">32%</p>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground">NED Mean</p>
                <p className="font-mono text-xl font-semibold tabular-nums">20%</p>
              </div>
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2.5">
                <p className="text-[10px] text-muted-foreground">RERA Index</p>
                <p className="font-mono text-xl font-semibold tabular-nums">6.4</p>
              </div>
            </div>
            <p className="mt-3 text-center text-[10px] italic text-muted-foreground/75">Example data</p>
          </div>

          {/* Glasgow Radar */}
          <div className="group rounded-xl border border-border/60 bg-card/40 p-5 transition-colors hover:border-border">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Activity className="h-4 w-4 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold">Glasgow Breath Shapes</h3>
            </div>
            {/* SVG radar chart mockup */}
            <div className="flex justify-center">
              <svg viewBox="0 0 200 200" className="h-40 w-40 text-muted-foreground/30" fill="none">
                {/* Grid lines */}
                <polygon points="100,20 176,60 176,140 100,180 24,140 24,60" stroke="currentColor" strokeWidth="0.5" />
                <polygon points="100,40 156,70 156,130 100,160 44,130 44,70" stroke="currentColor" strokeWidth="0.5" />
                <polygon points="100,60 136,80 136,120 100,140 64,120 64,80" stroke="currentColor" strokeWidth="0.5" />
                {/* Spokes */}
                <line x1="100" y1="20" x2="100" y2="180" stroke="currentColor" strokeWidth="0.5" />
                <line x1="24" y1="60" x2="176" y2="140" stroke="currentColor" strokeWidth="0.5" />
                <line x1="24" y1="140" x2="176" y2="60" stroke="currentColor" strokeWidth="0.5" />
                {/* Data shape */}
                <polygon
                  points="100,75 120,88 115,115 100,120 85,115 80,88"
                  fill="hsl(var(--primary))"
                  fillOpacity="0.15"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.5"
                />
                {/* Labels */}
                <text x="100" y="14" textAnchor="middle" className="fill-muted-foreground text-[8px]">Skew</text>
                <text x="182" y="58" textAnchor="start" className="fill-muted-foreground text-[8px]">Spike</text>
                <text x="182" y="144" textAnchor="start" className="fill-muted-foreground text-[8px]">Flat Top</text>
                <text x="100" y="196" textAnchor="middle" className="fill-muted-foreground text-[8px]">Multi-Peak</text>
                <text x="14" y="144" textAnchor="end" className="fill-muted-foreground text-[8px]">Multi-Breath</text>
                <text x="14" y="58" textAnchor="end" className="fill-muted-foreground text-[8px]">Var. Amp</text>
              </svg>
            </div>
            <p className="mt-2 text-center text-[10px] text-muted-foreground">
              9-component breath shape analysis
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/analyze?demo" prefetch={false}>
            <Button variant="outline" size="sm" className="gap-2">
              <Play className="h-3.5 w-3.5" />
              Try the interactive demo
            </Button>
          </Link>
        </div>
      </section>

      {/* ─── Open Source & Community ─── */}
      <section className="container mx-auto px-4 py-12 sm:px-6 sm:py-16">
        <div className="flex flex-col items-center gap-8 text-center">
          {/* GitHub CTA */}
          <div className="w-full max-w-xl rounded-xl border border-border/50 bg-card/50 p-6 sm:p-8">
            <div className="mb-3 flex items-center justify-center gap-2">
              <Github className="h-5 w-5 text-foreground" />
              <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                Open Source on GitHub
              </h2>
            </div>
            <p className="mx-auto mb-5 max-w-md text-sm text-muted-foreground">
              AirwayLab is GPL-3.0. Star the repo to follow development, report issues, or contribute.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a href="https://github.com/airwaylab-app/airwaylab" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="gap-2">
                  <Star className="h-4 w-4" /> Star on GitHub
                </Button>
              </a>
              <a
                href="https://github.com/airwaylab-app/airwaylab"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                View source code →
              </a>
            </div>
          </div>

          {/* Community Links */}
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Join the conversation
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <a
                href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || 'https://discord.gg/DK7aN847Mn'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Discord
              </a>
              <a
                href="https://www.apneaboard.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                ApneaBoard
              </a>
              <a
                href="https://reddit.com/r/SleepApnea"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                r/SleepApnea
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Blog / Learn Section ─── */}
      <section className="border-t border-border/50 bg-card/20">
        <div className="container mx-auto px-4 py-12 sm:px-6 sm:py-16">
          <div className="mb-8 flex items-end justify-between sm:mb-10">
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Learn About Your Therapy
              </h2>
              <p className="mt-2 max-w-lg text-sm text-muted-foreground">
                Evidence-based articles about flow limitation, AHI, PAP data privacy, and getting more from your therapy data.
              </p>
            </div>
            <Link
              href="/blog"
              className="hidden items-center gap-1 text-sm text-primary hover:underline sm:inline-flex"
            >
              All articles <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featuredPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col rounded-xl border border-border/50 bg-card/50 p-5 transition-all hover:border-primary/30 hover:bg-card"
              >
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {post.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="mb-2 text-sm font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
                  {post.title}
                </h3>
                <p className="mb-3 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                  {post.description}
                </p>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground/70">
                  <Clock className="h-3 w-3" />
                  {post.readTime}
                </div>
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center sm:hidden">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              All articles <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className="container mx-auto px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>
        <div className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2">
          {landingFaqData.map((item) => (
            <div
              key={item.question}
              className="rounded-lg border border-border/50 bg-card/30 p-5"
            >
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                {item.question}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {item.answer}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          More questions?{' '}
          <Link href="/about" className="text-primary hover:underline">
            Read about our methodology
          </Link>
          {' '}or{' '}
          <Link href="/glossary" className="text-primary hover:underline">
            browse the glossary
          </Link>
        </p>
      </section>

      {/* ─── CTA + Email ─── */}
      <section className="border-t border-border/50 bg-card/20">
        <div className="container mx-auto flex flex-col items-center gap-5 px-4 py-12 text-center sm:px-6 sm:py-16">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Ready to Analyze Your Therapy Data?
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            No sign-up, no cloud upload, no cost. Just drag your SD card folder
            and explore your data in seconds.
          </p>
          <Link href="/analyze" prefetch={false}>
            <Button size="lg" className="gap-2 shadow-glow">
              <Upload className="h-4 w-4" /> Upload Your SD Card
            </Button>
          </Link>
          <div className="mt-2">
            <EmailOptIn variant="hero" source="landing-cta" />
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
}
