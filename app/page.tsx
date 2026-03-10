import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Disclaimer } from '@/components/common/disclaimer';
import { EmailOptIn } from '@/components/common/email-opt-in';
import { GitHubStars } from '@/components/common/github-stars';
import { CommunityCounter } from '@/components/common/community-counter';
import { LandingPricing } from '@/components/landing-pricing';
import {
  Activity,
  Waves,
  HeartPulse,
  Shield,
  Github,
  Users,
  UploadCloud,
  BarChart2,
  TrendingUp,
  Play,
  Folder,
  Upload,
} from 'lucide-react';

/* ─── Dashboard preview: Glasgow radar SVG mockup ─── */
function RadarMockup() {
  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-32 w-32 sm:h-36 sm:w-36" fill="none" aria-hidden="true">
      <polygon points="100,20 176,60 176,140 100,180 24,140 24,60" stroke="#E0D9CF" strokeWidth="0.5" />
      <polygon points="100,40 156,70 156,130 100,160 44,130 44,70" stroke="#E0D9CF" strokeWidth="0.5" />
      <polygon points="100,60 136,80 136,120 100,140 64,120 64,80" stroke="#E0D9CF" strokeWidth="0.5" />
      <line x1="100" y1="20" x2="100" y2="180" stroke="#E0D9CF" strokeWidth="0.5" />
      <line x1="24" y1="60" x2="176" y2="140" stroke="#E0D9CF" strokeWidth="0.5" />
      <line x1="24" y1="140" x2="176" y2="60" stroke="#E0D9CF" strokeWidth="0.5" />
      <polygon
        points="100,75 120,88 115,115 100,120 85,115 80,88"
        fill="rgba(27,122,110,0.15)"
        stroke="#1B7A6E"
        strokeWidth="1.5"
      />
      <text x="100" y="14" textAnchor="middle" fill="#6B6560" fontSize="7" fontFamily="system-ui">Skew</text>
      <text x="182" y="58" textAnchor="start" fill="#6B6560" fontSize="7" fontFamily="system-ui">Spike</text>
      <text x="182" y="144" textAnchor="start" fill="#6B6560" fontSize="7" fontFamily="system-ui">Flat Top</text>
      <text x="100" y="196" textAnchor="middle" fill="#6B6560" fontSize="7" fontFamily="system-ui">Multi-Peak</text>
      <text x="14" y="144" textAnchor="end" fill="#6B6560" fontSize="7" fontFamily="system-ui">Multi-Br.</text>
      <text x="14" y="58" textAnchor="end" fill="#6B6560" fontSize="7" fontFamily="system-ui">Var. Amp</text>
    </svg>
  );
}

/* ─── Steps data ─── */
const steps = [
  { icon: Folder, num: 1, title: 'Export your SD card', desc: 'Remove your ResMed SD card and select the DATALOG folder.' },
  { icon: UploadCloud, num: 2, title: 'Drag and drop', desc: 'Drop your files into AirwayLab. Nothing leaves your browser.' },
  { icon: BarChart2, num: 3, title: 'See everything', desc: 'Four engines analyse every breath in seconds.' },
];

