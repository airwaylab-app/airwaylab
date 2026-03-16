import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account — AirwayLab',
  robots: { index: false, follow: false },
};

export default function AccountLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
