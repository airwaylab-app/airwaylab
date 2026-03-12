import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { Github, AlertTriangle } from 'lucide-react';
import { ContactForm } from '@/components/contact/contact-form';

export const metadata: Metadata = {
  title: 'Contact — AirwayLab',
  description:
    'Get in touch with AirwayLab. Report issues, request features, ask questions, or reach out for privacy and accessibility concerns.',
  openGraph: {
    title: 'Contact — AirwayLab',
    description: 'Get in touch with AirwayLab for support, privacy, or accessibility concerns.',
  },
};

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contact</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          We read every message and aim to respond within 2 business days. For bugs and feature
          requests,{' '}
          <a
            href="https://github.com/airwaylab-app/airwaylab/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            GitHub Issues
          </a>{' '}
          is the fastest channel.
        </p>
      </div>

      <Suspense fallback={null}>
        <ContactForm />
      </Suspense>

      <div className="mt-8 space-y-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Security vulnerabilities:</strong> Please use the
              form above with &ldquo;Security vulnerability&rdquo; selected. Do not open a public
              GitHub issue for security vulnerabilities.
            </p>
          </div>
        </div>

        <a
          href="https://github.com/airwaylab-app/airwaylab"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 rounded-xl border border-border/50 bg-card/30 p-4 transition-colors hover:border-border hover:bg-card/50"
        >
          <Github className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">Source Code</p>
            <p className="text-xs text-muted-foreground">
              Open source under GPL-3.0. Browse, contribute, or fork.
            </p>
          </div>
        </a>
      </div>

      <div className="mt-6 text-xs text-muted-foreground/60">
        <p>
          Also see:{' '}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>{' '}
          &middot;{' '}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{' '}
          &middot;{' '}
          <Link href="/accessibility" className="text-primary hover:underline">
            Accessibility
          </Link>
        </p>
      </div>
    </div>
  );
}
