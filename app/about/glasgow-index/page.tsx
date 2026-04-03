import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Shield,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Glasgow Index — PAP Flow Limitation Scoring | AirwayLab',
  description:
    'How the Glasgow Index scores each PAP breath for flow limitation across 9 shape descriptors. Understand the scoring and what your result means for therapy optimisation.',
  openGraph: {
    title: 'Glasgow Index — PAP Flow Limitation Scoring | AirwayLab',
    description:
      'A 9-component scoring system that evaluates every breath for flow limitation. Learn how it works and what your score means.',
  },
  keywords: [
    'Glasgow Index', 'PAP flow limitation', 'flow limitation scoring',
    'ResMed flow analysis', 'breath shape analysis', 'PAP therapy optimisation',
    'sleep apnea flow limitation', 'PAP pressure adjustment',
  ],
  alternates: {
    canonical: 'https://airwaylab.app/about/glasgow-index',
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://airwaylab.app' },
    { '@type': 'ListItem', position: 2, name: 'About', item: 'https://airwaylab.app/about' },
    {
      '@type': 'ListItem',
      position: 3,
      name: 'Glasgow Index',
      item: 'https://airwaylab.app/about/glasgow-index',
    },
  ],
};

const medicalPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MedicalWebPage',
  name: 'Glasgow Index - PAP Flow Limitation Scoring',
  description: 'The Glasgow Index scores inspiratory flow shapes on 9 morphological components to quantify flow limitation severity. Scores range from 0 (normal) to 9 (severe).',
  url: 'https://airwaylab.app/about/glasgow-index',
  about: {
    '@type': 'MedicalCondition',
    name: 'Inspiratory Flow Limitation',
    associatedAnatomy: {
      '@type': 'AnatomicalStructure',
      name: 'Upper Airway',
    },
  },
  medicalAudience: {
    '@type': 'MedicalAudience',
    audienceType: 'Patient',
  },
  lastReviewed: '2026-03-01',
  mainContentOfPage: {
    '@type': 'WebPageElement',
    cssSelector: '.container',
  },
  isPartOf: { '@type': 'WebSite', name: 'AirwayLab', url: 'https://airwaylab.app' },
};

const components = [
  {
    name: 'Skew',
    description:
      'Measures the asymmetry of the inspiratory flow curve. A normal breath rises and falls symmetrically. Flow-limited breaths often peak early and trail off — high skew indicates the airway is narrowing during inspiration.',
  },
  {
    name: 'Spike',
    description:
      'Detects sharp transient peaks at the beginning of inspiration. A brief spike followed by reduced flow suggests the airway briefly opens then narrows, a hallmark of partial obstruction.',
  },
  {
    name: 'Flat Top',
    description:
      'Identifies inspiratory flow plateaus where flow reaches a ceiling and cannot increase despite continued inspiratory effort. This is the classic "flow limitation" pattern seen in clinical polysomnography.',
  },
  {
    name: 'Top Heavy',
    description:
      'Quantifies how much of the breath\'s tidal volume is delivered in the first half of inspiration versus the second half. Top-heavy breaths indicate early flow limitation onset. (Computed but excluded from overall score.)',
  },
  {
    name: 'Multi-Peak',
    description:
      'Detects oscillatory flow patterns with multiple peaks during a single inspiration. Multi-peak patterns suggest upper airway instability and flutter, often seen with moderate flow limitation.',
  },
  {
    name: 'No Pause',
    description:
      'Assesses whether there is an adequate pause between expiration and the next inspiration. Absent pauses can indicate increased respiratory drive, often a compensatory response to flow limitation.',
  },
  {
    name: 'Inspiratory Rate',
    description:
      'Evaluates the peak inspiratory flow rate relative to the breath population. Abnormally high rates suggest increased respiratory effort to overcome airway resistance.',
  },
  {
    name: 'Multi-Breath',
    description:
      'Detects sequences of breaths with progressively worsening flow limitation characteristics, suggesting a crescendo pattern that may precede an arousal or obstructive event.',
  },
  {
    name: 'Variable Amplitude',
    description:
      'Measures breath-to-breath variability in tidal volume. High variability indicates unstable ventilation, which can accompany cycling between obstruction and recovery.',
  },
];

