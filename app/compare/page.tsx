import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  AlertTriangle,
  BarChart3,
  Cloud,
  Lock,
  Monitor,
  Smartphone,
  Zap,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Compare CPAP Analysis Tools -- AirwayLab vs OSCAR, SleepHQ, myAir',
  description:
    'Side-by-side comparison of CPAP analysis software: AirwayLab, OSCAR, SleepHQ, and myAir. Compare privacy, features, cost, and flow limitation analysis capabilities.',
  openGraph: {
    title: 'Compare CPAP Analysis Tools -- AirwayLab vs OSCAR, SleepHQ, myAir',
    description:
      'Side-by-side comparison of CPAP analysis software. Compare privacy, features, cost, and flow limitation analysis capabilities.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/compare',
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
  ],
};

type FeatureSupport = 'yes' | 'no' | 'partial' | 'basic' | 'opt-in' | string;

interface ComparisonRow {
  feature: string;
  oscar: FeatureSupport;
  sleephq: FeatureSupport;
  myair: FeatureSupport;
  airwaylab: FeatureSupport;
}

const comparisonData: ComparisonRow[] = [
  { feature: 'Flow limitation scoring', oscar: 'no', sleephq: 'no', myair: 'no', airwaylab: '4 engines' },
  { feature: 'RERA detection', oscar: 'no', sleephq: 'no', myair: 'no', airwaylab: 'yes' },
  { feature: 'Glasgow Index', oscar: 'no', sleephq: 'no', myair: 'no', airwaylab: 'yes' },
  { feature: 'AI-powered insights', oscar: 'no', sleephq: 'no', myair: 'no', airwaylab: 'opt-in' },
  { feature: 'Interactive waveform zoom', oscar: 'yes', sleephq: 'basic', myair: 'no', airwaylab: 'Viewer' },
  { feature: 'Multi-device support', oscar: 'yes', sleephq: 'yes', myair: 'ResMed only', airwaylab: 'ResMed only' },
  { feature: 'Oximetry analysis', oscar: 'basic', sleephq: 'basic', myair: 'no', airwaylab: '17 metrics' },
  { feature: 'Runs in browser', oscar: 'no', sleephq: 'yes', myair: 'yes', airwaylab: 'yes' },
  { feature: 'Mobile app', oscar: 'no', sleephq: 'yes', myair: 'yes', airwaylab: 'no' },
  { feature: 'Data stays on your device', oscar: 'yes', sleephq: 'no', myair: 'no', airwaylab: 'yes' },
  { feature: 'Open source', oscar: 'yes', sleephq: 'no', myair: 'no', airwaylab: 'yes' },
  { feature: 'Cost', oscar: 'Free', sleephq: '$15/mo', myair: 'Free', airwaylab: 'Free core' },
];

function getCellStyle(value: FeatureSupport): string {
  const lower = value.toLowerCase();
  if (lower === 'yes' || lower === 'free' || lower === '4 engines' || lower === '17 metrics' || lower === 'free core') {
    return 'text-emerald-400';
  }
  if (lower === 'no') {
    return 'text-muted-foreground/60';
  }
  return 'text-muted-foreground';
}

const tools = [
  {
    name: 'OSCAR',
    tagline: 'The veteran desktop tool for waveform inspection',
    icon: Monitor,
    color: 'text-blue-400',
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/5',
    strengths: [
      'Interactive breath-by-breath waveform zoom',
      'Supports ResMed, Philips, F&P, and more',
      'Years of historical data in one view',
      'Massive community knowledge base',
    ],
    link: '/compare/oscar',
  },
  {
    name: 'SleepHQ',
    tagline: 'Cloud-based analysis with mobile convenience',
    icon: Cloud,
    color: 'text-purple-400',
    borderColor: 'border-purple-500/20',
    bgColor: 'bg-purple-500/5',
    strengths: [
      'Mobile app with push notifications',
      'Auto-sync from some devices',
      'Cloud-based -- access from anywhere',
      'Multi-device support',
    ],
    link: '/compare/sleephq',
  },
  {
    name: 'myAir',
    tagline: "ResMed's official companion app",
    icon: Smartphone,
    color: 'text-sky-400',
    borderColor: 'border-sky-500/20',
    bgColor: 'bg-sky-500/5',
    strengths: [
      'Automatic data sync from ResMed machines',
      'Simple, accessible interface',
      'Coaching tips for new users',
      'Free with your ResMed device',
    ],
    link: '/compare/myair',
  },
  {
    name: 'AirwayLab',
    tagline: 'Research-grade flow limitation analysis in your browser',
    icon: Zap,
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/20',
    bgColor: 'bg-emerald-500/5',
    strengths: [
      'Four independent flow limitation engines',
      'RERA detection and Glasgow Index',
      'Browser-only -- data never leaves your device',
      'Open source (GPL-3.0)',
    ],
    link: '/analyze',
  },
];

