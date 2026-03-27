import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, HardDrive, AlertTriangle, CheckCircle2, Shield } from 'lucide-react';
import { DEVICE_GUIDES } from '@/lib/device-guides';

export const metadata: Metadata = {
  title: 'Device Guides — Upload Your ResMed Data to AirwayLab',
  description:
    'Step-by-step guides for uploading CPAP and BiPAP SD card data to AirwayLab. Covers ResMed AirSense 10, AirSense 11, AirCurve 10, and BMC Luna / RESmart.',
  keywords: [
    'ResMed SD card upload',
    'AirSense 10 data analysis',
    'AirSense 11 CPAP data',
    'AirCurve 10 BiPAP data',
    'BMC Luna data analysis',
    'RESmart CPAP data',
    'CPAP SD card reader',
    'flow limitation analysis',
  ],
  openGraph: {
    title: 'Device Guides — Upload Your PAP Data to AirwayLab',
    description:
      'Step-by-step guides for uploading CPAP and BiPAP SD card data to AirwayLab. Covers ResMed AirSense 10, AirSense 11, AirCurve 10, and BMC Luna / RESmart.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/guides',
  },
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://airwaylab.app' },
    { '@type': 'ListItem', position: 2, name: 'Device Guides', item: 'https://airwaylab.app/guides' },
  ],
};

export default function GuidesPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Breadcrumb JSON-LD: static data, safe for inline script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2.5">
          <HardDrive className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Device Guides
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Step-by-step instructions for uploading your ResMed SD card data to
          AirwayLab. Select your device below.
        </p>
      </div>

      {/* Device cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {DEVICE_GUIDES.map((guide) => (
          <Link
            key={guide.slug}
            href={`/guides/${guide.slug}`}
            className="group rounded-xl border border-border/50 bg-card/30 p-5 transition-all hover:border-primary/30 hover:bg-card/50"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {guide.manufacturer}
              </span>
              {guide.supportLevel === 'full' ? (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" />
                  Full support
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  Partial
                </span>
              )}
            </div>
            <h2 className="mb-1 text-lg font-semibold text-foreground group-hover:text-primary">
              {guide.name}
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              {guide.type} — SD card on {guide.sdCardLocation.split(',')[0]?.toLowerCase()}
            </p>
            <span className="inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
              View guide <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </div>

      {/* Common info */}
      <div className="mt-10 rounded-xl border border-border/50 bg-card/30 p-5 sm:p-6">
        <h2 className="mb-3 text-sm font-semibold">What you need</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <HardDrive className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-medium">SD card reader</p>
              <p className="text-[11px] text-muted-foreground">
                Most laptops have a built-in slot. If not, a USB SD card reader
                costs a few dollars and works with any computer.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <div>
              <p className="text-xs font-medium">Your data stays private</p>
              <p className="text-[11px] text-muted-foreground">
                AirwayLab processes everything in your browser. No data is
                uploaded to any server unless you choose to share it.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Cross-links */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/getting-started" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
          Full getting started guide →
        </Link>
        <Link href="/analyze?demo" className="text-sm text-primary transition-colors hover:text-primary/80">
          Try the demo without uploading →
        </Link>
      </div>

      {/* Other devices */}
      <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
        <div className="flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <h3 className="text-sm font-semibold">Using a different device?</h3>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          AirwayLab currently supports ResMed and BMC devices. Philips
          Respironics and other manufacturers use different data formats.
          Support for additional devices is on the roadmap. If you upload
          an unsupported device, you can submit your file structure to help
          us add support.
        </p>
      </div>
    </div>
  );
}
