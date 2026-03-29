import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community | AirwayLab',
  description:
    'Join the AirwayLab community. Connect with PAP users, share analysis insights, and help shape what we build next.',
  openGraph: {
    title: 'Community | AirwayLab',
    description:
      'Join the AirwayLab community. Connect with PAP users, share analysis insights, and help shape what we build next.',
  },
  alternates: {
    canonical: 'https://airwaylab.app/community',
  },
};

export default function CommunityLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
