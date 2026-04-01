import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Activity,
  Waves,
  Wind,
  Shield,
  Stethoscope,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'What Is PAP Flow Limitation? Causes, Detection & Treatment | AirwayLab',
  description:
    'Understand flow limitation in PAP therapy — what it is, why it matters, how to detect it from your ResMed SD card data, and what you can do about it.',
  openGraph: {
    title: 'What Is PAP Flow Limitation? | AirwayLab',
    description:
      'Flow limitation is partial airway obstruction during PAP therapy that standard AHI may miss. Learn how to detect and address it.',
  },
  keywords: [
    'PAP flow limitation', 'what is flow limitation', 'flow limitation sleep apnea',
    'PAP partial obstruction', 'UARS', 'RERA', 'ResMed flow data',
    'PAP pressure too low', 'flow limitation treatment',
    'OSCAR flow limitation', 'PAP therapy optimisation',
    'WAT analysis', 'NED analysis', 'RERA detection', 'flow limitation PAP',
  ],
  alternates: {
    canonical: 'https://airwaylab.app/about/flow-limitation',
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
      name: 'Flow Limitation',
      item: 'https://airwaylab.app/about/flow-limitation',
    },
  ],
};

const medicalPageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'What Is PAP Flow Limitation?',
  description: 'Learn about flow limitation in PAP therapy: causes, detection methods, and how AirwayLab measures it using Glasgow Index, WAT, and NED analysis.',
  url: 'https://airwaylab.app/about/flow-limitation',
  about: {
    '@type': 'Thing',
    name: 'Inspiratory Flow Limitation',
    alternateName: 'Upper Airway Resistance',
  },
  audience: { '@type': 'Audience', audienceType: 'General Public' },
  isPartOf: { '@type': 'WebSite', name: 'AirwayLab', url: 'https://airwaylab.app' },
};

const detectionMethods = [
  {
    icon: Activity,
    name: 'Glasgow Index',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/5',
    approach:
      'Scores each breath on 9 shape descriptors (skew, flat top, spike, etc.) to produce a composite flow limitation score. Typical scores range from 0 to about 3. Best for overall therapy quality assessment.',
    link: '/about/glasgow-index',
  },
  {
    icon: Waves,
    name: 'WAT (Wobble Analysis Tool)',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-500/5',
    approach:
      'Analyses ventilation patterns using three complementary metrics: FL Score (tidal volume variance), Regularity Score (Sample Entropy), and Periodicity Index (FFT spectral analysis for periodic breathing detection).',
    link: '/about',
  },
  {
    icon: Wind,
    name: 'NED Analysis',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/20',
    bgColor: 'bg-amber-500/5',
    approach:
      'Measures the ratio of peak-to-mid inspiratory flow (Negative Effort Dependence) to quantify airway narrowing. Also detects M-shaped breaths and automated RERA event sequences.',
    link: '/about',
  },
];

