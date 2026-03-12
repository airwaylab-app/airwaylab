import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import sitemap from '../app/sitemap';

/**
 * SEO & LLM Discoverability regression tests.
 *
 * These tests ensure every public page has:
 * - A metadata export (in page.tsx or layout.tsx) with alternates.canonical
 * - An entry in app/sitemap.ts
 * - A mention in public/llms.txt
 *
 * When adding a new public page, add it to KNOWN_PUBLIC_ROUTES below.
 * If you forget, these tests will remind you.
 */

const KNOWN_PUBLIC_ROUTES = [
  { path: '/', url: 'https://airwaylab.app', dir: 'app' },
  { path: '/analyze', url: 'https://airwaylab.app/analyze', dir: 'app/analyze' },
  { path: '/about', url: 'https://airwaylab.app/about', dir: 'app/about' },
  { path: '/about/flow-limitation', url: 'https://airwaylab.app/about/flow-limitation', dir: 'app/about/flow-limitation' },
  { path: '/about/glasgow-index', url: 'https://airwaylab.app/about/glasgow-index', dir: 'app/about/glasgow-index' },
  { path: '/about/oximetry-analysis', url: 'https://airwaylab.app/about/oximetry-analysis', dir: 'app/about/oximetry-analysis' },
  { path: '/blog', url: 'https://airwaylab.app/blog', dir: 'app/blog' },
  { path: '/pricing', url: 'https://airwaylab.app/pricing', dir: 'app/pricing' },
  { path: '/providers', url: 'https://airwaylab.app/providers', dir: 'app/providers' },
  { path: '/changelog', url: 'https://airwaylab.app/changelog', dir: 'app/changelog' },
  { path: '/contact', url: 'https://airwaylab.app/contact', dir: 'app/contact' },
  { path: '/privacy', url: 'https://airwaylab.app/privacy', dir: 'app/privacy' },
  { path: '/terms', url: 'https://airwaylab.app/terms', dir: 'app/terms' },
  { path: '/accessibility', url: 'https://airwaylab.app/accessibility', dir: 'app/accessibility' },
  { path: '/supporters', url: 'https://airwaylab.app/supporters', dir: 'app/supporters' },
];

const root = join(__dirname, '..');

function readFile(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf-8');
}

function fileExists(relativePath: string): boolean {
  return existsSync(join(root, relativePath));
}

describe('SEO metadata — canonical URLs', () => {
  for (const route of KNOWN_PUBLIC_ROUTES) {
    it(`${route.path} has metadata with alternates.canonical`, () => {
      const pageFile = join(route.dir, 'page.tsx');
      const layoutFile = join(route.dir, 'layout.tsx');

      const pageExists = fileExists(pageFile);
      const layoutExists = fileExists(layoutFile);

      expect(
        pageExists || layoutExists,
        `Page at ${route.path} is missing metadata export. Add metadata to page.tsx or create a layout.tsx with metadata.`
      ).toBe(true);

      // Check for canonical in either page.tsx or layout.tsx
      let hasCanonical = false;
      if (pageExists) {
        const content = readFile(pageFile);
        if (content.includes('alternates') && content.includes('canonical')) {
          hasCanonical = true;
        }
      }
      if (layoutExists) {
        const content = readFile(layoutFile);
        if (content.includes('alternates') && content.includes('canonical')) {
          hasCanonical = true;
        }
      }

      // Root layout (/) applies canonical via metadataBase, and blog [slug] uses generateMetadata
      // For the root path, having metadataBase is sufficient — Next.js auto-generates canonical
      if (route.path === '/') {
        const rootLayout = readFile('app/layout.tsx');
        if (rootLayout.includes('metadataBase')) {
          hasCanonical = true;
        }
      }

      expect(
        hasCanonical,
        `Page at ${route.path} is missing alternates.canonical in metadata.`
      ).toBe(true);
    });
  }
});

describe('SEO metadata — sitemap completeness', () => {
  const sitemapEntries = sitemap();
  const sitemapUrls = sitemapEntries.map((entry) => entry.url);

  for (const route of KNOWN_PUBLIC_ROUTES) {
    it(`sitemap includes ${route.url}`, () => {
      expect(
        sitemapUrls,
        `Route ${route.url} is not included in app/sitemap.ts output.`
      ).toContain(route.url);
    });
  }
});

describe('SEO metadata — llms.txt completeness', () => {
  const llmsTxt = readFile('public/llms.txt');

  for (const route of KNOWN_PUBLIC_ROUTES) {
    it(`llms.txt mentions ${route.path}`, () => {
      // Check for the full URL or the path
      const hasUrl = llmsTxt.includes(`airwaylab.app${route.path}`) ||
        (route.path === '/' && llmsTxt.includes('airwaylab.app/'));

      expect(
        hasUrl,
        `Route path ${route.path} is not mentioned in public/llms.txt.`
      ).toBe(true);
    });
  }
});

describe('SEO metadata — structured data', () => {
  it('root layout includes SoftwareApplication JSON-LD', () => {
    const layout = readFile('app/layout.tsx');
    expect(layout).toContain('SoftwareApplication');
    expect(layout).toContain('application/ld+json');
  });

  it('root layout includes Organization JSON-LD', () => {
    const layout = readFile('app/layout.tsx');
    expect(layout).toContain("'Organization'");
  });

  it('about page includes FAQPage JSON-LD', () => {
    const about = readFile('app/about/page.tsx');
    expect(about).toContain('FAQPage');
    expect(about).toContain('application/ld+json');
  });

  it('about/flow-limitation includes BreadcrumbList JSON-LD', () => {
    const page = readFile('app/about/flow-limitation/page.tsx');
    expect(page).toContain('BreadcrumbList');
  });

  it('about/glasgow-index includes BreadcrumbList JSON-LD', () => {
    const page = readFile('app/about/glasgow-index/page.tsx');
    expect(page).toContain('BreadcrumbList');
  });

  it('about/oximetry-analysis includes BreadcrumbList JSON-LD', () => {
    const page = readFile('app/about/oximetry-analysis/page.tsx');
    expect(page).toContain('BreadcrumbList');
  });
});

describe('SEO metadata — no conflicting static files', () => {
  it('public/sitemap.xml does not exist (dynamic sitemap.ts is the source of truth)', () => {
    expect(fileExists('public/sitemap.xml')).toBe(false);
  });

  it('public/robots.txt does not exist (dynamic robots.ts is the source of truth)', () => {
    expect(fileExists('public/robots.txt')).toBe(false);
  });
});
