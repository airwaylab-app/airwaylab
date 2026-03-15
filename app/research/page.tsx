import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Activity,
  Waves,
  Wind,
  HeartPulse,
  Shield,
  AlertTriangle,
  Github,
  ExternalLink,
  ArrowRight,
  Database,
  Handshake,
  Lock,
  Mail,
} from 'lucide-react';
import { CommunityCounter } from '@/components/common/community-counter';

export const metadata: Metadata = {
  title: 'For Researchers — AirwayLab',
  description:
    'AirwayLab is building an open, anonymised PAP therapy dataset. Collaborate with us to advance sleep science research on flow limitation, RERAs, and breathing pattern analysis.',
  openGraph: {
    title: 'For Researchers — AirwayLab',
    description:
      'Open, anonymised PAP therapy dataset for sleep science research. Collaborate with us on flow limitation, RERA detection, and breathing pattern analysis.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/research',
  },
};

/* ------------------------------------------------------------------ */
/*  JSON-LD structured data (Dataset schema)                          */
/* ------------------------------------------------------------------ */

const datasetJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Dataset',
  name: 'AirwayLab PAP Therapy Research Dataset',
  description:
    'Anonymised PAP therapy breathing metrics from real-world CPAP/BiPAP users. Includes Glasgow Index scores, flow limitation metrics (WAT FL Score, NED), RERA event detection, estimated arousal indices, and optional pulse oximetry data. All data contributed voluntarily with informed consent.',
  license: 'https://www.gnu.org/licenses/gpl-3.0.html',
  creator: {
    '@type': 'Organization',
    name: 'AirwayLab',
    url: 'https://airwaylab.app',
  },
  keywords: [
    'PAP therapy',
    'CPAP',
    'BiPAP',
    'flow limitation',
    'Glasgow Index',
    'RERA',
    'sleep apnea',
    'breathing patterns',
    'anonymised health data',
  ],
  variableMeasured: [
    'Glasgow Index (0-8 scale, 9 components)',
    'FL Score (flow limitation percentage)',
    'Sample Entropy (breathing regularity)',
    'Periodicity Index (periodic breathing detection)',
    'NED Mean (negative effort dependence)',
    'Flatness Index',
    'M-shape percentage',
    'RERA events per hour',
    'Estimated Arousal Index',
    'ODI-3 and ODI-4 (oxygen desaturation indices)',
    'Heart rate surge metrics',
  ],
};

/* ------------------------------------------------------------------ */
/*  Dataset metric cards                                              */
/* ------------------------------------------------------------------ */

