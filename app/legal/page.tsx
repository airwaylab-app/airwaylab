import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Legal Notice — AirwayLab',
  description:
    'Legal notice and company information for AirwayLab B.V., including Chamber of Commerce (KvK) and VAT identification details.',
  openGraph: {
    title: 'Legal Notice — AirwayLab',
    description: 'Company identification and legal information for AirwayLab B.V.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/legal',
  },
};

export default function LegalNoticePage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 sm:py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Legal Notice
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Company information as required under EU and Dutch law
        </p>
      </div>

      <div className="prose-sm space-y-8 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-3 [&_h2]:mt-0 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:mb-2 [&_h3]:mt-0 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_strong]:text-foreground [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-primary/80">
        <section>
          <h2>Company Details</h2>
          <ul className="ml-4 list-none space-y-1.5">
            <li><strong>Legal name:</strong> AirwayLab B.V.</li>
            <li><strong>Legal form:</strong> Besloten vennootschap (private limited company)</li>
            <li><strong>Registered address:</strong> Helperpark 274-6, 9723 ZA Groningen, Netherlands</li>
            <li><strong>Chamber of Commerce (KvK):</strong> 42034310</li>
            <li><strong>VAT identification number (btw-id):</strong> NL869404726B01</li>
            <li><strong>Email:</strong> <a href="mailto:dev@airwaylab.app">dev@airwaylab.app</a></li>
          </ul>
        </section>

        <section>
          <h2>Website</h2>
          <p>
            This website (<a href="https://airwaylab.app">airwaylab.app</a>) is operated by
            AirwayLab B.V. For details on how we handle personal data, see our{' '}
            <Link href="/privacy">Privacy Policy</Link>. The terms governing use of the service are
            set out in our <Link href="/terms">Terms of Service</Link>.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For questions, support, or legal correspondence, email{' '}
            <a href="mailto:dev@airwaylab.app">dev@airwaylab.app</a> or use our{' '}
            <Link href="/contact">contact page</Link>. We aim to respond within 2 business days.
          </p>
        </section>

        <section>
          <h2>Disclaimer</h2>
          <p>
            AirwayLab is <strong>not a medical device</strong> and is not FDA- or CE-cleared. It does
            not provide medical advice, diagnosis, or treatment, and is intended for educational and
            informational purposes only. Always consult a qualified healthcare provider for medical
            decisions. Use of the service is at your own risk.
          </p>
        </section>
      </div>
    </div>
  );
}
