import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';
import OSCARCPAPSoftwareAlternativesPost from '../posts/oscar-cpap-software-alternatives';

const slug = 'oscar-cpap-software-alternatives';
const title = 'OSCAR CPAP Software Alternatives (And How They Compare)';
const description =
  'Looking for OSCAR CPAP software alternatives? We compare AirwayLab, SleepHQ, and ResMed myAir so you can find the right tool for your therapy data.';
const date = '2026-05-14';
const readTime = '7 min read';
const tags = ['OSCAR', 'CPAP Software', 'SleepHQ', 'Comparison', 'Data Privacy'];

export const metadata: Metadata = {
  title: `${title} — AirwayLab`,
  description,
  openGraph: {
    title,
    description,
    type: 'article',
    url: `https://airwaylab.app/blog/${slug}`,
    publishedTime: date,
    authors: ['AirwayLab'],
    tags,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
  alternates: {
    canonical: `https://airwaylab.app/blog/${slug}`,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: title,
  description,
  datePublished: date,
  author: {
    '@type': 'Organization',
    name: 'AirwayLab',
    url: 'https://airwaylab.app',
  },
  publisher: {
    '@type': 'Organization',
    name: 'AirwayLab',
    url: 'https://airwaylab.app',
  },
  mainEntityOfPage: `https://airwaylab.app/blog/${slug}`,
  keywords: tags.join(', '),
};

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://airwaylab.app' },
    { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://airwaylab.app/blog' },
    {
      '@type': 'ListItem',
      position: 3,
      name: title,
      item: `https://airwaylab.app/blog/${slug}`,
    },
  ],
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Is AirwayLab a replacement for OSCAR?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No — AirwayLab and OSCAR serve different use cases. OSCAR offers deep desktop-based waveform analysis; AirwayLab provides web-based, privacy-first visualisations you can access from any browser. Many users use both.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does AirwayLab upload my CPAP data to a server?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. All processing happens locally in your browser. Your data never leaves your device.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is AirwayLab free?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes — the free tier covers full analysis and is free and always will be. Premium adds longer history exports and additional trend views.',
      },
    },
  ],
};

export default function OSCARCPAPSoftwareAlternativesPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to Blog
        </Link>
      </nav>

      {/* Post Header */}
      <header className="mb-8">
        <div className="mb-3 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{title}</h1>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {readTime}
          </span>
        </div>
      </header>

      {/* Post Content */}
      <OSCARCPAPSoftwareAlternativesPost />
    </div>
  );
}
