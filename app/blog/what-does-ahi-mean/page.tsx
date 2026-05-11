import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';
import WhatDoesAHIMeanPost from '../posts/what-does-ahi-mean';

const slug = 'what-does-ahi-mean';
const title = 'What Does AHI Mean? Understanding Your Sleep Apnea Score';
const description =
  'AHI measures how many breathing pauses occur per hour during sleep. Here’s what the number means, what it doesn’t cover, and when to talk to your clinician.';
const date = '2026-05-11';
const readTime = '7 min read';
const tags = ['AHI', 'Sleep Apnea', 'CPAP Metrics', 'Getting Started'];

export const metadata: Metadata = {
  title: `What Does AHI Mean? Understanding Your Sleep Apnea Score | AirwayLab`,
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
      name: 'What does AHI stand for?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'AHI stands for Apnea-Hypopnea Index. It counts the number of apneas (complete breathing pauses) and hypopneas (partial breathing reductions) per hour of recorded sleep time.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is a normal AHI for CPAP therapy?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Most ResMed devices aim to keep residual AHI below 5/hr during therapy, but what constitutes a well-managed result is something your clinician determines for you specifically based on your full history.',
      },
    },
    {
      '@type': 'Question',
      name: 'What is the difference between diagnostic AHI and residual AHI?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Diagnostic AHI is measured during a sleep study before you start therapy. Residual AHI is the value your CPAP machine reports while you are using therapy — this is what you see in AirwayLab and tools like OSCAR.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why does my AHI vary night to night?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Night-to-night variation in AHI is expected. Trends over weeks or months are more meaningful than individual nights. If you notice a persistent upward trend, it is worth raising with your sleep physician.',
      },
    },
  ],
};

export default function WhatDoesAHIMeanPage() {
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
      <WhatDoesAHIMeanPost />
    </div>
  );
}
