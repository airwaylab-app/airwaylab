/**
 * Tests for AIR-274: CRO fixes
 *
 * Covers:
 *   A1 — Post-purchase activation banner
 *   P1 — Auth redirect fix
 *   P2 — Duplicate Supporter feature removal
 *   P3 — Context-aware auth modal copy
 *   A2 — Getting started link in upload zone
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

function readSource(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf-8');
}

const analyzeSrc = readSource('app/analyze/page.tsx');
const pricingSrc = readSource('app/pricing/page.tsx');
const authModalSrc = readSource('components/auth/auth-modal.tsx');
const fileUploadSrc = readSource('components/upload/file-upload.tsx');
const authContextSrc = readSource('lib/auth/auth-context.tsx');

// ── A1: Post-purchase banner ────────────────────────────────────
describe('A1 — Post-purchase activation banner', () => {
  it('reads checkout=success from searchParams', () => {
    expect(analyzeSrc).toContain("searchParams.get('checkout') !== 'success'");
  });

  it('fires subscriptionStarted analytics event on mount', () => {
    expect(analyzeSrc).toContain("events.subscriptionStarted('unknown', 'unknown', 'checkout_redirect')");
  });

  it('cleans checkout param from URL via replaceState', () => {
    expect(analyzeSrc).toContain("params.delete('checkout')");
    expect(analyzeSrc).toContain('window.history.replaceState');
  });

  it('renders a dismissible emerald banner', () => {
    expect(analyzeSrc).toContain('showPurchaseBanner');
    expect(analyzeSrc).toContain('bg-emerald-500/10');
    expect(analyzeSrc).toContain('aria-label="Dismiss subscription banner"');
  });

  it('banner copy contains no diagnostic language', () => {
    const bannerStart = analyzeSrc.indexOf('showPurchaseBanner &&');
    const bannerEnd = analyzeSrc.indexOf('</div>', bannerStart + 200);
    const bannerHtml = analyzeSrc.slice(bannerStart, bannerEnd);
    expect(bannerHtml).not.toMatch(/diagnos|detect|indicat|obstructi|apnea|effective/i);
  });
});

// ── P1: Auth redirect fix ───────────────────────────────────────
describe('P1 — Auth redirect fix', () => {
  it('AuthModal accepts redirectPath prop', () => {
    expect(authModalSrc).toContain('redirectPath?: string');
  });

  it('AuthModal accepts context prop', () => {
    expect(authModalSrc).toContain("context?: 'pricing' | 'default'");
  });

  it('signIn is called with redirectPath', () => {
    expect(authModalSrc).toContain('await signIn(trimmed, redirectPath)');
  });

  it('auth-context signIn accepts redirectPath parameter', () => {
    expect(authContextSrc).toContain('async (email: string, redirectPath?: string)');
  });

  it('auth-context builds emailRedirectTo with next param when redirectPath provided', () => {
    expect(authContextSrc).toContain('encodeURIComponent(redirectPath)');
    expect(authContextSrc).toContain('/auth/callback?next=');
  });

  it('pricing page passes redirectPath="/pricing" to AuthModal', () => {
    expect(pricingSrc).toContain('redirectPath="/pricing"');
  });

  it('pricing page passes context="pricing" to AuthModal', () => {
    expect(pricingSrc).toContain('context="pricing"');
  });
});

// ── P2: Duplicate Supporter feature ────────────────────────────
describe('P2 — Duplicate Supporter feature removal', () => {
  it('90-day analysis history appears exactly once in SUPPORTER_FEATURES', () => {
    const featuresStart = pricingSrc.indexOf('const SUPPORTER_FEATURES');
    const featuresEnd = pricingSrc.indexOf('];', featuresStart);
    const featuresBlock = pricingSrc.slice(featuresStart, featuresEnd);
    const occurrences = (featuresBlock.match(/90-day analysis history/g) || []).length;
    expect(occurrences).toBe(1);
  });
});

// ── P3: Context-aware auth modal copy ──────────────────────────
describe('P3 — Context-aware auth modal copy', () => {
  it('shows pricing headline when context is pricing', () => {
    expect(authModalSrc).toContain('Sign in to complete your upgrade');
  });

  it('shows upgrade resume subtext when context is pricing', () => {
    expect(authModalSrc).toContain('After verifying, your upgrade will resume automatically.');
  });

  it('falls back to default headline for non-pricing context', () => {
    expect(authModalSrc).toContain('Sign in to AirwayLab');
  });
});

// ── A2: Getting started link in upload zone ─────────────────────
describe('A2 — Getting started link in upload zone', () => {
  it('renders link to /getting-started', () => {
    expect(fileUploadSrc).toContain('href="/getting-started"');
  });

  it('link text mentions getting started guide', () => {
    expect(fileUploadSrc).toContain('getting started guide');
  });

  it('link is gated on !isMobile', () => {
    const linkIndex = fileUploadSrc.indexOf('href="/getting-started"');
    const mobileCheckBefore = fileUploadSrc.lastIndexOf('!isMobile', linkIndex);
    expect(mobileCheckBefore).toBeGreaterThan(-1);
  });

  it('link is inside sdFiles.length === 0 block', () => {
    const linkIndex = fileUploadSrc.indexOf('href="/getting-started"');
    const noFilesBlock = fileUploadSrc.lastIndexOf('sdFiles.length === 0', linkIndex);
    expect(noFilesBlock).toBeGreaterThan(-1);
  });

  it('includes ArrowRight icon', () => {
    expect(fileUploadSrc).toContain('ArrowRight');
  });
});
