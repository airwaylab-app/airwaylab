import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Disclaimer } from '@/components/common/disclaimer';
import { ProviderInterestForm } from '@/components/providers/provider-interest-form';
import {
  Activity,
  Waves,
  BarChart3,
  HeartPulse,
  Upload,
  Link2,
  Monitor,
  Play,
  ArrowRight,
  Users,
  MessageSquare,
  FileText,
  Github,
  Shield,
  BookOpen,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'For Sleep Consultants & Providers | AirwayLab',
  description:
    'Instant PAP analysis for remote sleep consults. Patients share a link, you see Glasgow Index scores, flow limitation patterns, and oximetry insights — right in your browser.',
  alternates: {
    canonical: 'https://airwaylab.app/providers',
  },
};

const engines = [
  {
    icon: Activity,
    title: 'Glasgow Index Scoring',
    desc: 'Automated breath-shape analysis on a clinical 0\u20138 scale. See nightly averages, distributions, and trends across sessions \u2014 without manually reviewing waveforms.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  {
    icon: Waves,
    title: 'Flow Limitation Detection',
    desc: 'WAT tidal volume ratios and breathing regularity analysis. Detects the restriction patterns that AHI completely misses.',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  {
    icon: BarChart3,
    title: 'NED Effort Dependence',
    desc: 'Identifies effort-dependent airway collapse \u2014 a key marker of upper airway resistance that correlates with arousals and persistent symptoms.',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  {
    icon: HeartPulse,
    title: 'Oximetry Pipeline',
    desc: '16-metric oxygen analysis: ODI-3/4, desaturation depth, HR surges, T<90, T<94, and first-half vs second-half splits. Upload Viatom/O2Ring data alongside PAP data.',
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/20',
  },
];

const steps = [
  {
    icon: Upload,
    num: '01',
    title: 'Patient Uploads at Home',
    desc: 'Your patient drags their SD card folder into AirwayLab. Full analysis runs in their browser in under a minute \u2014 Glasgow Index, flow limitation, NED, oximetry. No account needed.',
  },
  {
    icon: Link2,
    num: '02',
    title: 'They Share a Link',
    desc: 'One click generates a secure link. Analysis results are stored for 30 days. Patient sends you the link by email, text, or however you communicate.',
  },
  {
    icon: Monitor,
    num: '03',
    title: 'You Review on Any Device',
    desc: 'Click the link, see everything. Scores, trends, insights, multi-night comparisons \u2014 right in your browser. Review before the consult or walk through it live together.',
  },
];

const roadmapItems = [
  {
    icon: Users,
    title: 'Clinic Accounts',
    desc: 'Manage multiple patients from one dashboard. Track therapy changes across visits. See who needs follow-up.',
  },
  {
    icon: MessageSquare,
    title: 'Collaborative Annotations',
    desc: 'Mark findings during a consult. Add notes to specific nights. Build a shared clinical record.',
  },
  {
    icon: FileText,
    title: 'Clinic-Branded Reports',
    desc: 'Professional PDF exports with your practice branding for patient records and referring physicians.',
  },
  {
    icon: Waves,
    title: 'Waveform Review',
    desc: 'Breath-by-breath flow and pressure waveform visualisation, directly in the browser.',
  },
];

export default function ProvidersPage() {
  return (
    <div className="flex flex-col">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative mx-auto px-4 pb-12 pt-16 sm:px-6 sm:pb-20 sm:pt-24">
          <span className="mb-4 inline-block text-[11px] font-medium uppercase tracking-wider text-primary">
            For Sleep Consultants &amp; Providers
          </span>
          <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Stop Waiting for SD Cards in the Mail
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Your patients upload their data, you get a link, and you&apos;re both
            looking at the same analysis — Glasgow Index scores, flow limitation
            patterns, oxygen trends — instantly, in the browser. No software. No
            file transfers. No waiting.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/analyze?demo">
              <Button size="lg" className="w-full gap-2 shadow-glow sm:w-auto">
                <Play className="h-4 w-4" /> Try the Demo
              </Button>
            </Link>
            <a href="#contact">
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2 sm:w-auto"
              >
                <MessageSquare className="h-4 w-4" /> Get in Touch
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ─── The Problem ─── */}
      <section className="border-y border-border/50 bg-card/20">
        <div className="container mx-auto px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Remote Consults Shouldn&apos;t Be This Hard
          </h2>
          <div className="mt-4 max-w-2xl space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
            <p>
              You already know AHI doesn&apos;t tell the whole story. That&apos;s
              why your patients come to you. But getting to the data that matters
              still takes days instead of minutes.
            </p>
            <p>
              Mailing SD cards back and forth. Juggling upload platforms and share
              links that show you half the picture. Walking patients through
              desktop software installs they can&apos;t figure out. The analysis
              itself takes 60 seconds. The logistics take a week.
            </p>
            <p className="font-medium text-foreground">
              It doesn&apos;t have to be this way.
            </p>
          </div>
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section className="container mx-auto px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Patient Uploads. You Get a Link. That&apos;s It.
        </h2>
        <div className="mx-auto mt-10 grid max-w-4xl gap-0 sm:grid-cols-3">
          {steps.map((s, i) => (
            <div
              key={s.num}
              className="relative flex gap-4 pb-8 sm:flex-col sm:items-center sm:pb-0 sm:text-center"
            >
              {/* Connector line */}
              {i < steps.length - 1 && (
                <>
                  <div
                    className="absolute left-5 top-12 hidden h-[1px] w-[calc(100%-40px)] bg-border/50 sm:block"
                    style={{ left: 'calc(50% + 24px)' }}
                  />
                  <div className="absolute left-5 top-12 h-[calc(100%-48px)] w-[1px] bg-border/50 sm:hidden" />
                </>
              )}
              <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-card font-mono text-xs font-bold text-primary sm:mb-4 sm:h-12 sm:w-12 sm:text-sm">
                {s.num}
              </div>
              <div>
                <h3 className="mb-1 text-sm font-semibold">{s.title}</h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link
            href="/analyze?demo"
            className="inline-flex items-center gap-1 text-sm text-primary transition-colors hover:text-foreground"
          >
            Try the Demo <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ─── Analysis Engines ─── */}
      <section className="border-y border-border/50 bg-card/20">
        <div className="container mx-auto px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Four Research-Grade Engines in One Dashboard
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {engines.map((e) => (
              <div
                key={e.title}
                className={`rounded-xl border ${e.border} bg-card/50 p-5 sm:p-6`}
              >
                <div className="mb-3 flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${e.bg}`}>
                    <e.icon className={`h-4 w-4 ${e.color}`} />
                  </div>
                  <h3 className="text-sm font-semibold">{e.title}</h3>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {e.desc}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Multi-night trend views with therapy change tracking. See whether a
            pressure adjustment or mask change actually moved the numbers.
          </p>
        </div>
      </section>

      {/* ─── Roadmap ─── */}
      <section className="container mx-auto px-4 py-14 sm:px-6 sm:py-20">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
          What&apos;s Coming for Provider Workflows
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          AirwayLab is building toward a full remote consult platform.
          Here&apos;s the roadmap.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {roadmapItems.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6"
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="rounded-lg bg-muted/30 p-2">
                  <item.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <span className="rounded-full border border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Coming
                </span>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          We&apos;re building in the open. Share links work today. The features
          above are in active development. If you want to shape what gets built
          next, talk to us.
        </p>
      </section>

      {/* ─── Open Source Trust ─── */}
      <section className="border-y border-border/50 bg-card/20">
        <div className="container mx-auto px-4 py-14 sm:px-6 sm:py-20">
          <h2 className="mb-8 text-2xl font-bold tracking-tight sm:text-3xl">
            Transparent by Design
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Github className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Verify the analysis</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  AirwayLab is GPL-3.0. The Glasgow Index implementation, flow
                  limitation algorithms, oximetry pipeline — every line is
                  public. No black-box scoring.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">No lock-in</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  Data stays with the patient unless they choose to share. No
                  vendor dependency, no proprietary formats.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <BookOpen className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Research-backed</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  The analysis engines implement published methodologies.
                  Automated scoring you can trace back to the source.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Contact ─── */}
      <section id="contact" className="container mx-auto px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-lg">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Shape What We Build Next
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            We&apos;re working with sleep consultants, respiratory therapists,
            and sleep-focused clinicians to build AirwayLab&apos;s provider
            features. If you do remote PAP consults, we want to understand your
            workflow — what&apos;s painful, what&apos;s missing, what would save
            you real time.
          </p>
          <div className="mt-6">
            <ProviderInterestForm />
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Or use our{' '}
            <a
              href="/contact"
              className="text-primary underline decoration-primary/50 underline-offset-2 transition-colors hover:text-foreground"
            >
              general contact form
            </a>
          </p>
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
