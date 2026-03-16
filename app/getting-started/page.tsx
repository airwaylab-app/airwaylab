import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Disclaimer } from '@/components/common/disclaimer';
import {
  HardDrive,
  Monitor,
  Upload,
  BarChart3,
  Lightbulb,
  Shield,
  Play,
  ArrowRight,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { GettingStartedTracker } from '@/components/common/getting-started-tracker';

export const metadata: Metadata = {
  title: 'Getting Started with AirwayLab - Step-by-Step Guide',
  description:
    'Learn how to use AirwayLab in 5 simple steps. From SD card to sleep analysis results. Designed for CPAP and BiPAP users.',
  openGraph: {
    title: 'Getting Started with AirwayLab - Step-by-Step Guide',
    description:
      'Learn how to use AirwayLab in 5 simple steps. From SD card to sleep analysis results.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/getting-started',
  },
};

const steps = [
  {
    num: '01',
    icon: HardDrive,
    title: 'Find Your SD Card',
    body: 'Your ResMed machine has an SD card slot on the side (AirSense 10/11) or back (AirCurve 10). Power off your machine, then gently push the card to eject it.',
    callout: 'Your data stays on the SD card even after you remove it. You can put it back when you\'re done.',
    extra: (
      <div className="mt-3">
        <p className="text-[11px] font-medium text-muted-foreground">Supported devices</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {['AirSense 10', 'AirSense 11', 'AirCurve 10'].map((d) => (
            <span
              key={d}
              className="rounded-md border border-border/50 bg-card/50 px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {d}{d === 'AirSense 11' ? ' (partial)' : ''}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Other devices?{' '}
          <Link href="/about#faq" className="text-primary hover:underline">
            Check the FAQ
          </Link>
        </p>
      </div>
    ),
  },
  {
    num: '02',
    icon: Monitor,
    title: 'Connect to Your Computer',
    body: 'Insert the SD card into your computer\'s SD card slot, or use a USB SD card reader (available for under $10).',
    callout: 'AirwayLab requires a desktop or laptop computer. SD card upload doesn\'t work on phones or tablets.',
    extra: null,
  },
  {
    num: '03',
    icon: Upload,
    title: 'Upload Your Data',
    body: 'Go to the Analyze page and click "Upload SD Card." Select the entire SD card or the DATALOG folder inside it. AirwayLab will find the right files automatically.',
    callout: null,
    extra: (
      <div className="mt-3 flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          <span>Your files are processed entirely in your browser. Nothing is uploaded to any server.</span>
        </div>
        <Link href="/analyze">
          <Button size="sm" className="gap-2">
            <Upload className="h-3.5 w-3.5" /> Go to Analyze
          </Button>
        </Link>
      </div>
    ),
  },
  {
    num: '04',
    icon: BarChart3,
    title: 'Read Your Results',
    body: 'After analysis (usually under 60 seconds), you\'ll see a dashboard with your results. The summary at the top tells you the key takeaway:',
    callout: null,
    extra: (
      <div className="mt-3 flex flex-col gap-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Green = looking good</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs text-muted-foreground">Amber = worth monitoring</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-xs text-muted-foreground">Red = discuss with clinician</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Start with Overview</span>, then check{' '}
          <span className="font-medium text-foreground">Graphs</span> for visual charts and{' '}
          <span className="font-medium text-foreground">Trends</span> for multi-night patterns.
        </p>
        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/glossary"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <BookOpen className="h-3 w-3" />
            Not sure what a metric means? Check the glossary
          </Link>
        </div>
        <div className="rounded-lg border border-primary/10 bg-primary/[0.03] px-3 py-2">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">Supporters</span> get AI-powered explanations tailored to your specific results.{' '}
              <Link href="/pricing" className="text-primary hover:underline">Learn more</Link>
            </span>
          </div>
        </div>
      </div>
    ),
  },
  {
    num: '05',
    icon: Lightbulb,
    title: 'What to Do Next',
    body: 'AirwayLab shows you data your machine can\'t. Use it alongside OSCAR for the most complete picture. Upload weekly to track trends over time.',
    callout: null,
    extra: (
      <ul className="mt-3 flex flex-col gap-2">
        <li className="flex items-start gap-2 text-xs text-muted-foreground">
          <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          <span>
            <span className="font-medium text-foreground">Add oximetry data</span> (optional) for oxygen and heart rate analysis
          </span>
        </li>
        <li className="flex items-start gap-2 text-xs text-muted-foreground">
          <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          <span>
            <span className="font-medium text-foreground">Share results with your clinician</span> using the Share button on the dashboard
          </span>
        </li>
        <li className="flex items-start gap-2 text-xs text-muted-foreground">
          <ArrowRight className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
          <span>
            <span className="font-medium text-foreground">Join the community</span> on{' '}
            <a href="https://reddit.com/r/SleepApnea" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">r/SleepApnea</a>
            {' '}or{' '}
            <a href="https://www.apneaboard.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">ApneaBoard</a>
          </span>
        </li>
      </ul>
    ),
  },
];

const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Analyze Your PAP Sleep Data with AirwayLab',
  description:
    'Learn how to use AirwayLab in 5 simple steps. From SD card to sleep analysis results.',
  totalTime: 'PT5M',
  tool: [
    { '@type': 'HowToTool', name: 'ResMed AirSense 10 or 11, or AirCurve 10' },
    { '@type': 'HowToTool', name: 'SD card reader (USB or built-in)' },
    { '@type': 'HowToTool', name: 'Desktop or laptop computer with a web browser' },
  ],
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Find Your SD Card',
      text: 'Your ResMed machine has an SD card slot on the side (AirSense 10/11) or back (AirCurve 10). Power off your machine, then gently push the card to eject it.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Connect to Your Computer',
      text: 'Insert the SD card into your computer\'s SD card slot, or use a USB SD card reader.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Upload Your Data',
      text: 'Go to the Analyze page and click "Upload SD Card." Select the entire SD card or the DATALOG folder inside it. AirwayLab will find the right files automatically.',
      url: 'https://airwaylab.app/analyze',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Read Your Results',
      text: 'After analysis, you will see a dashboard with your results. Green means looking good, amber means worth monitoring, red means discuss with clinician.',
    },
    {
      '@type': 'HowToStep',
      position: 5,
      name: 'What to Do Next',
      text: 'Use AirwayLab alongside OSCAR for the most complete picture. Upload weekly to track trends over time. Share results with your clinician using the Share button.',
    },
  ],
};

export default function GettingStartedPage() {
  return (
    <div className="flex flex-col">
      {/* Static JSON-LD from hardcoded constant - safe, no user input */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <GettingStartedTracker />

      {/* Hero */}
      <section className="border-b border-border/50 bg-gradient-to-b from-primary/5 via-transparent to-transparent">
        <div className="container mx-auto px-4 py-12 sm:px-6 sm:py-16">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Getting Started</h1>
          <p className="mt-2 max-w-lg text-sm text-muted-foreground sm:text-base">
            From SD card to sleep analysis in 5 steps
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="container mx-auto px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <div className="flex flex-col gap-0">
            {steps.map((step, i) => (
              <div key={step.num} className="relative flex gap-4 pb-10 last:pb-0">
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div className="absolute left-5 top-12 h-[calc(100%-48px)] w-[1px] bg-border/50" />
                )}
                {/* Step number */}
                <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-card font-mono text-xs font-bold text-primary">
                  {step.num}
                </div>
                {/* Content */}
                <div className="flex-1 pt-1.5">
                  <div className="flex items-center gap-2">
                    <step.icon className="h-4 w-4 text-primary" />
                    <h2 className="text-base font-semibold sm:text-lg">{step.title}</h2>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  {step.callout && (
                    <div className="mt-3 flex items-start gap-2 rounded-lg border border-border/50 bg-card/50 px-3 py-2.5">
                      <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                      <p className="text-xs leading-relaxed text-muted-foreground">{step.callout}</p>
                    </div>
                  )}
                  {step.extra}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demo CTA */}
      <section className="border-y border-border/50 bg-card/20">
        <div className="container mx-auto flex flex-col items-center gap-4 px-4 py-10 text-center sm:px-6 sm:py-14">
          <h2 className="text-lg font-bold tracking-tight sm:text-xl">
            Don&apos;t have your SD card handy?
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            See what AirwayLab looks like with 5 nights of sample data
          </p>
          <Link href="/analyze?demo">
            <Button size="lg" variant="outline" className="gap-2">
              <Play className="h-4 w-4" /> Try the Demo
            </Button>
          </Link>
        </div>
      </section>

      {/* Links */}
      <section className="container mx-auto px-4 py-8 sm:px-6 sm:py-10">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 text-center sm:flex-row sm:justify-center sm:gap-6">
          <Link
            href="/about"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            About &amp; Methodology <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
          <Link
            href="/glossary"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Metric Glossary <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
          <Link
            href="/blog"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Blog <ArrowRight className="ml-1 inline h-3 w-3" />
          </Link>
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
