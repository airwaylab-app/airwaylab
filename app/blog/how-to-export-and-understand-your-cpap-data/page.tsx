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
      name: 'How do I export data from my ResMed CPAP machine?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Power off your ResMed machine, remove the SD card from the side panel (AirSense 10/11) or under the humidifier chamber (S9), insert it into a card reader, and open the EDF files in an analysis tool like OSCAR or AirwayLab. No account or cloud service is required.',
      },
    },
    {
      '@type': 'Question',
      name: 'What does flow limitation mean in CPAP data?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Flow limitation is partial narrowing of the upper airway during sleep that restricts airflow without triggering a full apnoea or hypopnoea event. It appears as a flat-topped inspiratory waveform rather than a normal rounded peak. It can persist even when AHI is low.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I read my CPAP data without uploading it to the cloud?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Your machine stores detailed data on its SD card. Tools like AirwayLab process this data entirely in your browser — nothing is uploaded and your data never leaves your device.',
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
