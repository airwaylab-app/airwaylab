import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing — AirwayLab',
  description:
    "Support AirwayLab's development. Free core analysis, paid tiers fund independence.",
  openGraph: {
    title: 'Pricing — AirwayLab',
    description:
      "Support AirwayLab's development. Free core analysis, paid tiers fund independence.",
  },
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
