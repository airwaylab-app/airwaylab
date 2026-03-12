import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Accessibility — AirwayLab',
  description:
    'AirwayLab accessibility statement. Our commitment to making sleep analysis accessible to everyone.',
  openGraph: {
    title: 'Accessibility — AirwayLab',
    description: 'AirwayLab accessibility statement and WCAG 2.1 conformance information.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/accessibility',
  },
};

export default function AccessibilityPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Accessibility Statement
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: 12 March 2026
        </p>
      </div>

      <div className="prose-sm space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80">
        <section>
          <h2>Our Commitment</h2>
          <p>
            AirwayLab is committed to ensuring that our sleep analysis tool is accessible to all
            users, including those with disabilities. We strive to conform to the{' '}
            <strong>Web Content Accessibility Guidelines (WCAG) 2.1 Level AA</strong> standard.
          </p>
        </section>

        <section>
          <h2>What We&rsquo;ve Implemented</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>Semantic HTML with proper heading hierarchy across all pages</li>
            <li>Skip-to-content link for keyboard navigation</li>
            <li>ARIA labels and roles on interactive elements, charts, and modals</li>
            <li>Keyboard-navigable controls (tabs, checkboxes, dropdowns, modals)</li>
            <li>Visible focus indicators on interactive elements</li>
            <li>Screen reader announcements for dynamic content changes</li>
            <li>Sufficient colour contrast ratios for text and UI elements</li>
            <li>Responsive design that supports zoom up to 200%</li>
            <li>No content that flashes more than 3 times per second</li>
          </ul>
        </section>

        <section>
          <h2>Known Limitations</h2>
          <p>
            We are aware of the following accessibility limitations and are working to address
            them:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Charts and visualisations:</strong> Recharts-based charts include ARIA
              labels but may not convey full data detail to screen reader users. We provide
              tabular data exports (CSV, JSON) as an alternative.
            </li>
            <li>
              <strong>Dark-only theme:</strong> AirwayLab currently only supports a dark colour
              scheme. Users who require a light theme can use browser extensions or OS-level
              colour inversion.
            </li>
            <li>
              <strong>PDF reports:</strong> Generated PDF reports may not be fully accessible to
              screen readers. The underlying data is available in accessible CSV and JSON formats.
            </li>
          </ul>
        </section>

        <section>
          <h2>Browser &amp; Assistive Technology Support</h2>
          <p>
            AirwayLab is tested with:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Latest versions of Chrome, Firefox, Safari, and Edge</li>
            <li>macOS VoiceOver</li>
            <li>Keyboard-only navigation</li>
          </ul>
        </section>

        <section>
          <h2>Feedback &amp; Contact</h2>
          <p>
            We welcome feedback on the accessibility of AirwayLab. If you encounter any barriers
            or have suggestions for improvement, please contact us:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <a href="/contact?category=accessibility">Contact form</a> (select
              &ldquo;Accessibility&rdquo;)
            </li>
            <li>
              GitHub:{' '}
              <a
                href="https://github.com/airwaylab-app/airwaylab/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                File an accessibility issue
              </a>
            </li>
          </ul>
          <p>
            We aim to respond to accessibility feedback within 5 business days and to provide a
            remediation timeline for confirmed issues.
          </p>
        </section>

        <div className="pt-4 text-xs">
          <Link href="/" className="text-primary hover:underline">
            &larr; Back to AirwayLab
          </Link>
        </div>
      </div>
    </div>
  );
}
