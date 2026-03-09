import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  HeartPulse,
  Shield,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Pulse Oximetry Analysis for PAP Users — 16 Metrics | AirwayLab',
  description:
    'AirwayLab\'s oximetry engine computes 16 metrics from Viatom/Checkme O2 Max data: ODI, desaturation indices, heart rate surges, coupled events, and half-night comparisons.',
  openGraph: {
    title: 'Pulse Oximetry Analysis for PAP Users | AirwayLab',
    description:
      'A 16-metric framework for SpO2 and heart rate analysis. ODI, desaturation time, HR surges, and coupled cardio-respiratory events.',
  },
  keywords: [
    'pulse oximetry PAP', 'ODI oxygen desaturation index',
    'SpO2 overnight', 'heart rate PAP', 'Viatom Checkme O2 Max',
    'overnight oximetry analysis', 'sleep apnea oximetry',
    'PAP oximetry', 'nocturnal hypoxemia',
  ],
};

const metrics = [
  {
    category: 'Oxygen Desaturation',
    items: [
      {
        name: 'ODI-3%',
        description: 'Oxygen Desaturation Index at 3% threshold — the number of times per hour SpO\u2082 drops by \u22653% from baseline. The most widely used clinical desaturation metric.',
      },
      {
        name: 'ODI-4%',
        description: 'Oxygen Desaturation Index at 4% threshold — a stricter metric used in some clinical guidelines. Correlates more strongly with cardiovascular outcomes.',
      },
      {
        name: 'T<90%',
        description: 'Percentage of total recording time spent with SpO\u2082 below 90%. Extended time below 90% is associated with increased cardiovascular risk.',
      },
      {
        name: 'T<94%',
        description: 'Percentage of recording time with SpO\u2082 below 94%. A more sensitive threshold that captures moderate hypoxemia often missed by the 90% cutoff.',
      },
    ],
  },
  {
    category: 'Heart Rate Analysis',
    items: [
      {
        name: 'Clinical HR Surges (8 bpm)',
        description: 'Heart rate increases >8 bpm above a 30-second trailing baseline. These surges often accompany respiratory arousals and correlate with sleep fragmentation.',
      },
      {
        name: 'Clinical HR Surges (10 bpm)',
        description: 'Heart rate increases >10 bpm above 30-second baseline — a stricter threshold identifying more significant autonomic activations.',
      },
      {
        name: 'Rolling Mean HR Surges (6 bpm)',
        description: 'Heart rate increases >6 bpm above a 5-minute rolling mean. This longer baseline captures surges relative to the prevailing heart rate trend.',
      },
      {
        name: 'Rolling Mean HR Surges (8 bpm)',
        description: 'Heart rate increases >8 bpm above 5-minute rolling mean — the stricter version of the rolling mean surge metric.',
      },
    ],
  },
  {
    category: 'Coupled Events',
    items: [
      {
        name: 'Coupled ODI + HR Events',
        description: 'Simultaneous SpO\u2082 desaturation and heart rate surge within a time window. These coupled events strongly suggest respiratory arousal — the desaturation reflects the apnea/hypopnea and the heart rate surge reflects the arousal response.',
      },
    ],
  },
  {
    category: 'Summary Statistics',
    items: [
      {
        name: 'Mean, Median, Min SpO\u2082',
        description: 'Central tendency and extremes of oxygen saturation across the recording.',
      },
      {
        name: 'Mean, Median HR',
        description: 'Central tendency of heart rate. Elevated mean HR may indicate poor sleep quality or increased sympathetic tone.',
      },
    ],
  },
  {
    category: 'Half-Night Comparison',
    items: [
      {
        name: 'H1 vs H2 Metrics',
        description: 'All desaturation and heart rate metrics are computed separately for the first and second halves of the recording. Differences between halves can reveal positional effects (if you change position during the night) or REM-related patterns (REM sleep is concentrated in the second half of the night and is when the airway is most collapsible).',
      },
    ],
  },
];

export default function OximetryAnalysisPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
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
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10">
            <HeartPulse className="h-5 w-5 text-rose-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Oximetry Analysis
            </h1>
            <p className="text-sm text-rose-400">16-Metric SpO&#8322; &amp; Heart Rate Framework</p>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          AirwayLab&apos;s oximetry pipeline provides a comprehensive analysis
          of overnight pulse oximetry data from Viatom/Checkme O2 Max wrist
          oximeters. Sixteen metrics across five categories give you a detailed
          picture of oxygenation, cardiac response, and their interaction
          throughout the night.
        </p>
      </div>

      {/* How It Works */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          How it works
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 sm:p-6">
          <ol className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
            <li className="flex gap-3">
              <span className="mt-px shrink-0 font-mono text-xs text-rose-400/70">01</span>
              <span>
                <strong className="text-foreground">CSV import</strong> &mdash;
                Upload the CSV export from your Viatom/Checkme O2 Max alongside
                your ResMed SD card data. The parser extracts SpO&#8322; and heart
                rate time series with their timestamps.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-px shrink-0 font-mono text-xs text-rose-400/70">02</span>
              <span>
                <strong className="text-foreground">Artefact correction</strong> &mdash;
                Double-tracking artefacts (where the oximeter reports two
                readings for the same event) are detected and corrected to prevent
                inflated event counts.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-px shrink-0 font-mono text-xs text-rose-400/70">03</span>
              <span>
                <strong className="text-foreground">Multi-metric analysis</strong> &mdash;
                Sixteen metrics are computed across five categories: oxygen
                desaturation, heart rate surges, coupled events, summary
                statistics, and half-night comparisons.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-px shrink-0 font-mono text-xs text-rose-400/70">04</span>
              <span>
                <strong className="text-foreground">Clinical integration</strong> &mdash;
                Results are presented alongside PAP flow analysis data, enabling
                you to see how flow limitation events correlate with oxygen
                desaturations and heart rate responses.
              </span>
            </li>
          </ol>
        </div>
      </section>

      {/* The 16 Metrics */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          The 16 metrics
        </h2>
        <div className="flex flex-col gap-6">
          {metrics.map((group) => (
            <div key={group.category}>
              <h3 className="mb-3 text-sm font-semibold text-rose-400">
                {group.category}
              </h3>
              <div className="flex flex-col gap-3">
                {group.items.map((metric) => (
                  <div
                    key={metric.name}
                    className="rounded-xl border border-rose-500/10 bg-rose-500/[0.02] p-4"
                  >
                    <h4 className="mb-1.5 text-sm font-semibold text-foreground">
                      {metric.name}
                    </h4>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {metric.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Compatible Devices */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          Compatible devices
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 sm:p-6">
          <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
            AirwayLab currently supports CSV exports from the{' '}
            <strong className="text-foreground">Viatom/Checkme O2 Max</strong>{' '}
            wrist pulse oximeter. This is a popular choice in the sleep apnea
            community for its comfort, reliability, and ability to export
            second-by-second data.
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Oximetry data is entirely optional &mdash; all four PAP analysis
            engines (Glasgow Index, WAT, NED) work with SD card data alone. The
            oximetry pipeline activates only when you provide oximetry CSVs
            alongside your SD card upload.
          </p>
        </div>
      </section>

      {/* Privacy callout */}
      <div className="mb-10 flex items-center gap-1.5 text-xs text-emerald-500">
        <Shield className="h-3.5 w-3.5 shrink-0" />
        <span>All oximetry analysis runs in your browser — your health data never leaves your device.</span>
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        <Link
          href="/analyze"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Analyse your data
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
