import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  HardDrive,
  Lightbulb,
  Shield,
  Upload,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DEVICE_GUIDES, getGuideBySlug, getAllGuideSlugs } from '@/lib/device-guides';

type PageProps = { params: Promise<{ device: string }> };

export function generateStaticParams() {
  return getAllGuideSlugs().map((device) => ({ device }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { device } = await params;
  const guide = getGuideBySlug(device);
  if (!guide) return {};

  const title = `How to Upload ${guide.fullName} Data to AirwayLab`;

  return {
    title,
    description: guide.metaDescription,
    keywords: [
      `${guide.name} SD card`,
      `${guide.name} data analysis`,
      `${guide.name} flow limitation`,
      `upload ${guide.name} data`,
      `${guide.name} CPAP data`,
      'AirwayLab',
      'ResMed SD card upload',
    ],
    openGraph: {
      title,
      description: guide.metaDescription,
      url: `https://airwaylab.app/guides/${guide.slug}`,
    },
    alternates: {
      canonical: `https://airwaylab.app/guides/${guide.slug}`,
    },
  };
}

export default async function DeviceGuidePage({ params }: PageProps) {
  const { device } = await params;
  const guide = getGuideBySlug(device);
  if (!guide) notFound();

  const otherGuides = DEVICE_GUIDES.filter((g) => g.slug !== guide.slug);

  // HowTo JSON-LD for rich snippets (all data is static from lib/device-guides.ts)
  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `How to Upload ${guide.fullName} Data to AirwayLab`,
    description: guide.metaDescription,
    tool: [
      { '@type': 'HowToTool', name: `${guide.fullName} with SD card` },
      { '@type': 'HowToTool', name: 'SD card reader (built-in or USB)' },
      { '@type': 'HowToTool', name: 'Computer with web browser' },
    ],
    step: guide.uploadSteps.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      text,
    })),
  };

  // FAQ JSON-LD (all data is static from lib/device-guides.ts)
  const faqJsonLd = guide.troubleshooting.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: guide.troubleshooting.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null;

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://airwaylab.app' },
      { '@type': 'ListItem', position: 2, name: 'Device Guides', item: 'https://airwaylab.app/guides' },
      {
        '@type': 'ListItem',
        position: 3,
        name: guide.name,
        item: `https://airwaylab.app/guides/${guide.slug}`,
      },
    ],
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* JSON-LD structured data: all content is static from lib/device-guides.ts */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link href="/" className="transition-colors hover:text-foreground">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/guides" className="transition-colors hover:text-foreground">Guides</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{guide.name}</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-primary/10 px-2.5 py-0.5 text-[11px] font-medium text-primary">
            {guide.type}
          </span>
          {guide.supportLevel === 'full' ? (
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              Fully supported
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-medium text-amber-400">
              <AlertTriangle className="h-3 w-3" />
              Partial support
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          How to Upload {guide.fullName} Data to AirwayLab
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {guide.metaDescription}
        </p>
      </header>

      {/* SD Card Info */}
      <section className="mb-8 rounded-xl border border-border/50 bg-card/30 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <HardDrive className="h-5 w-5 text-primary" />
          SD Card Details
        </h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground">Location</dt>
            <dd className="text-sm text-foreground">{guide.sdCardLocation}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground">Card type</dt>
            <dd className="text-sm text-foreground">{guide.sdCardType}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground">Data folder</dt>
            <dd className="font-mono text-sm text-foreground">{guide.datalogPath}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium text-muted-foreground">Sample rate</dt>
            <dd className="text-sm text-foreground">{guide.sampleRate}</dd>
          </div>
        </dl>
      </section>

      {/* Upload Steps */}
      <section className="mb-8">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
          <Upload className="h-5 w-5 text-primary" />
          Step-by-Step Upload
        </h2>
        <ol className="flex flex-col gap-3">
          {guide.uploadSteps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-xs font-bold text-primary">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed text-muted-foreground pt-0.5">
                {step}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Data Signals */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">
          What AirwayLab Reads From Your {guide.name}
        </h2>
        <div className="flex flex-col gap-2">
          {guide.signals.map((signal, i) => (
            <div key={i} className="rounded-lg border border-border/50 bg-card/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">{signal}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <Lightbulb className="h-5 w-5 text-amber-400" />
          Tips for {guide.name} Users
        </h2>
        <ul className="flex flex-col gap-2">
          {guide.tips.map((tip, i) => (
            <li key={i} className="flex gap-2.5 rounded-lg border border-border/50 bg-card/30 px-4 py-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <p className="text-sm text-muted-foreground">{tip}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Troubleshooting */}
      {guide.troubleshooting.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Wrench className="h-5 w-5 text-muted-foreground" />
            Troubleshooting
          </h2>
          <div className="rounded-xl border border-border/50 bg-card/30">
            {guide.troubleshooting.map((item, i) => (
              <div
                key={i}
                className="border-b border-border/40 px-5 py-4 last:border-b-0"
              >
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {item.question}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mb-8">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold">
            Ready to Analyse Your {guide.name} Data?
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Upload your SD card and see flow limitation scores, breath shape
            analysis, and RERA detection in seconds. Free and private.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/analyze">
              <Button className="gap-2 shadow-glow">
                <Upload className="h-4 w-4" /> Upload Your SD Card
              </Button>
            </Link>
            <Link href="/analyze?demo">
              <Button variant="outline" className="gap-2">
                Try the Demo First
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Privacy note */}
      <div className="mb-8 flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          All analysis runs in your browser. Your {guide.name} data never
          leaves your device unless you choose to share it. The code is
          open-source (GPL-3.0) and publicly auditable.
        </p>
      </div>

      {/* Other guides */}
      {otherGuides.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            Other device guides
          </h2>
          <div className="flex flex-wrap gap-2">
            {otherGuides.map((other) => (
              <Link
                key={other.slug}
                href={`/guides/${other.slug}`}
                className="rounded-lg border border-border/50 bg-card/30 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                {other.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Medical disclaimer */}
      <section className="mb-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="mb-3 flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Medical Disclaimer
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AirwayLab is not a medical device. Analysis results are for
            educational purposes only. Always discuss therapy changes with
            your sleep clinician.
          </p>
        </div>
      </section>

      {/* Back link */}
      <Link
        href="/guides"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; All device guides
      </Link>
    </div>
  );
}
