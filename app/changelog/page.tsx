import type { Metadata } from 'next';
import Link from 'next/link';
import { Sparkles, Wrench, Bug, Shield, Accessibility, Package } from 'lucide-react';
import { parseChangelog } from '@/lib/changelog-parser';

export const metadata: Metadata = {
  title: "What's New — AirwayLab",
  description:
    "See what's new in AirwayLab. Latest features, improvements, and bug fixes — explained in plain language.",
  openGraph: {
    title: "What's New — AirwayLab",
    description:
      "See what's new in AirwayLab. Latest features, improvements, and bug fixes.",
    type: 'website',
    url: 'https://airwaylab.app/changelog',
  },
  alternates: {
    canonical: 'https://airwaylab.app/changelog',
  },
};

const CATEGORY_ICONS: Record<string, { icon: typeof Sparkles; color: string }> = {
  New: { icon: Sparkles, color: 'text-emerald-400' },
  Improved: { icon: Wrench, color: 'text-blue-400' },
  'Bug Fixes': { icon: Bug, color: 'text-amber-400' },
  Accessibility: { icon: Accessibility, color: 'text-violet-400' },
  Security: { icon: Shield, color: 'text-rose-400' },
};

const DEFAULT_ICON = { icon: Package, color: 'text-muted-foreground' };

export default function ChangelogPage() {
  const versions = parseChangelog();

  // Schema markup uses only server-controlled static data (no user input)
  const changelogJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AirwayLab',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web',
    url: 'https://airwaylab.app',
    softwareVersion: versions[0]?.version,
    dateModified: versions[0]?.date,
    releaseNotes: `https://airwaylab.app/changelog`,
  };

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://airwaylab.app' },
      { '@type': 'ListItem', position: 2, name: 'Changelog', item: 'https://airwaylab.app/changelog' },
    ],
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(changelogJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          What&apos;s New
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          A summary of new features, improvements, and fixes in each update.
          This page updates automatically with every release.
        </p>
      </div>

      {/* Timeline */}
      <div className="relative flex flex-col gap-10">
        {/* Vertical line */}
        <div
          className="absolute left-[7px] top-2 bottom-2 w-px bg-border/50 sm:left-[9px]"
          aria-hidden="true"
        />

        {versions.map((version, vIdx) => (
          <section key={version.version} aria-label={`Version ${version.version}`}>
            {/* Version header */}
            <div className="relative mb-4 flex items-center gap-3">
              {/* Timeline dot */}
              <div
                className={`relative z-10 h-4 w-4 shrink-0 rounded-full border-2 sm:h-5 sm:w-5 ${
                  vIdx === 0
                    ? 'border-primary bg-primary/20'
                    : 'border-border bg-background'
                }`}
                aria-hidden="true"
              />
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="text-lg font-bold tracking-tight sm:text-xl">
                  {version.version}
                </h2>
                <time
                  dateTime={version.date}
                  className="text-xs text-muted-foreground"
                >
                  {version.dateFormatted}
                </time>
                {vIdx === 0 && (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                    Latest
                  </span>
                )}
              </div>
            </div>

            {/* Categories */}
            <div className="ml-5 flex flex-col gap-4 border-l border-transparent pl-4 sm:ml-6 sm:pl-5">
              {version.categories.map((category) => {
                const { icon: Icon, color } =
                  CATEGORY_ICONS[category.label] ?? DEFAULT_ICON;

                return (
                  <div key={category.label}>
                    <div className="mb-2 flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        {category.label}
                      </h3>
                    </div>
                    <ul className="flex flex-col gap-2">
                      {category.entries.map((entry, eIdx) => (
                        <li key={eIdx} className="flex gap-3 text-sm">
                          <span
                            className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/40"
                            aria-hidden="true"
                          />
                          <div>
                            <span className="font-medium text-foreground">
                              {entry.title}
                            </span>
                            {entry.description && (
                              <span className="text-muted-foreground">
                                {' — '}
                                {entry.description}
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Cross-links */}
      <div className="mt-12 border-t border-border/50 pt-8">
        <p className="text-sm text-muted-foreground">
          Want to understand the analysis behind these features? Read the{' '}
          <Link href="/about" className="text-primary hover:text-primary/80">methodology documentation</Link>,
          explore the{' '}
          <Link href="/blog" className="text-primary hover:text-primary/80">blog</Link> for deep dives,
          or check the{' '}
          <Link href="/glossary" className="text-primary hover:text-primary/80">metric glossary</Link> for definitions.
        </p>
      </div>
    </div>
  );
}
