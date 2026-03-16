import type { Metadata } from 'next';
import Script from 'next/script';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FeedbackWidget } from '@/components/common/feedback-widget';
import { VersionChecker } from '@/components/common/version-checker';
import { AuthProvider } from '@/lib/auth/auth-context';

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://airwaylab.app'),
  title: 'AirwayLab — Free Flow Limitation Analysis for ResMed PAP Data',
  description:
    'See if your sleep therapy is actually working — beyond AHI. Free, open-source PAP analysis in your browser.',
  keywords: [
    'PAP', 'CPAP', 'BiPAP', 'APAP', 'ResMed', 'sleep apnea', 'flow limitation',
    'Glasgow Index', 'OSCAR alternative', 'sleep analysis',
  ],
  authors: [{ name: 'AirwayLab' }],
  openGraph: {
    title: 'AirwayLab — Free Flow Limitation Analysis for ResMed PAP Data',
    description:
      'See if your sleep therapy is actually working — beyond AHI. Free, open-source PAP analysis in your browser.',
    type: 'website',
    url: 'https://airwaylab.app',
    siteName: 'AirwayLab',
    images: [{ url: '/opengraph-image' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AirwayLab — Free Flow Limitation Analysis for ResMed PAP Data',
    description:
      'See if your sleep therapy is actually working — beyond AHI. Free, open-source PAP analysis in your browser.',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'AirwayLab',
  description:
    'See if your sleep therapy is actually working — beyond AHI. Free, open-source PAP analysis in your browser.',
  url: 'https://airwaylab.app',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Any (Web Browser)',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  license: 'https://opensource.org/licenses/GPL-3.0',
  isAccessibleForFree: true,
};

const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'AirwayLab',
  url: 'https://airwaylab.app',
  logo: 'https://airwaylab.app/opengraph-image',
  sameAs: ['https://github.com/airwaylab-app/airwaylab'],
  description:
    'Free, open-source PAP flow limitation analysis that runs entirely in your browser.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          plusJakarta.variable,
          jetbrainsMono.variable
        )}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        {plausibleDomain && (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
          />
        )}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <AuthProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main id="main-content" className="flex-1 overflow-x-hidden">{children}</main>
            <Footer />
            <FeedbackWidget />
            <VersionChecker />
          </div>
        </AuthProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
