import type { Metadata } from 'next';
import Script from 'next/script';
import { IBM_Plex_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

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
  title: 'AirwayLab — Flow Limitation Analysis for ResMed CPAP Data',
  description:
    'Free, open-source, browser-based sleep analysis dashboard for ResMed CPAP/BiPAP data. Glasgow Index, WAT, NED, and Oximetry engines — 100% client-side. Your data never leaves your device.',
  keywords: [
    'CPAP', 'BiPAP', 'ResMed', 'sleep apnea', 'flow limitation',
    'Glasgow Index', 'OSCAR alternative', 'sleep analysis',
  ],
  authors: [{ name: 'AirwayLab' }],
  openGraph: {
    title: 'AirwayLab — Flow Limitation Analysis for ResMed CPAP Data',
    description:
      'Free, open-source, privacy-first sleep analysis. Upload your ResMed SD card and get detailed breath-by-breath analytics with 4 research-grade engines.',
    type: 'website',
    siteName: 'AirwayLab',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AirwayLab — Flow Limitation Analysis for ResMed CPAP Data',
    description:
      'Free, open-source sleep analysis dashboard for ResMed CPAP/BiPAP data. 100% client-side.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'AirwayLab',
  description:
    'Free, open-source, browser-based sleep analysis dashboard for ResMed CPAP/BiPAP data. Glasgow Index, WAT, NED, and Oximetry engines — 100% client-side.',
  url: 'https://airwaylab.app',
  applicationCategory: 'HealthApplication',
  operatingSystem: 'Any',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Glasgow Index flow limitation scoring',
    'WAT ventilation pattern analysis',
    'NED breath-by-breath analysis with RERA detection',
    'Pulse oximetry analysis (16-metric framework)',
    '100% client-side processing',
    'ResMed AirSense 10 / AirCurve 10 support (AirSense 11 experimental)',
  ],
  license: 'https://www.gnu.org/licenses/gpl-3.0.html',
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
        <div className="flex min-h-screen flex-col">
          <Header />
          <main id="main-content" className="flex-1 overflow-x-hidden">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
