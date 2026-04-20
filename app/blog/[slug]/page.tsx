import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';
import { blogPosts, getPostBySlug, getAllSlugs } from '@/lib/blog-posts';

// Lazy-load post components
import AHINormalStillTired from '../posts/ahi-normal-still-tired';
import OSCARAlternative from '../posts/oscar-alternative';
import HowPAPTherapyWorks from '../posts/how-pap-therapy-works';
import IFLSymptomSensitivity from '../posts/ifl-symptom-sensitivity';
import HiddenRespiratoryEvents from '../posts/hidden-respiratory-events';
import FlowLimitationAndSleepiness from '../posts/flow-limitation-and-sleepiness';
import ArousalsVsFlowLimitation from '../posts/arousals-vs-flow-limitation';
import EpworthSleepinessScale from '../posts/epworth-sleepiness-scale';
import CNSSensitization from '../posts/what-is-cns-sensitization';
import UnderstandingFlowLimitation from '../posts/understanding-flow-limitation';
import BeyondAHI from '../posts/beyond-ahi';
import PAPDataPrivacy from '../posts/pap-data-privacy';
import WhyAHIIsLying from '../posts/why-ahi-is-lying';
import HowToReadCPAPData from '../posts/how-to-read-cpap-data';
import HowToAnalyzeCPAPDataAtHome from '../posts/how-to-analyze-cpap-data-at-home';
import HowToExportUnderstandCPAPData from '../posts/how-to-export-understand-cpap-data';
import V121ClearerLanguage from '../posts/v121-clearer-language';
import V122YourDataExplained from '../posts/v122-your-data-explained-not-judged';
import WhatIsGlasgowIndexCPAP from '../posts/what-is-glasgow-index-cpap';
import WhatIsWATScoreCPAP from '../posts/what-is-wat-score-cpap';
import WhatIsNEDSleepApnea from '../posts/what-is-ned-sleep-apnea';
import CPAPFlowLimitationScore05Meaning from '../posts/cpap-flow-limitation-score-0-5-meaning';
import ResMedSDCardBrowserAnalysis from '../posts/resmed-sd-card-browser-analysis';
import CPAPDataAnalysisBrowserNoDownload from '../posts/cpap-data-analysis-browser-no-download';
import BiPAPDataAnalysisAirCurve10 from '../posts/bipap-data-analysis-aircurve-10';
import FourMetricsAirwayLabMeasures from '../posts/four-metrics-airwaylab-measures';
import LowAHIStillTiredFlowLimitationRERAs from '../posts/low-ahi-still-tired-flow-limitation-reras';

const postComponents: Record<string, React.ComponentType> = {
  'resmed-sd-card-browser-analysis': ResMedSDCardBrowserAnalysis,
  'low-ahi-still-tired-flow-limitation-reras': LowAHIStillTiredFlowLimitationRERAs,
  'cpap-data-analysis-browser-no-download': CPAPDataAnalysisBrowserNoDownload,
  'bipap-data-analysis-aircurve-10': BiPAPDataAnalysisAirCurve10,
  'four-metrics-airwaylab-measures': FourMetricsAirwayLabMeasures,
  'v1-2-2-your-data-explained-not-judged': V122YourDataExplained,
  'how-to-read-cpap-data': HowToReadCPAPData,
  'how-to-analyze-cpap-data-at-home': HowToAnalyzeCPAPDataAtHome,
  'how-to-export-understand-cpap-data': HowToExportUnderstandCPAPData,
  'v121-clearer-language': V121ClearerLanguage,
  'what-is-glasgow-index-cpap': WhatIsGlasgowIndexCPAP,
  'what-is-wat-score-cpap': WhatIsWATScoreCPAP,
  'what-is-ned-sleep-apnea': WhatIsNEDSleepApnea,
  'cpap-flow-limitation-score-0-5-meaning': CPAPFlowLimitationScore05Meaning,
  'why-ahi-is-lying': WhyAHIIsLying,
  'ahi-normal-still-tired': AHINormalStillTired,
  'oscar-alternative': OSCARAlternative,
  'how-pap-therapy-works': HowPAPTherapyWorks,
  'ifl-symptom-sensitivity': IFLSymptomSensitivity,
  'hidden-respiratory-events': HiddenRespiratoryEvents,
  'flow-limitation-and-sleepiness': FlowLimitationAndSleepiness,
  'arousals-vs-flow-limitation': ArousalsVsFlowLimitation,
  'epworth-sleepiness-scale': EpworthSleepinessScale,
  'what-is-cns-sensitization': CNSSensitization,
  'understanding-flow-limitation': UnderstandingFlowLimitation,
  'beyond-ahi': BeyondAHI,
  'pap-data-privacy': PAPDataPrivacy,
};

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.seoTitle ?? `${post.title} — AirwayLab`,
    description: post.ogDescription,
    openGraph: {
      title: post.title,
      description: post.ogDescription,
      type: 'article',
      url: `https://airwaylab.app/blog/${post.slug}`,
      publishedTime: post.date,
      authors: ['AirwayLab'],
      tags: post.tags,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.ogDescription,
    },
    alternates: {
      canonical: `https://airwaylab.app/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const PostComponent = postComponents[slug];
  if (!PostComponent) notFound();

  // Find related posts by tag overlap, then recency
  const relatedPosts = blogPosts
    .filter((p) => p.slug !== slug)
    .map((p) => ({
      ...p,
      tagOverlap: p.tags.filter((t) => post.tags.includes(t)).length,
    }))
    .sort((a, b) => b.tagOverlap - a.tagOverlap || new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // JSON-LD for BlogPosting
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.ogDescription,
    datePublished: post.date,
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
    mainEntityOfPage: `https://airwaylab.app/blog/${post.slug}`,
    keywords: post.tags.join(', '),
  };

  // FAQ JSON-LD (only for posts with FAQ items)
  const faqJsonLd = post.faqItems?.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqItems.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      }
    : null;

  // Breadcrumb JSON-LD
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://airwaylab.app' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://airwaylab.app/blog' },
      {
        '@type': 'ListItem',
        position: 3,
        name: post.title,
        item: `https://airwaylab.app/blog/${post.slug}`,
      },
    ],
  };

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
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

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
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
            >
              <Tag className="h-2.5 w-2.5" />
              {tag}
            </span>
          ))}
        </div>
        <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {post.title}
        </h1>
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(post.date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {post.readTime}
          </span>
        </div>
      </header>

      {/* Post Content */}
      <PostComponent />

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="mt-12 border-t border-border/50 pt-8">
          <h2 className="mb-4 text-lg font-bold">Related reading</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {relatedPosts.map((related) => (
              <Link
                key={related.slug}
                href={`/blog/${related.slug}`}
                className="group rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:border-primary/30"
              >
                <h3 className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
                  {related.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                  {related.description}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground/60">{related.readTime}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