export default function ComparePage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <div className="mb-10 sm:mb-14">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Compare CPAP Analysis Tools
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Choosing the right CPAP analysis tool depends on what you need: detailed waveform
          inspection, automated flow limitation scoring, mobile convenience, or privacy-first
          analysis. Here is how the main options compare.
        </p>
      </div>

      {/* Tool cards */}
      <section className="mb-12">
        <div className="flex items-center gap-2.5">
          <BarChart3 className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">The Tools</h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {tools.map((tool) => (
            <Link
              key={tool.name}
              href={tool.link}
              className={`group rounded-xl border ${tool.borderColor} ${tool.bgColor} p-5 transition-colors hover:border-opacity-40`}
            >
              <div className="mb-3 flex items-center gap-2.5">
                <tool.icon className={`h-5 w-5 ${tool.color}`} />
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{tool.name}</h3>
                  <p className="text-xs text-muted-foreground">{tool.tagline}</p>
                </div>
              </div>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {tool.strengths.map((strength) => (
                  <li key={strength} className="flex gap-2">
                    <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${tool.color.replace('text-', 'bg-')}`} />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground">
                {tool.name === 'AirwayLab' ? 'Try it free' : `Compare with AirwayLab`}
                <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Full comparison table */}
      <section className="mb-12">
        <div className="flex items-center gap-2.5">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-xl font-bold sm:text-2xl">Feature Comparison</h2>
        </div>
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="py-3 pr-4 text-left font-semibold text-foreground">Feature</th>
                <th className="px-3 py-3 text-center font-semibold text-foreground">OSCAR</th>
                <th className="px-3 py-3 text-center font-semibold text-foreground">SleepHQ</th>
                <th className="px-3 py-3 text-center font-semibold text-foreground">myAir</th>
                <th className="px-3 py-3 text-center font-semibold text-foreground">AirwayLab</th>
              </tr>
            </thead>
            <tbody className="text-muted-foreground">
              {comparisonData.map((row) => (
                <tr key={row.feature} className="border-b border-border/30">
                  <td className="py-2.5 pr-4">{row.feature}</td>
                  <td className={`px-3 py-2.5 text-center ${getCellStyle(row.oscar)}`}>
                    {row.oscar === 'no' ? '--' : row.oscar === 'yes' ? 'Yes' : row.oscar}
                  </td>
                  <td className={`px-3 py-2.5 text-center ${getCellStyle(row.sleephq)}`}>
                    {row.sleephq === 'no' ? '--' : row.sleephq === 'yes' ? 'Yes' : row.sleephq}
                  </td>
                  <td className={`px-3 py-2.5 text-center ${getCellStyle(row.myair)}`}>
                    {row.myair === 'no' ? '--' : row.myair === 'yes' ? 'Yes' : row.myair}
                  </td>
                  <td className={`px-3 py-2.5 text-center ${getCellStyle(row.airwaylab)}`}>
                    {row.airwaylab === 'no' ? '--' : row.airwaylab === 'yes' ? 'Yes' : row.airwaylab}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Individual comparison links */}
      <section className="mb-12">
        <h2 className="text-xl font-bold sm:text-2xl">Detailed Comparisons</h2>
        <div className="mt-4 space-y-3">
          <Link
            href="/compare/oscar"
            className="flex items-center justify-between rounded-xl border border-border/50 p-4 transition-colors hover:border-border"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">AirwayLab vs OSCAR</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Complementary tools: automated analysis meets interactive waveform browsing
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            href="/compare/sleephq"
            className="flex items-center justify-between rounded-xl border border-border/50 p-4 transition-colors hover:border-border"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">AirwayLab vs SleepHQ</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Privacy-first browser analysis vs cloud-based convenience
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
          <Link
            href="/compare/myair"
            className="flex items-center justify-between rounded-xl border border-border/50 p-4 transition-colors hover:border-border"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">AirwayLab vs myAir</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Go beyond basic AHI metrics with research-grade flow limitation analysis
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="mb-10 rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="text-lg font-bold">Try AirwayLab Free</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload your ResMed SD card and get flow limitation analysis in minutes. Four research-grade
          engines, composite metrics, RERA detection, and trend tracking. No installation, no account
          required, 100% private.
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
      <section className="mb-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Medical Disclaimer</h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AirwayLab is not a medical device and is not FDA-cleared or CE-marked. It is provided
            for educational and informational purposes only. The analysis results should not be used
            as a substitute for professional medical advice, diagnosis, or treatment. Always consult
            qualified healthcare providers regarding your sleep therapy and any changes to PAP
            settings.
          </p>
        </div>
      </section>
    </div>
  );
}
