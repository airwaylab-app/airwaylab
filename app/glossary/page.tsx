import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, BookOpen } from 'lucide-react';
import { GLOSSARY_TERMS, CATEGORY_STYLES } from '@/lib/glossary-data';
import type { GlossaryTerm } from '@/lib/glossary-data';

export const metadata: Metadata = {
  title: 'Sleep Apnea & PAP Therapy Glossary | AirwayLab',
  description:
    'Definitions of sleep-disordered breathing terms, PAP therapy concepts, and AirwayLab analysis metrics. From AHI to UARS, explained for PAP users.',
  keywords: [
    'sleep apnea glossary',
    'PAP therapy terms',
    'CPAP glossary',
    'flow limitation definition',
    'AHI definition',
    'RERA definition',
    'UARS definition',
    'Glasgow Index',
    'NED sleep',
    'ODI definition',
  ],
  openGraph: {
    title: 'Sleep Apnea & PAP Therapy Glossary | AirwayLab',
    description:
      'Definitions of sleep-disordered breathing terms, PAP therapy concepts, and AirwayLab analysis metrics. From AHI to UARS, explained for PAP users.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/glossary',
  },
};

/* ------------------------------------------------------------------ */
/*  JSON-LD structured data                                            */
/*  All content is static from lib/glossary-data.ts — safe to inline.  */
/* ------------------------------------------------------------------ */

const glossaryJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'DefinedTermSet',
  name: 'Sleep Apnea & PAP Therapy Glossary',
  description:
    'Definitions of sleep-disordered breathing terms, PAP therapy concepts, and AirwayLab analysis metrics.',
  url: 'https://airwaylab.app/glossary',
  hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
    '@type': 'DefinedTerm',
    name: t.title,
    description: t.shortDescription,
    url: `https://airwaylab.app/glossary/${t.slug}`,
  })),
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
      name: 'Glossary',
      item: 'https://airwaylab.app/glossary',
    },
  ],
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const sorted = [...GLOSSARY_TERMS].sort((a, b) =>
  a.title.localeCompare(b.title)
);

const termsByLetter = sorted.reduce<Record<string, GlossaryTerm[]>>(
  (acc, term) => {
    const letter = term.title.charAt(0).toUpperCase();
    if (!acc[letter]) acc[letter] = [];
    acc[letter].push(term);
    return acc;
  },
  {}
);

const activeLetters = new Set(Object.keys(termsByLetter));
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function GlossaryPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(glossaryJsonLd) }}
      />
      <script
        type="application/ld+json"
         
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2.5">
          <BookOpen className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Glossary
          </h1>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Definitions of sleep medicine terms, PAP therapy concepts, and the
          metrics used throughout AirwayLab. Click any term for the full
          explanation with normal ranges and clinical context.
        </p>
      </div>

      {/* A-Z Quick Nav */}
      <nav
        aria-label="Glossary alphabet navigation"
        className="sticky top-16 z-10 -mx-4 mb-8 bg-background/80 px-4 py-3 backdrop-blur-xl"
      >
        <div className="flex flex-wrap gap-1">
          {alphabet.map((letter) =>
            activeLetters.has(letter) ? (
              <a
                key={letter}
                href={`#${letter.toLowerCase()}`}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                aria-label={`Jump to letter ${letter}`}
              >
                {letter}
              </a>
            ) : (
              <span
                key={letter}
                className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold text-muted-foreground/30"
                aria-hidden="true"
              >
                {letter}
              </span>
            )
          )}
        </div>
      </nav>

      {/* Terms by letter */}
      <div className="flex flex-col gap-10">
        {alphabet
          .filter((letter) => activeLetters.has(letter))
          .map((letter) => (
            <section key={letter} id={letter.toLowerCase()}>
              <h2 className="mb-4 border-b border-border/50 pb-2 text-lg font-bold tracking-tight">
                {letter}
              </h2>
              <div className="flex flex-col gap-4">
                {termsByLetter[letter]!.map((term) => (
                  <Link
                    key={term.slug}
                    href={`/glossary/${term.slug}`}
                    className="group scroll-mt-28 rounded-lg border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/30 hover:bg-card/50"
                    id={term.slug}
                  >
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">
                        {term.title}
                      </h3>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-medium ${CATEGORY_STYLES[term.category].className}`}
                      >
                        {CATEGORY_STYLES[term.category].label}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {term.shortDescription}
                    </p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Read more <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
      </div>

      {/* Cross-links */}
      <div className="mt-12 border-t border-border/50 pt-8">
        <h2 className="mb-3 text-lg font-semibold">Go deeper</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/about/flow-limitation"
            className="group rounded-lg border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/30"
          >
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">Flow Limitation</h3>
            <p className="mt-1 text-xs text-muted-foreground">How AirwayLab detects and scores airway restriction.</p>
          </Link>
          <Link
            href="/about/glasgow-index"
            className="group rounded-lg border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/30"
          >
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">Glasgow Index</h3>
            <p className="mt-1 text-xs text-muted-foreground">The 9-component breath shape scoring methodology.</p>
          </Link>
          <Link
            href="/about/oximetry-analysis"
            className="group rounded-lg border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/30"
          >
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">Oximetry Analysis</h3>
            <p className="mt-1 text-xs text-muted-foreground">17-metric SpO2 and heart rate analysis framework.</p>
          </Link>
        </div>
      </div>

      {/* Blog links */}
      <div className="mt-8 border-t border-border/50 pt-8">
        <h2 className="mb-3 text-lg font-semibold">From the blog</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link
            href="/blog/ahi-normal-still-tired"
            className="group rounded-lg border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/30"
          >
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">AHI Normal, Still Tired?</h3>
            <p className="mt-1 text-xs text-muted-foreground">What your data is missing when AHI looks fine.</p>
          </Link>
          <Link
            href="/blog/understanding-flow-limitation"
            className="group rounded-lg border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/30"
          >
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">Understanding Flow Limitation</h3>
            <p className="mt-1 text-xs text-muted-foreground">The subtle restriction your AHI completely ignores.</p>
          </Link>
          <Link
            href="/blog/how-pap-therapy-works"
            className="group rounded-lg border border-border/50 bg-card/30 p-4 transition-all hover:border-primary/30"
          >
            <h3 className="text-sm font-semibold text-foreground group-hover:text-primary">How PAP Therapy Works</h3>
            <p className="mt-1 text-xs text-muted-foreground">CPAP, BiPAP, and pressure support explained.</p>
          </Link>
        </div>
      </div>

      {/* Medical Disclaimer */}
      <section className="mt-12 mb-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6">
          <div className="mb-3 flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">
              Medical Disclaimer
            </h3>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AirwayLab is not a medical device and is not FDA-cleared or
            CE-marked. It is provided for educational and informational purposes
            only. The analysis results should not be used as a substitute for
            professional medical advice, diagnosis, or treatment. Always consult
            qualified healthcare providers regarding your sleep therapy and any
            changes to PAP settings.
          </p>
        </div>
      </section>
    </div>
  );
}
