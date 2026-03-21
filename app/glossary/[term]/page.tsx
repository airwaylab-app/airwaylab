import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangle, ArrowRight, BookOpen, ChevronRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  GLOSSARY_TERMS,
  CATEGORY_STYLES,
  getTermBySlug,
  getAllSlugs,
} from '@/lib/glossary-data';

/* ------------------------------------------------------------------ */
/*  Static generation                                                  */
/* ------------------------------------------------------------------ */

export function generateStaticParams() {
  return getAllSlugs().map((term) => ({ term }));
}

/* ------------------------------------------------------------------ */
/*  Metadata                                                           */
/* ------------------------------------------------------------------ */

type PageProps = { params: Promise<{ term: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { term: slug } = await params;
  const term = getTermBySlug(slug);
  if (!term) return {};

  const title = `${term.title} — CPAP & Sleep Apnea Glossary | AirwayLab`;
  const description = term.shortDescription;

  return {
    title,
    description,
    keywords: [
      term.title.toLowerCase(),
      `what is ${term.title.toLowerCase()}`,
      `${term.title.toLowerCase()} CPAP`,
      `${term.title.toLowerCase()} sleep apnea`,
      'PAP therapy glossary',
      'sleep apnea terms',
    ],
    openGraph: {
      title,
      description,
      url: `https://airwaylab.app/glossary/${term.slug}`,
      type: 'article',
    },
    alternates: {
      canonical: `https://airwaylab.app/glossary/${term.slug}`,
    },
  };
}

/* ------------------------------------------------------------------ */
/*  Traffic light color helpers                                        */
/* ------------------------------------------------------------------ */

const rangeColors = {
  emerald: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/20',
  },
  amber: {
    dot: 'bg-amber-500',
    text: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
  },
  red: {
    dot: 'bg-red-500',
    text: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default async function GlossaryTermPage({ params }: PageProps) {
  const { term: slug } = await params;
  const term = getTermBySlug(slug);
  if (!term) notFound();

  const category = CATEGORY_STYLES[term.category];

  // Resolve related terms to their titles
  const relatedTermData = term.relatedTerms
    .map((s) => GLOSSARY_TERMS.find((t) => t.slug === s))
    .filter(Boolean);

  // JSON-LD: FAQ schema (static data, safe for dangerouslySetInnerHTML)
  const faqJsonLd = term.faqItems.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: term.faqItems.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      }
    : null;

  // JSON-LD: BreadcrumbList (static data, safe for dangerouslySetInnerHTML)
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
      {
        '@type': 'ListItem',
        position: 3,
        name: term.title,
        item: `https://airwaylab.app/glossary/${term.slug}`,
      },
    ],
  };

  // JSON-LD: DefinedTerm (static data, safe for dangerouslySetInnerHTML)
  const definedTermJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: term.title,
    description: term.shortDescription,
    url: `https://airwaylab.app/glossary/${term.slug}`,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: 'AirwayLab Sleep Apnea & PAP Therapy Glossary',
      url: 'https://airwaylab.app/glossary',
    },
  };

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
      {/* JSON-LD structured data (all content is static, from lib/glossary-data.ts) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(definedTermJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      {/* Breadcrumb nav */}
      <nav
        aria-label="Breadcrumb"
        className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground"
      >
        <Link href="/" className="transition-colors hover:text-foreground">
          Home
        </Link>
        <ChevronRight className="h-3 w-3" />
        <Link href="/glossary" className="transition-colors hover:text-foreground">
          Glossary
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{term.title}</span>
      </nav>

      {/* Header */}
      <header className="mb-8">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className={`rounded-md px-2.5 py-0.5 text-[11px] font-medium ${category.className}`}
          >
            {category.label}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          {term.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
          {term.shortDescription}
        </p>
      </header>

      {/* Full description */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-semibold tracking-tight">
          What Is {term.title}?
        </h2>
        <div className="flex flex-col gap-4">
          {term.fullDescription.split('\n\n').map((paragraph, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed text-muted-foreground"
            >
              {paragraph}
            </p>
          ))}
        </div>
      </section>

      {/* Normal ranges */}
      {term.normalRanges && term.normalRanges.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            Normal Ranges
          </h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {term.normalRanges.map((range) => {
              const colors = rangeColors[range.color];
              return (
                <div
                  key={range.label}
                  className={`rounded-lg border ${colors.border} ${colors.bg} px-4 py-3`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${colors.dot}`} />
                    <span className={`text-xs font-semibold ${colors.text}`}>
                      {range.label}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {range.range}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* How AirwayLab measures this */}
      {term.howAirwayLabMeasures && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Activity className="h-5 w-5 text-primary" />
            How AirwayLab Measures This
          </h2>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {term.howAirwayLabMeasures}
            </p>
            <Link
              href="/analyze"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-primary transition-colors hover:text-primary/80"
            >
              Try it with your data <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {/* FAQ */}
      {term.faqItems.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            Frequently Asked Questions
          </h2>
          <div className="rounded-xl border border-border/50 bg-card/30">
            {term.faqItems.map((faq, i) => (
              <div
                key={i}
                className="border-b border-border/40 px-5 py-4 last:border-b-0"
              >
                <h3 className="mb-2 text-sm font-semibold text-foreground">
                  {faq.question}
                </h3>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Related terms */}
      {relatedTermData.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight">
            <BookOpen className="h-5 w-5 text-muted-foreground" />
            Related Terms
          </h2>
          <div className="flex flex-wrap gap-2">
            {relatedTermData.map((related) => (
              <Link
                key={related!.slug}
                href={`/glossary/${related!.slug}`}
                className="rounded-lg border border-border/50 bg-card/30 px-3 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                {related!.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Related blog posts */}
      {term.relatedBlogPosts.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold tracking-tight">
            From the Blog
          </h2>
          <div className="flex flex-col gap-2">
            {term.relatedBlogPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex items-center gap-2 rounded-lg border border-border/50 bg-card/30 px-4 py-3 transition-all hover:border-primary/30"
              >
                <span className="text-sm text-foreground group-hover:text-primary">
                  {post.title}
                </span>
                <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="mb-10">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center">
          <h2 className="mb-2 text-lg font-semibold">
            Analyze Your Data
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Upload your ResMed SD card and see your own {term.title} results.
            Free, private, and browser-based.
          </p>
          <Link href="/analyze">
            <Button className="gap-2 shadow-glow">
              Upload Your SD Card <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Medical Disclaimer */}
      <section className="mb-8">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
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

      {/* Back link */}
      <Link
        href="/glossary"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        &larr; Back to Glossary
      </Link>
    </div>
  );
}