const datasetEngines = [
  {
    icon: Activity,
    name: 'Glasgow Index',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/5',
    metrics: [
      'Overall score (0\u20138)',
      '9 component scores: skew, spike, flat top, top heavy, multi-peak, no pause, inspiratory rate, multi-breath, variable amplitude',
      'Per-session and duration-weighted nightly averages',
    ],
  },
  {
    icon: Waves,
    name: 'WAT (Wobble Analysis Tool)',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-500/5',
    metrics: [
      'FL Score: inspiratory flatness percentage',
      'Regularity: Sample Entropy on minute ventilation',
      'Periodicity Index: FFT power in 0.01\u20130.03 Hz band',
    ],
  },
  {
    icon: Wind,
    name: 'NED Analysis',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-500/5',
    metrics: [
      'NED mean, Flatness Index, Tpeak/Ti ratio',
      'M-shape detection percentage',
      'RERA events per hour, Estimated Arousal Index',
      'Combined FL percentage, H1/H2 split comparisons',
    ],
  },
  {
    icon: HeartPulse,
    name: 'Oximetry (optional)',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/20',
    bgColor: 'bg-rose-500/5',
    metrics: [
      'ODI-3% and ODI-4% (desaturation indices)',
      'Heart rate surge counts at multiple thresholds',
      'Coupled cardio-respiratory events',
      'Desaturation time, SpO\u2082 summary statistics',
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Pipeline steps                                                    */
/* ------------------------------------------------------------------ */

const pipelineSteps = [
  {
    step: '01',
    title: 'Browser-only analysis',
    description:
      'A PAP user uploads their SD card data. All analysis runs in their browser \u2014 nothing is sent to a server.',
  },
  {
    step: '02',
    title: 'Voluntary opt-in',
    description:
      'After seeing their results, the user can choose to contribute anonymised metrics. This is always opt-in, never automatic.',
  },
  {
    step: '03',
    title: 'Anonymisation',
    description:
      'Identifying information is stripped: no dates, no names, no device serial numbers. Only aggregate breathing metrics and machine settings are stored.',
  },
  {
    step: '04',
    title: 'Secure EU storage',
    description:
      'Data is stored in an EU-hosted database with row-level security. The anonymisation code is open source and auditable.',
  },
];

/* ------------------------------------------------------------------ */
/*  Collaboration opportunities                                       */
/* ------------------------------------------------------------------ */

const collaborationItems = [
  'Access to anonymised, aggregate breathing metrics from thousands of real-world therapy nights',
  'Validation partnerships for our analysis engines (Glasgow Index, WAT, NED) against clinical gold-standard measurements',
  'Joint research on flow limitation patterns, RERA detection, and the relationship between breathing metrics and patient outcomes',
  'Open-source codebase (GPL-3.0) \u2014 adapt our algorithms for your research, contribute improvements back',
];

/* ------------------------------------------------------------------ */
/*  Privacy items                                                     */
/* ------------------------------------------------------------------ */

const privacyItems = [
  'GDPR-compliant. All data stored in the EU (Supabase, eu-west region).',
  'Every contribution requires explicit, informed consent. No silent collection, no pre-checked boxes.',
  'The anonymisation pipeline is open source \u2014 audit it yourself.',
  'Users can request deletion of their contributed data at any time.',
];

/* ------------------------------------------------------------------ */
/*  Page Component                                                    */
/* ------------------------------------------------------------------ */

export default function ResearchPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />

      {/* ---- Hero ---- */}
      <section className="mb-12 sm:mb-16">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Open data for sleep science
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          AirwayLab is building the largest open dataset of anonymised PAP therapy metrics. Every
          data point is contributed voluntarily, stripped of identifiers, and stored in the EU. We
          believe better data leads to better therapy &mdash; and we want to work with researchers
          who share that goal.
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-500">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          <span>Consent-based &middot; Anonymised &middot; EU-hosted &middot; Open source</span>
        </div>

        <div className="mt-6">
          <CommunityCounter
            variant="research"
            className="flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-1.5 text-sm font-medium text-rose-300"
          />
        </div>
      </section>

      {/* ---- What's in the dataset ---- */}
      <section className="mb-12 sm:mb-16">
        <div className="mb-6 flex items-center gap-2.5">
          <Database className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            What&apos;s in the dataset
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {datasetEngines.map((engine) => (
            <div
              key={engine.name}
              className={`rounded-xl border ${engine.borderColor} ${engine.bgColor} p-5`}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <engine.icon className={`h-4 w-4 ${engine.color}`} />
                <h3 className="text-sm font-semibold text-foreground">{engine.name}</h3>
              </div>
              <ul className="flex flex-col gap-1.5">
                {engine.metrics.map((metric, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"
                  >
                    <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${engine.color} opacity-60`} />
                    {metric}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-4 text-xs leading-relaxed text-muted-foreground/70">
          All metrics are computed from ResMed SD card flow waveform data. Raw waveforms are
          available for a subset of contributors who explicitly opted in to waveform sharing.
          Machine settings metadata (device model, pressure settings, mode) is included where
          available.
        </p>
      </section>

      {/* ---- How data is collected ---- */}
      <section className="mb-12 sm:mb-16">
        <div className="mb-6 flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            How data is collected
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {pipelineSteps.map((item, i) => (
            <div key={item.step} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <span className="font-mono text-xs font-semibold text-primary">{item.step}</span>
                </div>
                {i < pipelineSteps.length - 1 && (
                  <div className="mt-2 h-full w-px bg-border/50" />
                )}
              </div>
              <div className={i < pipelineSteps.length - 1 ? 'pb-4' : ''}>
                <h3 className="mb-1 text-sm font-semibold">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---- How to collaborate ---- */}
      <section className="mb-12 sm:mb-16">
        <div className="mb-6 flex items-center gap-2.5">
          <Handshake className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            How to collaborate
          </h2>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
          We&apos;re looking for researchers and clinicians who want to use real-world PAP therapy
          data to advance sleep science. Here&apos;s what we can offer:
        </p>

        <ul className="flex flex-col gap-3">
          {collaborationItems.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-3 text-sm leading-relaxed text-muted-foreground"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      {/* ---- Data privacy and ethics ---- */}
      <section className="mb-12 sm:mb-16">
        <div className="mb-6 flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
            Data privacy and ethics
          </h2>
        </div>

        <p className="mb-4 text-sm font-medium text-foreground">
          AirwayLab handles health data. We take that seriously.
        </p>

        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <ul className="flex flex-col gap-2.5">
            {privacyItems.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"
              >
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-emerald-500/60" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Get in touch ---- */}
      <section className="mb-12 sm:mb-16">
        <div className="rounded-xl border border-border/50 bg-card/30 p-6 sm:p-8">
          <div className="mb-4 flex items-center gap-2.5">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold tracking-tight sm:text-xl">
              Get in touch
            </h2>
          </div>

          <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
            Interested in collaborating? We&apos;d like to hear from you.
          </p>

          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/contact?category=research"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Contact Us About Research
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <a
              href="https://github.com/airwaylab-app/airwaylab"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-card/50 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
            >
              <Github className="h-4 w-4" />
              View Source Code
              <ExternalLink className="h-3 w-3 text-muted-foreground" />
            </a>
          </div>

          <p className="mt-4 text-xs text-muted-foreground/70">
            Or email us directly at{' '}
            <a
              href="mailto:dev@airwaylab.app"
              className="text-primary underline underline-offset-2 hover:text-primary/80"
            >
              dev@airwaylab.app
            </a>
          </p>
        </div>
      </section>

      {/* ---- Medical Disclaimer ---- */}
      <section className="mb-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Medical Disclaimer
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AirwayLab is not a medical device. It is provided for educational and informational
            purposes only. Always consult qualified healthcare providers regarding sleep therapy.
          </p>
        </div>
      </section>
    </div>
  );
}
