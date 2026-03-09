import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AirwayLab — Flow Limitation Analysis',
    short_name: 'AirwayLab',
    description:
      'Free, open-source browser-based PAP data analysis for ResMed devices. Your data never leaves your device.',
    start_url: '/',
    display: 'standalone',
    background_color: '#09090b',
    theme_color: '#09090b',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}