export default function FlowLimitationPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Static JSON-LD from hardcoded constants - safe, no user input */}
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
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          What Is PAP Flow Limitation?
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Flow limitation occurs when your airway partially narrows during PAP
          therapy, restricting airflow even though it doesn&apos;t fully collapse.
          It&apos;s one of the most under-recognised issues in sleep therapy
          &mdash; your AHI can look perfect while significant flow limitation
          quietly degrades your sleep quality.
        </p>
      </div>

      {/* Why It Matters */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          Why flow limitation matters
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 sm:p-6">
          <div className="flex flex-col gap-4 text-sm leading-relaxed text-muted-foreground">
            <p>
              Most PAP machines report the <strong className="text-foreground">Apnea-Hypopnea Index (AHI)</strong> as
              the primary measure of therapy effectiveness. AHI counts only
              complete airway closures (apneas) and significant reductions in
              airflow (hypopneas). But the airway can be substantially narrowed
              &mdash; reducing airflow and increasing respiratory effort &mdash;
              without triggering either threshold.
            </p>
            <p>
              This is flow limitation: the airway is open enough that AHI stays
              low, but narrow enough that your body works harder to breathe. Over
              time, this increased effort fragments sleep, causes micro-arousals,
              and can leave you feeling unrefreshed despite &ldquo;great&rdquo; AHI
              numbers.
            </p>
            <p>
              Flow limitation is closely related to{' '}
              <strong className="text-foreground">Upper Airway Resistance Syndrome (UARS)</strong> and{' '}
              <strong className="text-foreground">Respiratory Effort-Related Arousals (RERAs)</strong> &mdash;
              conditions that are increasingly recognised in sleep medicine but
              often missed by standard home sleep testing.
            </p>
          </div>
        </div>
      </section>

      {/* Signs */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          Signs your therapy may have flow limitation
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            {
              title: 'Low AHI but poor sleep quality',
              desc: 'Your machine reports AHI < 5 but you still wake unrefreshed, experience daytime fatigue, or have morning headaches.',
            },
            {
              title: 'Flattened flow waveform',
              desc: 'In OSCAR or AirwayLab, inspiratory flow shows a flat plateau rather than a smooth rounded peak — the classic flow limitation signature.',
            },
            {
              title: 'Frequent micro-arousals',
              desc: 'Brief awakenings (3–15 seconds) that fragment sleep architecture without producing full apnea or hypopnea events.',
            },
            {
              title: 'Cycling pressure patterns',
              desc: 'AutoSet machines may show pressure "hunting" — repeatedly raising and lowering pressure — as the algorithm tries to respond to partial obstruction.',
            },
          ].map((sign) => (
            <div
              key={sign.title}
              className="rounded-xl border border-border/50 bg-card/30 p-4"
            >
              <h3 className="mb-1.5 text-sm font-semibold text-foreground">
                {sign.title}
              </h3>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {sign.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How AirwayLab Detects It */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          How AirwayLab detects flow limitation
        </h2>
        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
          AirwayLab reads the raw flow waveform data from your ResMed SD card and
          analyses every breath using three independent engines. Each method
          detects different manifestations of flow limitation, giving you a
          comprehensive picture that goes far beyond AHI.
        </p>
        <div className="flex flex-col gap-4">
          {detectionMethods.map((method) => (
            <div
              key={method.name}
              className={`rounded-xl border ${method.borderColor} ${method.bgColor} p-4 sm:p-5`}
            >
              <div className="mb-2 flex items-center gap-2.5">
                <method.icon className={`h-4 w-4 ${method.color}`} />
                <h3 className="text-sm font-semibold text-foreground">
                  {method.name}
                </h3>
              </div>
              <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                {method.approach}
              </p>
              <Link
                href={method.link}
                className="text-xs text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Learn more &rarr;
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* What To Do */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">
          What you can do about it
        </h2>
        <div className="rounded-xl border border-border/50 bg-card/30 p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2.5">
            <Stethoscope className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">
              Always consult your sleep physician
            </h3>
          </div>
          <div className="flex flex-col gap-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              AirwayLab identifies flow limitation patterns in your data.
              Your clinician can review these findings and determine whether
              any therapy adjustments are appropriate. AirwayLab provides the
              data to support that conversation.
            </p>
            <p>
              Bring your AirwayLab report to your next appointment -- the
              metrics, trends, and engine-level detail give your clinician
              objective evidence to work with alongside your symptoms and
              clinical history.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy callout */}
      <div className="mb-10 flex items-center gap-1.5 text-xs text-emerald-500">
        <Shield className="h-3.5 w-3.5 shrink-0" />
        <span>AirwayLab analyses your data entirely in your browser — nothing is uploaded to any server.</span>
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
          href="/analyze?demo"
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-card/50 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-card"
        >
          Try the demo
        </Link>
      </div>
    </div>
  );
}