/* ─── Feature data ─── */
const features = [
  { icon: Activity, title: 'Glasgow Index', desc: 'Scores each breath on a 0\u20138 clinical scale. See your nightly average, distribution, and trends.' },
  { icon: Waves, title: 'Flow Analysis', desc: 'WAT and NED engines detect flow limitation patterns your AHI completely misses.' },
  { icon: HeartPulse, title: 'Oximetry Pipeline', desc: '16 metrics including ODI, desaturation depth, HR surges, and H1/H2 split analysis.' },
  { icon: TrendingUp, title: 'Multi-Night Trends', desc: 'Heatmap across nights with therapy change tracking. See what\u2019s improving and what isn\u2019t.' },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* ─── 1. Hero ─── */}
      <section className="bg-brand-sand">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 md:py-28">
          <h1 className="text-4xl font-bold leading-tight text-brand-navy md:text-5xl">
            See If Your Sleep Therapy Is Actually Working
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-warm-gray">
            Your PAP machine collects thousands of data points every night. Your doctor checks one number. AirwayLab shows you the rest — flow limitation, breathing patterns, oxygen trends — all in your browser.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/analyze">
              <Button size="lg" className="w-full gap-2 sm:w-auto">
                <Upload className="h-4 w-4" /> Analyze Your Data
              </Button>
            </Link>
            <Link href="/analyze?demo">
              <Button variant="outline" size="lg" className="w-full gap-2 sm:w-auto">
                <Play className="h-4 w-4" /> Try the Demo
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-warm-gray">
            <Shield className="h-4 w-4 shrink-0 text-data-good" />
            <span>Your data never leaves your browser</span>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-warm-gray sm:gap-6">
            <GitHubStars className="inline-flex items-center gap-1.5 text-warm-gray transition-colors hover:text-warm-charcoal" />
            <CommunityCounter className="flex items-center gap-1.5 text-warm-gray" />
          </div>
        </div>
      </section>

      {/* ─── 2. Problem ─── */}
      <section className="bg-brand-navy">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 md:py-24">
          <span className="text-xs font-semibold uppercase tracking-widest text-brand-teal-light">
            The Problem
          </span>
          <h2 className="mt-4 text-2xl font-bold text-white md:text-3xl">
            AHI Doesn&apos;t Tell the Whole Story
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/70">
            Millions of people are &quot;treated&quot; for sleep apnea but still wake up exhausted.
            The standard metric — AHI — misses flow limitation, breathing instability, and the
            subtle patterns that explain why you still feel terrible. Your data has the answers.
            You just need a better lens.
          </p>
        </div>
      </section>

      {/* ─── 3. Dashboard Preview ─── */}
      <section className="bg-warm-cloud">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-20">
          <h2 className="mb-10 text-center text-2xl font-bold text-warm-charcoal sm:text-3xl">
            What Your Analysis Looks Like
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Glasgow */}
            <div className="rounded-lg border-t-4 border-t-brand-teal bg-warm-white p-6 shadow-warm-md">
              <h3 className="mb-3 text-sm font-semibold text-warm-charcoal">Glasgow Index</h3>
              <RadarMockup />
              <p className="mt-3 text-center text-sm text-warm-gray">
                Breath-by-breath shape analysis on a clinical scale.
              </p>
            </div>
            {/* AI Insights */}
            <div className="rounded-lg border-t-4 border-t-brand-amber bg-warm-white p-6 shadow-warm-md">
              <h3 className="mb-3 text-sm font-semibold text-warm-charcoal">AI Insights</h3>
              <div className="space-y-2">
                <div className="rounded-md border border-warm-border border-l-4 border-l-data-good px-3 py-2">
                  <p className="text-xs font-medium text-warm-charcoal">Settings change improved FL</p>
                  <p className="mt-0.5 text-[10px] text-warm-gray">Glasgow Index went from 2.1 to 1.5.</p>
                </div>
                <div className="rounded-md border border-warm-border border-l-4 border-l-brand-amber px-3 py-2">
                  <p className="text-xs font-medium text-warm-charcoal">Glasgow worsened</p>
                  <p className="mt-0.5 text-[10px] text-warm-gray">Changed from 1.2 to 1.8 (+0.6).</p>
                </div>
              </div>
              <p className="mt-3 text-center text-sm text-warm-gray">
                Plain-language explanations of what your data means.
              </p>
            </div>
            {/* Oximetry */}
            <div className="rounded-lg border-t-4 border-t-data-good bg-warm-white p-6 shadow-warm-md">
              <h3 className="mb-3 text-sm font-semibold text-warm-charcoal">Oximetry Analysis</h3>
              <div className="flex items-end gap-0.5 px-2" aria-hidden="true">
                {[96, 95, 94, 92, 88, 91, 94, 95, 96, 95, 93, 90, 93, 95, 96, 95, 94, 95, 96, 95].map((v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                      height: `${((v - 85) / 15) * 60 + 10}px`,
                      backgroundColor: v >= 94 ? '#34A853' : v >= 90 ? '#E8913A' : '#E07A5F',
                      opacity: 0.6,
                    }}
                  />
                ))}
              </div>
              <p className="mt-3 text-center text-sm text-warm-gray">
                Your oxygen story across the full night.
              </p>
            </div>
          </div>
          <div className="mt-8 text-center">
            <Link href="/analyze?demo">
              <Button variant="outline" size="sm" className="gap-2">
                <Play className="h-3.5 w-3.5" /> Try the interactive demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 4. How It Works ─── */}
      <section className="bg-warm-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-20">
          <h2 className="mb-10 text-center text-2xl font-bold text-warm-charcoal sm:text-3xl">
            How It Works
          </h2>
          <div className="relative mx-auto grid max-w-3xl gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <div key={s.num} className="relative flex gap-4 md:flex-col md:items-center md:text-center">
                {i < steps.length - 1 && (
                  <div className="absolute left-[calc(50%+24px)] top-4 hidden h-px w-[calc(100%-48px)] border-t border-warm-border md:block" />
                )}
                <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-teal text-sm font-bold text-white md:mb-3">
                  {s.num}
                </div>
                <div>
                  <h3 className="mb-1 text-sm font-semibold text-warm-charcoal">{s.title}</h3>
                  <p className="text-xs leading-relaxed text-warm-gray">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 5. Feature Grid ─── */}
      <section className="bg-warm-white">
        <div className="mx-auto max-w-4xl px-4 pb-16 sm:px-6 md:pb-20">
          <h2 className="mb-10 text-center text-2xl font-bold text-warm-charcoal sm:text-3xl">
            Four Engines, One Dashboard
          </h2>
          <div className="grid gap-6 md:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-lg border border-warm-border bg-warm-white p-5 shadow-warm-sm transition-shadow hover:shadow-warm-md">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-teal/10">
                  <f.icon className="h-5 w-5 text-brand-teal" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-warm-charcoal">{f.title}</h3>
                  <p className="mt-1 text-sm text-warm-gray">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 6. Trust ─── */}
      <section className="bg-brand-sand">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 md:py-16">
          <div className="flex flex-col items-center justify-center gap-8 md:flex-row md:gap-12">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-brand-teal" />
              <span className="text-sm text-warm-charcoal">100% in-browser. Nothing uploaded.</span>
            </div>
            <div className="hidden h-8 w-px bg-warm-border md:block" />
            <div className="flex items-center gap-3">
              <Github className="h-5 w-5 text-brand-teal" />
              <span className="text-sm text-warm-charcoal">Open source. GPL-3.0. Read every line.</span>
            </div>
            <div className="hidden h-8 w-px bg-warm-border md:block" />
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-brand-teal" />
              <span className="text-sm text-warm-charcoal">Complements OSCAR. Built by a PAP user.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 7. Pricing ─── */}
      <section className="bg-warm-white">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 md:py-20">
          <h2 className="mb-3 text-center text-2xl font-bold text-warm-charcoal sm:text-3xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-center text-warm-gray">
            AirwayLab is free and always will be. Paid tiers fund development and keep the project independent.
          </p>
          <LandingPricing />
        </div>
      </section>

      {/* ─── 8. CTA Footer ─── */}
      <section className="bg-brand-navy">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 px-4 py-12 text-center sm:px-6 md:py-16">
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            Ready to see what your data is really telling you?
          </h2>
          <Link href="/analyze" className="w-full max-w-md">
            <Button size="lg" className="w-full gap-2">
              Analyze Your Data
            </Button>
          </Link>
          <div className="mt-2">
            <EmailOptIn variant="hero" source="landing-cta" />
          </div>
          <div className="flex items-center gap-2 text-sm text-white/50">
            <Github className="h-4 w-4" />
            <a
              href="https://github.com/airwaylab-app/airwaylab"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-white/80"
            >
              Star us if AirwayLab helped you
            </a>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
}
