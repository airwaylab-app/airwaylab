import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Tag } from 'lucide-react';
import { blogPosts, getPostBySlug, getAllSlugs } from '@/lib/blog-posts';

// Lazy-load post components
import CNSSensitization from '../posts/what-is-cns-sensitization';
import UnderstandingFlowLimitation from '../posts/understanding-flow-limitation';
import BeyondAHI from '../posts/beyond-ahi';
import CPAPDataPrivacy from '../posts/cpap-data-privacy';

const postComponents: Record<string, React.ComponentType> = {
  'what-is-cns-sensitization': CNSSensitization,
  'understanding-flow-limitation': UnderstandingFlowLimitation,
  'beyond-ahi': BeyondAHI,
  'cpap-data-privacy': CPAPDataPrivacy,
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
    title: `${post.title} — AirwayLab`,
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

  // Find related posts (other posts, excluding current)
  const relatedPosts = blogPosts.filter((p) => p.slug !== slug).slice(0, 2);

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
          <h2 className="mb-4 text-lg font-bold">More from AirwayLab</h2>
          <div className="grid gap-4 sm:grid-cols-2">
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
