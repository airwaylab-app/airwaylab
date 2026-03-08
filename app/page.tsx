import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Disclaimer } from '@/components/common/disclaimer';
import { EmailOptIn } from '@/components/common/email-opt-in';
import { GitHubStars } from '@/components/common/github-stars';
import { CommunityCounter } from '@/components/common/community-counter';
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
} from 'lucide-react';

/* ─── Mocked dashboard metrics for hero visualization ─── */
const heroMetrics = [
  { label: 'Glasgow', value: '1.4', status: 'good' as const },
  { label: 'FL Score', value: '28%', status: 'good' as const },
  { label: 'NED Mean', value: '22%', status: 'warn' as const },
  { label: 'RERA', value: '6.2/hr', status: 'warn' as const },
  { label: 'ODI-3', value: '4.1/hr', status: 'good' as const },
  { label: 'SpO₂ Mean', value: '95.8%', status: 'good' as const },
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
    desc: '9-component per-breath flow shape scoring',
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
    desc: 'Ventilation regularity and periodic breathing',
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
    desc: 'Negative effort dependence and RERA detection',
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
    desc: '16-metric SpO₂ and HR surge framework',
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
    desc: 'Four engines run entirely client-side via Web Workers. Zero data transmitted — nothing leaves your device.',
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
    title: '100% Client-Side',
    desc: 'All analysis runs in your browser. No servers, no uploads, no tracking. Your CPAP data never leaves your device.',
  },
  {
    icon: Github,
    title: 'Open Source',
    desc: 'GPL-3.0 licensed. Every line of code is publicly auditable on GitHub. Community-driven development.',
  },
  {
    icon: Scale,
    title: 'Research-Grade',
    desc: 'Algorithms ported from peer-reviewed sleep science. Glasgow Index, WAT, NED, and 16-metric oximetry framework.',
  },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="container relative mx-auto px-4 pb-8 pt-12 sm:px-6 sm:pb-12 sm:pt-20">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-16">
            {/* Left: Copy */}
            <div className="flex flex-1 flex-col gap-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-3 py-1 text-[11px] font-medium text-emerald-400">
                  <Lock className="h-3 w-3" />
                  Privacy-First
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-card/60 px-3 py-1 text-[11px] font-medium text-muted-foreground">
                  v{packageJson.version} — Free &amp; Open Source
                </span>
              </div>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Flow Limitation Analysis
                <br />
                <span className="text-primary">for ResMed CPAP Data</span>
              </h1>

              <p className="max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
                Your CPAP says your AHI is fine. But you still wake up exhausted.
                AirwayLab looks deeper — detecting flow limitation, RERAs, and
                breathing pattern instability that standard metrics miss. Free,
                open source, and 100% in your browser.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/analyze?demo">
                  <Button size="lg" className="w-full gap-2 shadow-glow sm:w-auto">
                    <Play className="h-4 w-4" /> See Demo
                  </Button>
                </Link>
                <Link href="/analyze">
                  <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
                    Upload Your SD Card <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
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
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-muted-foreground/60">
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
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
              </div>
            </div>
          ))}
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
              Millions of CPAP users have an AHI under 5 but still feel terrible. Flow limitation, RERAs, and breathing pattern instability go undetected by the one number most clinicians check. AirwayLab makes that hidden data visible.
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-card/50 p-5 sm:p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Lock className="h-4 w-4 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold">Your Data Belongs to You</h3>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Every analysis runs in your browser. Nothing is uploaded, stored, or tracked. The code is open source and GPL-3.0 licensed — you can verify exactly what happens with your data.
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
              Not just patients with technical skills. Not just those who can afford specialist clinics. Everyone on PAP therapy deserves to know if their treatment is actually working beyond a single number.
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
                With your explicit consent, contribute anonymised breathing data to the largest open CPAP research dataset ever built. Patterns that no single sleep lab has the data to find.
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
                Aggregated insights from thousands of real-world nights could help researchers, clinicians, and device manufacturers understand what truly effective therapy looks like — beyond AHI.
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

      {/* ─── Social Proof ─── */}
      <section className="border-y border-border/50 bg-card/20">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-4 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8">
          <GitHubStars className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground sm:text-sm" />
          <CommunityCounter className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            <span>4 research-grade engines</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>100% client-side</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>GPL-3.0 open source</span>
          </div>
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
          </div>
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
          {/* TODO: Update to specific AirwayLab thread URLs once community posts exist */}
          <div>
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              Join the conversation
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
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
          <Link href="/analyze">
            <Button size="lg" className="gap-2 shadow-glow">
              Get Started <ArrowRight className="h-4 w-4" />
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
