import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';
import HowToExportAndUnderstandYourCPAPDataPost from '../posts/how-to-export-and-understand-your-cpap-data';

const slug = 'how-to-export-and-understand-your-cpap-data';
const title = 'How to Export and Understand Your CPAP Data';
const description =
  'Learn how to export CPAP data from ResMed, Philips, and Fisher & Paykel machines, what the numbers mean, and how tools like AirwayLab help you see the full picture.';
const date = '2026-04-15';
const readTime = '8 min read';
const tags = ['CPAP', 'Getting Started', 'ResMed', 'SD Card', 'Flow Limitation', 'AHI'];

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
      name: 'How do I get my CPAP data onto my computer?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Power off your machine, remove the SD card from its slot, and insert it into a computer using an SD card reader. Open OSCAR or AirwayLab to read the data. ResMed files are .edf; Philips files use .001 or Encore Pro format. The import process in either tool takes under a minute.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between AHI and flow limitation?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AHI counts discrete breathing events that cross a defined threshold of length and airflow reduction. Flow limitation captures something different: the partial breath-peak flattening that can occur without registering as a scored event. Both are data points your clinician may want to review together.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I analyse my data without installing software?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. AirwayLab runs entirely in your browser — no download, no account. Load your SD card data via the file picker and view trend charts and nightly summaries right away.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is my data private when I use AirwayLab?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Standard analysis in AirwayLab runs locally in your browser using Web Workers. Nothing is transmitted. If you use optional AI-assisted features, the tool asks for explicit consent before any data leaves your device.',
      },
    },
    {
      '@type': 'Question',
      name: 'Which machines does AirwayLab support?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AirwayLab currently supports ResMed AirSense 10, AirSense 11, and AirCurve series via SD card. For other manufacturers — Philips, Fisher & Paykel — OSCAR offers broader compatibility at this time.',
      },
    },
  ],
};

export default function HowToExportAndUnderstandYourCPAPDataPage() {
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
      <HowToExportAndUnderstandYourCPAPDataPost />
    </div>
  );
}
