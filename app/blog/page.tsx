import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Calendar, Clock, Tag } from 'lucide-react';
import { blogPosts } from '@/lib/blog-posts';

export const metadata: Metadata = {
  title: 'Blog — AirwayLab',
  description:
    'Evidence-based articles about PAP therapy, flow limitation, sleep apnea metrics, and data privacy. Written for patients and researchers alike.',
  openGraph: {
    title: 'Blog — AirwayLab',
    description:
      'Evidence-based articles about PAP therapy, flow limitation, sleep apnea metrics, and data privacy.',
    type: 'website',
    url: 'https://airwaylab.app/blog',
  },
  alternates: {
    canonical: 'https://airwaylab.app/blog',
  },
};

export default function BlogIndexPage() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-12">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Blog</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Evidence-based articles about PAP therapy, flow limitation, and sleep data analysis.
          Written for patients who want to understand their therapy — and researchers pushing the
          field forward.
        </p>
      </div>

      {/* Post Cards */}
      <div className="flex flex-col gap-6">
        {blogPosts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group rounded-xl border border-border/50 bg-card/50 p-5 transition-all hover:border-primary/30 hover:bg-card sm:p-6"
          >
            <div className="flex flex-col gap-3">
              {/* Tags */}
              <div className="flex flex-wrap gap-2">
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

              {/* Title */}
              <h2 className="text-lg font-bold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-xl">
                {post.title}
              </h2>

              {/* Description */}
              <p className="text-sm leading-relaxed text-muted-foreground">
                {post.description}
              </p>

              {/* Meta */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground/70">
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

              {/* Read More */}
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                Read article <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
