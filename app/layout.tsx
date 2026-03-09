import type { Metadata } from 'next';
import Script from 'next/script';
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { FeedbackWidget } from '@/components/common/feedback-widget';
import { VersionChecker } from '@/components/common/version-checker';
import { AuthProvider } from '@/lib/auth/auth-context';

const plausibleDomain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;

const plexSans = IBM_Plex_Sans({
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
  title: 'AirwayLab — Free Flow Limitation Analysis for ResMed CPAP/BiPAP Data',
  description:
    'Free, open-source CPAP analysis that goes beyond AHI. Detect flow limitation, RERAs, and breathing patterns your machine misses. 100% in-browser — your data never leaves your device.',
  keywords: [
    'CPAP', 'BiPAP', 'ResMed', 'sleep apnea', 'flow limitation',
    'Glasgow Index', 'OSCAR alternative', 'sleep analysis',
  ],
  authors: [{ name: 'AirwayLab' }],
  openGraph: {
    title: 'AirwayLab — Free Flow Limitation Analysis for ResMed CPAP/BiPAP Data',
    description:
      'Free, open-source CPAP analysis that goes beyond AHI. Detect flow limitation, RERAs, and breathing patterns your machine misses. 100% in-browser — your data never leaves your device.',
    type: 'website',
    url: 'https://airwaylab.app',
    siteName: 'AirwayLab',
    images: [{ url: '/og-image.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AirwayLab — Free Flow Limitation Analysis for ResMed CPAP/BiPAP Data',
    description:
      'Free, open-source CPAP analysis that goes beyond AHI. Detect flow limitation, RERAs, and breathing patterns your machine misses. 100% in-browser — your data never leaves your device.',
    images: ['/og-image.png'],
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
    'Free, open-source browser-based CPAP data analysis for ResMed devices',
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          plexSans.variable,
          jetbrainsMono.variable
        )}
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
      </body>
    </html>
  );
}
