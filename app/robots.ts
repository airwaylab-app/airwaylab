import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/account', '/shared/', '/api/'],
      },
    ],
    sitemap: 'https://airwaylab.app/sitemap.xml',
  };
}
