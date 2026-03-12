import type { Metadata } from 'next';
import Link from 'next/link';
import { Mail, Github, MessageSquare, Shield, FileText, Accessibility } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact — AirwayLab',
  description:
    'Get in touch with AirwayLab. Report issues, request features, ask questions, or reach out for privacy and accessibility concerns.',
  openGraph: {
    title: 'Contact — AirwayLab',
    description: 'Get in touch with AirwayLab for support, privacy, or accessibility concerns.',
  },
};

const channels = [
  {
    icon: MessageSquare,
    title: 'Bugs & Feature Requests',
    description: 'Report issues or suggest features via GitHub Issues.',
    link: 'https://github.com/airwaylab-app/airwaylab/issues',
    linkText: 'Open an issue',
    external: true,
  },
  {
    icon: Mail,
    title: 'General Questions',
    description: 'For questions about AirwayLab, partnerships, or press inquiries.',
    link: 'mailto:hello@airwaylab.app',
    linkText: 'hello@airwaylab.app',
    external: false,
  },
  {
    icon: Shield,
    title: 'Privacy & Data Requests',
    description: 'For data access, deletion, or privacy-related questions (GDPR, CCPA).',
    link: 'mailto:privacy@airwaylab.app',
    linkText: 'privacy@airwaylab.app',
    external: false,
  },
  {
    icon: FileText,
    title: 'Billing & Subscriptions',
    description: 'For refund requests, billing questions, or subscription issues.',
    link: 'mailto:billing@airwaylab.app',
    linkText: 'billing@airwaylab.app',
    external: false,
  },
  {
    icon: Accessibility,
    title: 'Accessibility',
    description: 'Report accessibility barriers or suggest improvements.',
    link: 'mailto:accessibility@airwaylab.app',
    linkText: 'accessibility@airwaylab.app',
    external: false,
  },
  {
    icon: Github,
    title: 'Source Code',
    description: 'AirwayLab is open source under GPL-3.0. Browse the code, contribute, or fork.',
    link: 'https://github.com/airwaylab-app/airwaylab',
    linkText: 'View on GitHub',
    external: true,
  },
];

export default function ContactPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contact</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          AirwayLab is built and maintained by a small team. We read every message and aim to
          respond within 2 business days. For bugs and feature requests, GitHub Issues is the
          fastest channel.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {channels.map((channel) => (
          <a
            key={channel.title}
            href={channel.link}
            target={channel.external ? '_blank' : undefined}
            rel={channel.external ? 'noopener noreferrer' : undefined}
            className="group rounded-xl border border-border/50 bg-card/30 p-5 transition-colors hover:border-border hover:bg-card/50"
          >
            <div className="mb-2 flex items-center gap-2.5">
              <channel.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{channel.title}</h2>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">
              {channel.description}
            </p>
            <span className="text-xs font-medium text-primary group-hover:underline">
              {channel.linkText}
            </span>
          </a>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
        <p className="text-xs leading-relaxed text-muted-foreground">
          <strong className="text-foreground">Security vulnerabilities:</strong> If you discover
          a security issue, please email{' '}
          <a
            href="mailto:security@airwaylab.app"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            security@airwaylab.app
          </a>{' '}
          directly. Do not open a public GitHub issue for security vulnerabilities.
        </p>
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
