import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms of Service — AirwayLab',
  description:
    'Terms of Service for AirwayLab. Read our terms for using the sleep analysis platform.',
  openGraph: {
    title: 'Terms of Service — AirwayLab',
    description: 'Terms of Service for AirwayLab sleep analysis platform.',
  },
};

export default function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Last updated: 12 March 2026
        </p>
      </div>

      <div className="prose-sm space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80">
        {/* 1. Acceptance */}
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using AirwayLab (&ldquo;the Service&rdquo;), you agree to be bound by
            these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the
            Service. We may update these Terms from time to time — continued use after changes
            constitutes acceptance.
          </p>
        </section>

        {/* 2. Eligibility */}
        <section>
          <h2>2. Eligibility</h2>
          <p>
            You must be at least <strong>18 years old</strong> to use AirwayLab. By creating an
            account, you represent that you are 18 or older and have the legal capacity to enter
            into these Terms. AirwayLab is intended for individuals who have been diagnosed with
            sleep-disordered breathing and use PAP therapy.
          </p>
        </section>

        {/* 3. Medical Disclaimer */}
        <section>
          <h2>3. Medical Disclaimer</h2>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <p className="font-medium text-foreground">
              AirwayLab is not a medical device. It has not been cleared, approved, or certified
              by the FDA, CE, TGA, or any other regulatory body.
            </p>
            <p className="mt-2">
              The Service is provided <strong>for educational and informational purposes
              only</strong>. Analysis results, insights (including AI-generated insights), scores,
              and recommendations are not medical advice, diagnosis, or treatment
              recommendations.
            </p>
            <p className="mt-2">
              <strong>Always consult qualified healthcare providers</strong> before making any
              changes to your PAP therapy settings, treatment plan, or health-related decisions
              based on information from AirwayLab. Never disregard professional medical advice or
              delay seeking treatment because of something you have read or seen on AirwayLab.
            </p>
            <p className="mt-2">
              You acknowledge that you use AirwayLab at your own risk and that we are not
              responsible for any health outcomes resulting from your use of the Service.
            </p>
          </div>
        </section>

        {/* 4. Description of Service */}
        <section>
          <h2>4. Description of Service</h2>
          <p>
            AirwayLab is a browser-based tool that analyses PAP (CPAP/BiPAP/ASV) therapy data
            from ResMed SD cards. The Service includes:
          </p>
          <ul className="ml-4 list-disc space-y-1">
            <li>Client-side analysis of EDF flow data (runs entirely in your browser)</li>
            <li>Optional AI-powered insights via Claude (requires account and consent)</li>
            <li>Optional cloud file storage (requires account and consent)</li>
            <li>Optional anonymised data contribution (requires consent)</li>
            <li>Data export in CSV, JSON, PDF, and forum formats</li>
          </ul>
        </section>

        {/* 5. Accounts */}
        <section>
          <h2>5. Accounts</h2>
          <p>
            An account is optional for core analysis. If you create an account, you are
            responsible for maintaining the confidentiality of your credentials and for all
            activity under your account. You must provide accurate information and promptly update
            it if it changes.
          </p>
          <p>
            We may suspend or terminate accounts that violate these Terms, are used for
            fraudulent purposes, or remain inactive for more than 12 months.
          </p>
        </section>

        {/* 6. Subscriptions & Payment */}
        <section>
          <h2>6. Subscriptions &amp; Payment</h2>
          <h3>6.1 Tiers</h3>
          <p>
            AirwayLab offers a free Community tier and paid tiers (Supporter and Champion).
            The free tier includes complete analysis functionality and will always remain free.
            Paid tiers add convenience features like unlimited AI insights, cloud sync, and
            enhanced exports.
          </p>

          <h3 className="mt-4">6.2 Billing</h3>
          <p>
            Paid subscriptions are billed in advance on a monthly or annual basis via Stripe.
            Subscriptions automatically renew at the end of each billing period unless cancelled.
            By subscribing, you authorise recurring charges until you cancel.
          </p>

          <h3 className="mt-4">6.3 Cancellation</h3>
          <p>
            You can cancel your subscription at any time from your account settings or via the
            Stripe customer portal. Upon cancellation, you retain access to paid features until
            the end of your current billing period. After that, your account reverts to the free
            Community tier.
          </p>

          <h3 className="mt-4">6.4 Refunds</h3>
          <p>
            We offer a <strong>full refund within 14 days</strong> of your first subscription
            payment if you are not satisfied, no questions asked. After 14 days, or for
            subsequent billing periods, refunds are not available — you can cancel to prevent
            future charges. To request a refund, email{' '}
            <a href="mailto:billing@airwaylab.app">billing@airwaylab.app</a>.
          </p>

          <h3 className="mt-4">6.5 Price Changes</h3>
          <p>
            We may change subscription prices with 30 days&rsquo; notice via email. Existing
            subscribers are grandfathered at their current price until the end of their current
            billing period.
          </p>
        </section>

        {/* 7. Acceptable Use */}
        <section>
          <h2>7. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="ml-4 list-disc space-y-1">
            <li>
              Attempt to re-identify anonymised data contributed by other users
            </li>
            <li>
              Use the Service to provide medical advice, diagnosis, or treatment to others
            </li>
            <li>
              Scrape, reverse-engineer, or attempt to extract data from the Service beyond what
              is provided through the export features
            </li>
            <li>
              Use the Service in any way that violates applicable law or regulation
            </li>
            <li>
              Interfere with the security, integrity, or availability of the Service
            </li>
            <li>
              Create multiple accounts to circumvent usage limits
            </li>
          </ul>
        </section>

        {/* 8. Intellectual Property */}
        <section>
          <h2>8. Intellectual Property &amp; Open Source</h2>
          <p>
            AirwayLab is open-source software licensed under the{' '}
            <a
              href="https://www.gnu.org/licenses/gpl-3.0.html"
              target="_blank"
              rel="noopener noreferrer"
            >
              GNU General Public License v3.0 (GPL-3.0)
            </a>
            . The Glasgow Index engine is based on GPL-3.0 code by DaveSkvn.
          </p>
          <p>
            You are free to use, study, modify, and distribute the source code under the terms of
            the GPL-3.0 licence. The AirwayLab name, logo, and brand identity remain our
            property.
          </p>
          <p>
            Your sleep data remains yours. We claim no ownership over data you upload, analyse,
            or export. For data you voluntarily contribute to the anonymised research dataset,
            you grant us a non-exclusive, irrevocable licence to use that anonymised data for
            research purposes.
          </p>
        </section>

        {/* 9. Privacy */}
        <section>
          <h2>9. Privacy</h2>
          <p>
            Your use of the Service is also governed by our{' '}
            <Link href="/privacy">Privacy Policy</Link>, which describes how we collect, use, and
            protect your data. By using the Service, you acknowledge that you have read and
            understood the Privacy Policy.
          </p>
        </section>

        {/* 10. HIPAA */}
        <section>
          <h2>10. HIPAA Disclaimer</h2>
          <p>
            AirwayLab is a consumer health tool, not a HIPAA-covered entity or business
            associate. We do not offer HIPAA-compliant services or sign Business Associate
            Agreements (BAAs). Healthcare providers should not use AirwayLab to process, store,
            or transmit Protected Health Information (PHI).
          </p>
        </section>

        {/* 11. Disclaimer of Warranties */}
        <section>
          <h2>11. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT
            WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
            WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT,
            OR ACCURACY.
          </p>
          <p>
            We do not warrant that the Service will be uninterrupted, error-free, or free of
            harmful components. Analysis results may contain errors — always verify important
            findings with your healthcare provider.
          </p>
        </section>

        {/* 12. Limitation of Liability */}
        <section>
          <h2>12. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, AIRWAYLAB AND ITS OPERATORS SHALL NOT BE
            LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES,
            INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR HEALTH OUTCOMES, ARISING
            OUT OF OR RELATED TO YOUR USE OF THE SERVICE.
          </p>
          <p>
            OUR TOTAL LIABILITY FOR ANY CLAIMS ARISING FROM YOUR USE OF THE SERVICE SHALL NOT
            EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM, OR $100,
            WHICHEVER IS GREATER.
          </p>
          <p>
            You acknowledge that the Service analyses health data using automated algorithms and
            AI, which may produce inaccurate results. You assume full responsibility for
            decisions made based on the Service&rsquo;s output.
          </p>
        </section>

        {/* 13. Indemnification */}
        <section>
          <h2>13. Indemnification</h2>
          <p>
            You agree to indemnify, defend, and hold harmless AirwayLab and its operators from
            any claims, damages, losses, or expenses (including reasonable legal fees) arising
            from your use of the Service, violation of these Terms, or infringement of any third
            party&rsquo;s rights.
          </p>
        </section>

        {/* 14. Termination */}
        <section>
          <h2>14. Termination</h2>
          <p>
            You may stop using the Service at any time. You can request account deletion via your
            account settings or by emailing{' '}
            <a href="mailto:privacy@airwaylab.app">privacy@airwaylab.app</a>. We process
            deletion requests within 30 days.
          </p>
          <p>
            We may terminate or suspend your access for violation of these Terms, with or without
            notice. Upon termination, your right to use the Service ceases immediately. Sections
            3, 8, 11, 12, 13, and 15 survive termination.
          </p>
        </section>

        {/* 15. Governing Law */}
        <section>
          <h2>15. Governing Law &amp; Disputes</h2>
          <p>
            These Terms are governed by the laws of the Netherlands, without regard to conflict
            of law principles. Any disputes arising from these Terms or your use of the Service
            shall be resolved in the competent courts of the Netherlands.
          </p>
          <p>
            If you are in the EU, you retain any mandatory consumer protection rights under the
            laws of your country of residence.
          </p>
        </section>

        {/* 16. Severability */}
        <section>
          <h2>16. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable, the remaining
            provisions will continue in full force and effect.
          </p>
        </section>

        {/* 17. Contact */}
        <section>
          <h2>17. Contact</h2>
          <p>
            Questions about these Terms? Email{' '}
            <a href="mailto:legal@airwaylab.app">legal@airwaylab.app</a>.
          </p>
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