export default function GlasgowIndexPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Static JSON-LD from hardcoded constants - no user input, safe */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(medicalPageJsonLd) }}
      />
      {/* Breadcrumb */}
      <Link
        href="/about"
        className="mb-6 inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3 w-3" />
        Back to About
      </Link>

      {/* Header */}
      <div className="mb-10">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
            <Activity className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Glasgow Index
            </h1>
            <p className="text-sm text-blue-400">Flow Limitation Scoring</p>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          The Glasgow Index is a 9-component scoring system that evaluates every
          breath for flow limitation characteristics. Originally developed by
          DaveSkvn as an open-source PAP flow analyzer (GPL-3.0), it provides
          a single composite score that summarises the severity of flow limitation
          across your entire therapy session. Typical scores range from 0 to about
          3 &mdash; scores above 3 are rare and indicate very significant problems.
        </p>
      </div>

      {/* How Scoring Works */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          How the scoring works
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 sm:p-6">
          <ol className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-3">
              <span className="mt-px shrink-0 font-mono text-xs text-blue-400/70">01</span>
              <span>
                <strong className="text-foreground">Breath segmentation</strong> &mdash;
                The raw flow signal (sampled at 25 Hz) is processed to identify
                individual inspirations using zero-crossing detection with minimum
                window filtering to reject noise.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-px shrink-0 font-mono text-xs text-blue-400/70">02</span>
              <span>
                <strong className="text-foreground">Shape analysis</strong> &mdash;
                Nine shape descriptors are computed for each breath, each capturing
                a different aspect of how flow limitation manifests in the
                inspiratory waveform.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-px shrink-0 font-mono text-xs text-blue-400/70">03</span>
              <span>
                <strong className="text-foreground">Per-breath scoring</strong> &mdash;
                Each breath is scored against fixed thresholds for each component.
                If the breath exhibits that characteristic, it scores 1 for that
                component; otherwise 0. The session component score is the proportion
                of breaths flagged (0&ndash;1).
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-px shrink-0 font-mono text-xs text-blue-400/70">04</span>
              <span>
                <strong className="text-foreground">Composite index</strong> &mdash;
                The overall Glasgow Index sums all 9 component scores. The theoretical
                maximum is 9.0, but in practice scores above 3 are extremely uncommon. The
                original author describes 0&ndash;0.2 as &ldquo;good, clean
                breathing&rdquo; and 3 as &ldquo;significant problems.&rdquo;
              </span>
            </li>
          </ol>
        </div>
      </section>

      {/* The 9 Components */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          The 9 components
        </h2>
        <div className="flex flex-col gap-4">
          {components.map((comp, i) => (
            <div
              key={comp.name}
              className="rounded-xl border border-blue-500/10 bg-blue-500/[0.02] p-4 sm:p-5"
            >
              <div className="mb-2 flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10 text-[10px] font-bold text-blue-400">
                  {i + 1}
                </span>
                <h3 className="text-sm font-semibold text-foreground">
                  {comp.name}
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {comp.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Interpreting Your Score */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          Interpreting your score
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <div className="mb-1 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold text-emerald-400">Below 1.0</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Low flow limitation scores observed. Your current pressure settings
              appear to be managing your airway well.
            </p>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="mb-1 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-semibold text-amber-400">1.0 &ndash; 2.0</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Moderate flow limitation. Worth discussing with your clinician.
              Your clinician can help interpret these scores in the context of your therapy.
            </p>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <div className="mb-1 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-red-500" />
              <span className="text-sm font-semibold text-red-400">Above 2.0</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Significant flow limitation. Your airway may be partially obstructed
              despite therapy. The original Glasgow Index author describes a score
              of 3 as &ldquo;significant problems.&rdquo; Your sleep physician can help interpret these findings in context.
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
          These thresholds are AirwayLab&rsquo;s interpretation. The original Glasgow Index does not define
          clinical thresholds beyond noting that 0&ndash;0.2 represents &ldquo;good, clean breathing&rdquo;
          and a score of 3 indicates &ldquo;significant problems.&rdquo; Your clinician should interpret
          scores in the context of your symptoms and therapy settings.
        </p>
      </section>

      {/* Origin & License */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          Origin &amp; license
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Glasgow Index algorithm was originally developed by{' '}
            <a href="https://github.com/DaveSkvn/GlasgowIndex" className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">DaveSkvn</a>{' '}
            as an open-source JavaScript analyzer for PAP flow limitation. The
            algorithm has been ported to TypeScript and integrated into AirwayLab
            under the same GPL-3.0 license. The core algorithm &mdash; breath
            segmentation, 9 shape descriptors, and overall scoring formula &mdash; is
            preserved exactly. AirwayLab adds traffic-light thresholds and
            multi-night trending, which are not part of the original tool. The
            original processes one BRP.edf session at a time; AirwayLab uses
            duration-weighted averaging to combine multiple sessions per night.
          </p>
        </div>
      </section>

      {/* Privacy callout */}
      <div className="mb-10 flex items-center gap-1.5 text-xs text-emerald-500">
        <Shield className="h-3.5 w-3.5 shrink-0" />
        <span>Glasgow Index analysis runs entirely in your browser — your data never leaves your device.</span>
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/analyze"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Try it now
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <Link
          href="/about"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-card/50 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
        >
          View all engines
        </Link>
      </div>
    </div>
  );
}
