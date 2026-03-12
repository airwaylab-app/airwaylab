import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support AirwayLab — Pricing | AirwayLab',
  description:
    'AirwayLab\u2019s core analysis is free and always will be. Support continued development with a Supporter or Champion plan.',
  openGraph: {
    title: 'Support AirwayLab — Pricing',
    description:
      'Free, open-source PAP analysis. Support continued development and unlock AI-powered therapy insights.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/pricing',
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
