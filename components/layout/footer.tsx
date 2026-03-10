import Link from 'next/link';
import { Shield, Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-warm-border bg-warm-cloud/50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-3 flex items-center gap-1">
              <span className="text-sm font-bold text-brand-navy">Airway</span>
              <span className="text-sm font-normal text-brand-teal">Lab</span>
            </div>
            <p className="text-xs leading-relaxed text-warm-gray">
              Free, open-source airway analysis. Because your breathing data belongs to you.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-warm-gray">
              Navigation
            </h4>
            <nav className="flex flex-col gap-2 text-xs text-warm-gray">
              <Link href="/analyze" className="transition-colors hover:text-warm-charcoal">
                Analyze Data
              </Link>
              <Link href="/blog" className="transition-colors hover:text-warm-charcoal">
                Blog
              </Link>
              <Link href="/about" className="transition-colors hover:text-warm-charcoal">
                About &amp; Methodology
              </Link>
              <Link href="/changelog" className="transition-colors hover:text-warm-charcoal">
                What&apos;s New
              </Link>
              <a
                href="https://github.com/airwaylab-app/airwaylab"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-warm-charcoal"
              >
                <Github className="h-3 w-3" />
                GitHub Repository
              </a>
            </nav>
          </div>

          {/* Community */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-warm-gray">
              Community
            </h4>
            <nav className="flex flex-col gap-2 text-xs text-warm-gray">
              <a
                href="https://www.apneaboard.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-warm-charcoal"
              >
                ApneaBoard Forum
              </a>
              <a
                href="https://reddit.com/r/SleepApnea"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-warm-charcoal"
              >
                r/SleepApnea
              </a>
              <a
                href="https://github.com/airwaylab-app/airwaylab/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-warm-charcoal"
              >
                Report an Issue
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col gap-3 border-t border-warm-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-warm-gray">
            <Shield className="h-3.5 w-3.5 text-data-good" />
            <span>100% client-side processing — your data never leaves your device.</span>
          </div>
          <p className="text-[11px] text-warm-gray/60">
            GPL-3.0 · Not a medical device · For educational and informational purposes only
          </p>
        </div>
      </div>
    </footer>
  );
}
