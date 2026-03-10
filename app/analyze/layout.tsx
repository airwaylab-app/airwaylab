import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analyze — AirwayLab',
  description:
    'Upload your ResMed SD card data for detailed flow limitation analysis. Glasgow Index, WAT, NED, and Oximetry — all processed in your browser.',
  openGraph: {
    title: 'Analyze — AirwayLab',
    description:
      'Upload ResMed PAP SD card data for research-grade flow limitation analysis. 100% client-side processing.',
  },
};

export default function AnalyzeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="dashboard-theme bg-background text-foreground">{children}</div>;
}
