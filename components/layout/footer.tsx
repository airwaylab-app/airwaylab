import Link from 'next/link';
import { Shield, Github, Moon } from 'lucide-react';

export function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                <Moon className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-sm font-bold tracking-tight">AirwayLab</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Free, open-source airway analysis. Because your breathing data belongs to you.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Navigation
            </h4>
            <nav className="flex flex-col gap-2 text-xs text-muted-foreground">
              <Link href="/analyze" className="transition-colors hover:text-foreground">
                Analyze Data
              </Link>
              <Link href="/blog" className="transition-colors hover:text-foreground">
                Blog
              </Link>
              <Link href="/about" className="transition-colors hover:text-foreground">
                About &amp; Methodology
              </Link>
              <Link href="/changelog" className="transition-colors hover:text-foreground">
                What&apos;s New
              </Link>
              <a
                href="https://github.com/airwaylab-app/airwaylab"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground"
              >
                <Github className="h-3 w-3" />
                GitHub Repository
              </a>
            </nav>
          </div>

          {/* Community */}
          <div>
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Community
            </h4>
            <nav className="flex flex-col gap-2 text-xs text-muted-foreground">
              <a
                href="https://www.apneaboard.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                ApneaBoard Forum
              </a>
              <a
                href="https://reddit.com/r/SleepApnea"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                r/SleepApnea
              </a>
              <a
                href="https://github.com/airwaylab-app/airwaylab/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-foreground"
              >
                Report an Issue
              </a>
            </nav>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 flex flex-col gap-3 border-t border-border/50 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-emerald-500" />
            <span>100% client-side processing — your data never leaves your device.</span>
          </div>
          <p className="text-[11px] text-muted-foreground/60">
            GPL-3.0 · Not a medical device · For educational and informational purposes only
          </p>
        </div>
      </div>
    </footer>
  );
}
