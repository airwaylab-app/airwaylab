import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

function readFile(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf-8');
}

describe('Getting Started page', () => {
  it('page file exists at app/getting-started/page.tsx', () => {
    expect(existsSync(join(root, 'app/getting-started/page.tsx'))).toBe(true);
  });

  it('is a Server Component (no "use client" directive)', () => {
    const content = readFile('app/getting-started/page.tsx');
    expect(content).not.toContain("'use client'");
    expect(content).not.toContain('"use client"');
  });

  it('exports metadata with title, description, openGraph, and canonical', () => {
    const content = readFile('app/getting-started/page.tsx');
    expect(content).toContain('export const metadata');
    expect(content).toContain('Getting Started with AirwayLab');
    expect(content).toContain('description');
    expect(content).toContain('openGraph');
    expect(content).toContain('canonical');
    expect(content).toContain('airwaylab.app/getting-started');
  });

  it('contains all 5 step numbers', () => {
    const content = readFile('app/getting-started/page.tsx');
    expect(content).toContain("'01'");
    expect(content).toContain("'02'");
    expect(content).toContain("'03'");
    expect(content).toContain("'04'");
    expect(content).toContain("'05'");
  });

  it('contains all 5 step titles', () => {
    const content = readFile('app/getting-started/page.tsx');
    expect(content).toContain('Find Your SD Card');
    expect(content).toContain('Connect to Your Computer');
    expect(content).toContain('Upload Your Data');
    expect(content).toContain('Read Your Results');
    expect(content).toContain('What to Do Next');
  });

  it('contains CTA link to /analyze', () => {
    const content = readFile('app/getting-started/page.tsx');
    expect(content).toContain('href="/analyze"');
    expect(content).toContain('Go to Analyze');
  });

  it('contains demo CTA link to /analyze?demo', () => {
    const content = readFile('app/getting-started/page.tsx');
    expect(content).toContain('href="/analyze?demo"');
    expect(content).toContain('Try the Demo');
  });

  it('contains link to /glossary', () => {
    const content = readFile('app/getting-started/page.tsx');
    expect(content).toContain('href="/glossary"');
  });

  it('includes the Disclaimer component', () => {
    const content = readFile('app/getting-started/page.tsx');
    expect(content).toContain('<Disclaimer');
  });

  it('includes privacy callout about browser-only processing', () => {
    const content = readFile('app/getting-started/page.tsx');
    expect(content).toContain('processed entirely in your browser');
  });

  it('includes premium upsell mention', () => {
    const content = readFile('app/getting-started/page.tsx');
    expect(content).toContain('Supporters');
    expect(content).toContain('AI-powered explanations');
  });

  it('includes analytics tracker component', () => {
    const content = readFile('app/getting-started/page.tsx');
    expect(content).toContain('GettingStartedTracker');
  });

  // Navigation integration tests
  it('header contains Getting Started link', () => {
    const content = readFile('components/layout/header.tsx');
    expect(content).toContain('/getting-started');
    expect(content).toContain('Getting Started');
  });

  it('footer contains Getting Started link', () => {
    const content = readFile('components/layout/footer.tsx');
    expect(content).toContain('href="/getting-started"');
    expect(content).toContain('Getting Started');
  });

  it('sitemap includes /getting-started', () => {
    const content = readFile('app/sitemap.ts');
    expect(content).toContain('/getting-started');
  });

  it('error state in analyze page links to /getting-started (not broken /about#getting-started)', () => {
    const content = readFile('app/analyze/page.tsx');
    expect(content).toContain('href="/getting-started"');
    expect(content).not.toContain('href="/about#getting-started"');
  });

  it('landing page links to /getting-started from How It Works section', () => {
    const content = readFile('app/page.tsx');
    expect(content).toContain('href="/getting-started"');
    expect(content).toContain('step-by-step guide');
  });
});
