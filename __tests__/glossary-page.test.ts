import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

function readFile(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf-8');
}

describe('Glossary page', () => {
  it('page file exists at app/glossary/page.tsx', () => {
    expect(existsSync(join(root, 'app/glossary/page.tsx'))).toBe(true);
  });

  it('is a Server Component (no "use client" directive)', () => {
    const content = readFile('app/glossary/page.tsx');
    expect(content).not.toContain("'use client'");
    expect(content).not.toContain('"use client"');
  });

  it('exports metadata with title, description, keywords, openGraph, and alternates.canonical', () => {
    const content = readFile('app/glossary/page.tsx');
    expect(content).toContain('export const metadata');
    expect(content).toContain('title');
    expect(content).toContain('description');
    expect(content).toContain('keywords');
    expect(content).toContain('openGraph');
    expect(content).toContain('alternates');
    expect(content).toContain('canonical');
  });

  it('contains DefinedTermSet JSON-LD generation', () => {
    const content = readFile('app/glossary/page.tsx');
    expect(content).toContain('DefinedTermSet');
    expect(content).toContain('application/ld+json');
  });

  it('contains BreadcrumbList JSON-LD generation', () => {
    const content = readFile('app/glossary/page.tsx');
    expect(content).toContain('BreadcrumbList');
  });

  it('every term has a unique id field', () => {
    const content = readFile('app/glossary/page.tsx');
    // Extract all id values from term definitions
    const idMatches = content.match(/id:\s*'([^']+)'/g);
    expect(idMatches).not.toBeNull();
    const ids = idMatches!.map((m) => m.match(/id:\s*'([^']+)'/)![1]);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('every term id is valid as an HTML anchor (lowercase, kebab-case, no spaces)', () => {
    const content = readFile('app/glossary/page.tsx');
    const idMatches = content.match(/id:\s*'([^']+)'/g);
    expect(idMatches).not.toBeNull();
    const ids = idMatches!.map((m) => m.match(/id:\s*'([^']+)'/)![1]);
    for (const id of ids) {
      expect(id, `ID "${id}" is not valid kebab-case`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('all four category values are present', () => {
    const content = readFile('app/glossary/page.tsx');
    expect(content).toContain("'sleep-disordered-breathing'");
    expect(content).toContain("'airwaylab-metrics'");
    expect(content).toContain("'pap-therapy'");
    expect(content).toContain("'data-analysis'");
  });

  it('contains the standard medical disclaimer text', () => {
    const content = readFile('app/glossary/page.tsx');
    expect(content).toContain('AirwayLab is not a medical device');
    expect(content).toContain('not FDA-cleared or');
  });

  it('sitemap includes /glossary', () => {
    const content = readFile('app/sitemap.ts');
    expect(content).toContain('/glossary');
  });

  it('llms.txt mentions /glossary', () => {
    const content = readFile('public/llms.txt');
    expect(content).toContain('airwaylab.app/glossary');
  });
});
