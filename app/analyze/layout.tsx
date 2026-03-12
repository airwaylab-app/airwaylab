import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analyze — AirwayLab',
  description:
    'Upload your PAP SD card data for flow limitation analysis, Glasgow Index scoring, and oximetry insights.',
  openGraph: {
    title: 'Analyze — AirwayLab',
    description:
      'Upload PAP SD card data for research-grade flow limitation analysis. 100% client-side processing.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/analyze',
  },
};

export default function AnalyzeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
