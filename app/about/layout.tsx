import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About — AirwayLab',
  description:
    'Learn about AirwayLab\'s analysis methodology, the Glasgow Index, WAT, NED, and Oximetry engines. FAQ, privacy details, and how to contribute.',
  openGraph: {
    title: 'About — AirwayLab',
    description:
      'Methodology, FAQ, and privacy details for AirwayLab\'s four research-grade sleep analysis engines.',
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
