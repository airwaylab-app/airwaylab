import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield, ExternalLink } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy — AirwayLab',
  description:
    'How AirwayLab handles your data. Privacy-first architecture: all core analysis runs in your browser. No cookies, no fingerprinting.',
  openGraph: {
    title: 'Privacy Policy — AirwayLab',
    description: 'How AirwayLab handles your data. Privacy-first, browser-based sleep analysis.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/privacy',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: 12 March 2026
        </p>
        <div className="mt-4 flex items-center gap-1.5 text-xs text-emerald-500">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          <span>
            AirwayLab is privacy-first by design. All core analysis runs in your browser.
          </span>
        </div>
      </div>

      <div className="prose-sm space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80">
        {/* 1. Who We Are */}
        <section>
          <h2>1. Who We Are</h2>
          <p>
            AirwayLab (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is an open-source
            sleep and airway analysis tool operated under the domain airwaylab.app. AirwayLab is
            not a medical device and is not cleared or approved by the FDA, CE, TGA, or any
            regulatory body. It is provided for educational and informational purposes only.
          </p>
          <p>
            For privacy questions,{' '}
            <a href="/contact?category=privacy">contact us via our contact form</a>.
          </p>
        </section>

        {/* 2. Two-Tier Architecture */}
        <section>
          <h2>2. How AirwayLab Processes Data</h2>
          <p>
            AirwayLab uses a <strong>two-tier architecture</strong> designed to keep your health
            data under your control:
          </p>

          <div className="my-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
            <h3>Tier 1 — Browser-Only (Default)</h3>
            <p>
              All core analysis runs entirely in your browser using Web Workers. Your EDF files
              are parsed, flow data extracted, and all four analysis engines execute without any
              network request. <strong>No data leaves your device.</strong> This is the default
              for all users, including those without an account.
            </p>
          </div>

          <div className="my-4 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
            <h3>Tier 2 — Server-Enhanced (Registration Consent)</h3>
            <p>
              When you create an account, you consent to: storage of your EDF files on our
              servers (Supabase, EU-West), processing of analysis scores and per-breath data
              by AI (Anthropic Claude), and storage of analysis data for service improvement.
              This is a single consent covering all data processing. You can delete all
              server-stored data at any time from Account Settings.
            </p>
          </div>
        </section>

        {/* 3. What We Collect */}
        <section>
          <h2>3. What Personal Data We Collect</h2>

          <h3>3.1 Account Data (if you create an account)</h3>
          <ul className="ml-4 list-disc space-y-1">
            <li>Email address (for authentication and account communications)</li>
            <li>Display name (optional, for supporter acknowledgement)</li>
            <li>Subscription tier and billing status (via Stripe)</li>
          </ul>

          <h3 className="mt-4">3.2 Payment Data</h3>
          <p>
            Payment processing is handled entirely by{' '}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">
              Stripe <ExternalLink className="inline h-3 w-3" />
            </a>
            . We never see or store your credit card number, CVV, or full billing details. We
            receive only your Stripe customer ID and subscription status.
          </p>

          <h3 className="mt-4">3.3 Health Data (registered users)</h3>
          <p>
            When you create an account, you consent to the following data processing:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Cloud Storage:</strong> EDF files and analysis data are stored on servers
              in the EU (Supabase, EU-West). Storage is unlimited. All data is linked to your
              account and can be deleted at any time from Account Settings.
            </li>
            <li>
              <strong>AI Insights:</strong> When you generate AI insights, analysis data is
              sent to Anthropic&rsquo;s Claude for processing. Free accounts send aggregate
              scores. Paid accounts send per-breath summary data for deeper analysis. Raw
              waveform samples are <strong>never</strong> sent to the AI model.
            </li>
            <li>
              <strong>Analysis Data:</strong> Aggregate scores and per-breath summaries are
              stored to enable AI insights and service improvement.
            </li>
            <li>
              <strong>Data Contribution:</strong> Anonymised aggregate metrics, device model,
              and your self-reported sleep quality rating (1–5 scale). Used for community insights
              and research. No dates, timestamps, names, or identifiers are included.
            </li>
          </ul>

          <h3 className="mt-4">3.4 Automatically Collected Data</h3>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Page views:</strong> Collected by Plausible Analytics — a privacy-first,
              cookie-free analytics service. No personal data, no IP tracking, no fingerprinting.
            </li>
            <li>
              <strong>Error reports:</strong> Collected by Sentry when errors occur. May include
              browser type, page URL, and error stack traces. Does not include health data.
            </li>
            <li>
              <strong>Performance monitoring:</strong> Collected by Vercel Speed Insights for
              page load performance (Core Web Vitals). No personal data or health data is included.
            </li>
          </ul>

          <h3 className="mt-4">3.5 What We Do NOT Collect</h3>
          <ul className="ml-4 list-disc space-y-1">
            <li>Cookies (we use none)</li>
            <li>Browser fingerprints</li>
            <li>IP addresses for tracking (Plausible does not store IPs)</li>
            <li>Raw sleep waveforms (never transmitted to any server)</li>
            <li>Device serial numbers or user names from PAP machines</li>
          </ul>
        </section>

        {/* 4. Legal Basis */}
        <section>
          <h2>4. Legal Basis for Processing (GDPR)</h2>
          <p>If you are in the European Economic Area, we process your data under:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Contract (Art. 6(1)(b)):</strong> Account creation, subscription
              management, and service delivery.
            </li>
            <li>
              <strong>Consent (Art. 6(1)(a)):</strong> AI insights, data contribution, cloud
              storage, and email communications. You can withdraw consent at any time.
            </li>
            <li>
              <strong>Legitimate interest (Art. 6(1)(f)):</strong> Error monitoring (Sentry),
              anonymous usage analytics (Plausible), and security protections.
            </li>
          </ul>
        </section>

        {/* 5. Data Retention */}
        <section>
          <h2>5. Data Retention</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Browser localStorage:</strong> Analysis results auto-expire after 30 days.
              You can clear them at any time.
            </li>
            <li>
              <strong>Shared analysis links:</strong> Expire after 30 days and are then
              permanently deleted.
            </li>
            <li>
              <strong>Account data:</strong> Retained until you request deletion.
            </li>
            <li>
              <strong>Contributed data:</strong> Retained indefinitely for research purposes.
              Since it is fully anonymised, it cannot be traced back to you.
            </li>
            <li>
              <strong>Cloud-stored files:</strong> Retained until you delete them or request
              account deletion.
            </li>
            <li>
              <strong>Analytics (Plausible):</strong> Aggregate data only, no personal data
              retained.
            </li>
            <li>
              <strong>Error logs (Sentry):</strong> Retained for 90 days.
            </li>
          </ul>
        </section>

        {/* 6. Third-Party Processors */}
        <section>
          <h2>6. Service Providers &amp; Data Processors</h2>
          <p>
            We use the following third-party services. Each processes only the minimum data
            required for its function:
          </p>
          <div className="my-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-left text-muted-foreground/70">
                  <th className="pb-2 pr-4 font-medium">Service</th>
                  <th className="pb-2 pr-4 font-medium">Purpose</th>
                  <th className="pb-2 pr-4 font-medium">Data Region</th>
                  <th className="pb-2 font-medium">Data Processed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Supabase</td>
                  <td className="py-2 pr-4">Database &amp; authentication</td>
                  <td className="py-2 pr-4">EU (West)</td>
                  <td className="py-2">Account data, subscriptions, EDF files, analysis data, contributed metrics</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Anthropic (Claude)</td>
                  <td className="py-2 pr-4">AI-powered insights</td>
                  <td className="py-2 pr-4">US</td>
                  <td className="py-2">Aggregate metrics (free tier), per-breath summaries (paid tier)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Stripe</td>
                  <td className="py-2 pr-4">Payment processing</td>
                  <td className="py-2 pr-4">US/EU</td>
                  <td className="py-2">Payment and subscription data</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Vercel</td>
                  <td className="py-2 pr-4">Hosting &amp; CDN</td>
                  <td className="py-2 pr-4">Global edge</td>
                  <td className="py-2">HTTP requests (no health data)</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Plausible</td>
                  <td className="py-2 pr-4">Privacy-first analytics</td>
                  <td className="py-2 pr-4">EU</td>
                  <td className="py-2">Page views only, no personal data</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Sentry</td>
                  <td className="py-2 pr-4">Error monitoring</td>
                  <td className="py-2 pr-4">US</td>
                  <td className="py-2">Error traces, browser type, page URL</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Vercel</td>
                  <td className="py-2 pr-4">Speed Insights (RUM)</td>
                  <td className="py-2 pr-4">Global edge</td>
                  <td className="py-2">Core Web Vitals (LCP, CLS, INP), no personal data</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-medium text-foreground">Resend</td>
                  <td className="py-2 pr-4">Transactional email</td>
                  <td className="py-2 pr-4">US</td>
                  <td className="py-2">Email address, message content</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Client-Side Storage */}
        <section>
          <h2>7. Client-Side Storage (localStorage)</h2>
          <p>
            AirwayLab uses your browser&rsquo;s localStorage (not cookies) to persist analysis
            results and preferences locally on your device. All keys are prefixed with{' '}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">airwaylab_</code>.
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Analysis results (auto-expire after 30 days, 4MB cap)</li>
            <li>Disclaimer dismissal state</li>
            <li>Consent preferences (contribution, storage, AI insights)</li>
            <li>Feature gate state</li>
          </ul>
          <p>
            This data never leaves your browser. You can clear it at any time via your browser
            settings or by clearing the AirwayLab analysis data from the dashboard.
          </p>
        </section>

        {/* 8. Your Rights */}
        <section>
          <h2>8. Your Rights</h2>
          <p>
            Under GDPR, CCPA/CPRA, and similar data protection laws, you have the right to:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <strong>Access:</strong> Request a copy of the personal data we hold about you.
            </li>
            <li>
              <strong>Portability:</strong> Export your analysis data as CSV, JSON, or PDF at any
              time from the dashboard — no request needed.
            </li>
            <li>
              <strong>Rectification:</strong> Update your account details via your profile settings.
            </li>
            <li>
              <strong>Erasure:</strong> Delete all server-stored data instantly from Account
              Settings. This removes EDF files, analysis data, and contributed metrics. Account
              deletion requests are processed within 30 days.
            </li>
            <li>
              <strong>Withdraw consent:</strong> Delete all your data at any time from Account
              Settings. You can also contact us to request full account deletion.
            </li>
            <li>
              <strong>Opt out of analytics:</strong> Plausible respects your browser&rsquo;s
              Do Not Track setting. You can also use a browser extension to block analytics.
            </li>
          </ul>
          <p className="mt-2">
            To exercise these rights,{' '}
            <a href="/contact?category=privacy">contact us via our contact form</a>. We will
            respond within 30 days.
          </p>
        </section>

        {/* 9. Children */}
        <section>
          <h2>9. Children&rsquo;s Privacy</h2>
          <p>
            AirwayLab is intended for adults aged 18 and over who have been diagnosed with
            sleep-disordered breathing. We do not knowingly collect personal data from children
            under 16 (or 13 in jurisdictions where COPPA applies). If you believe a child has
            provided us with personal data, please{' '}
            <a href="/contact?category=privacy">contact us via our contact form</a> and we will
            promptly delete it.
          </p>
        </section>

        {/* 10. Data Breach */}
        <section>
          <h2>10. Data Breach Notification</h2>
          <p>
            In the event of a data breach affecting your personal data, we will:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Notify the relevant supervisory authority within 72 hours (as required by GDPR)</li>
            <li>Notify affected users without undue delay via email</li>
            <li>
              Publish a notice on this page with details of the breach, data affected, and
              remediation steps
            </li>
          </ul>
          <p>
            To report a security vulnerability,{' '}
            <a href="/contact?category=security">use our contact form</a>.
          </p>
        </section>

        {/* 11. International Transfers */}
        <section>
          <h2>11. International Data Transfers</h2>
          <p>
            Our primary database is hosted in the EU (Supabase EU-West region). Some services
            (Anthropic, Sentry, Resend) process data in the US. For EU users, these transfers are
            governed by Standard Contractual Clauses (SCCs) or the EU-US Data Privacy Framework
            where applicable.
          </p>
          <p>
            AI insights are opt-in. If you choose not to use AI features, no health-related data
            is transferred outside the EU.
          </p>
        </section>

        {/* 12. CCPA */}
        <section>
          <h2>12. California Privacy Rights (CCPA/CPRA)</h2>
          <p>
            If you are a California resident, you have additional rights under the CCPA/CPRA:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Right to know what personal information we collect and how we use it</li>
            <li>Right to delete your personal information</li>
            <li>Right to opt out of the sale of personal information — <strong>we do not sell your data</strong></li>
            <li>Right to non-discrimination for exercising your privacy rights</li>
          </ul>
          <p className="mt-2">
            Categories of personal information collected in the preceding 12 months: identifiers
            (email), commercial information (subscription status), and internet activity
            (anonymous page views). We do not sell or share personal information for
            cross-context behavioural advertising.
          </p>
        </section>

        {/* 13. Changes */}
        <section>
          <h2>13. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy to reflect changes in our practices or legal
            requirements. Material changes will be communicated via a notice on the site and, for
            account holders, via email. The &ldquo;Last updated&rdquo; date at the top of this
            page indicates when the policy was last revised.
          </p>
        </section>

        {/* 14. Contact */}
        <section>
          <h2>14. Contact</h2>
          <p>
            For privacy questions, data requests, or concerns:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              <a href="/contact?category=privacy">Contact form</a> (select
              &ldquo;Privacy &amp; data request&rdquo;)
            </li>
            <li>
              GitHub:{' '}
              <a
                href="https://github.com/airwaylab-app/airwaylab/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                airwaylab-app/airwaylab <ExternalLink className="inline h-3 w-3" />
              </a>
            </li>
          </ul>
        </section>

        {/* Back link */}
        <div className="pt-4 text-xs">
          <Link href="/" className="text-primary hover:underline">
            &larr; Back to AirwayLab
          </Link>
        </div>
      </div>
    </div>
  );
}
