import type { Metadata } from 'next';

export const metadata: Metadata = {
  openGraph: {
    siteName: 'AirwayLab',
    type: 'website',
    images: [{ url: '/opengraph-image' }],
  },
  twitter: {
    card: 'summary_large_image',
    images: ['/opengraph-image'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CompareLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
