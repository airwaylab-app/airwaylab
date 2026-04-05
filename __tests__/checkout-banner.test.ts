/**
 * Tests for the post-purchase activation banner on /analyze?checkout=success
 * Spec: AIR-229
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

function readSource(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf-8');
}

describe('Checkout success banner: state and analytics', () => {
  const src = readSource('app/analyze/page.tsx');

  it('reads checkout param from searchParams', () => {
    expect(src).toContain("searchParams.get('checkout')");
  });

  it('initialises showCheckoutBanner from checkout param', () => {
    expect(src).toContain("useState(checkoutParam === 'success')");
  });

  it('fires subscriptionStarted analytics event on mount', () => {
    expect(src).toContain("events.subscriptionStarted('unknown', 'unknown', 'checkout_redirect')");
  });

  it('analytics useEffect has empty deps array (fires once)', () => {
    // The subscriptionStarted call must be followed by an empty deps array
    const analyticsEffectMatch = src.match(
      /subscriptionStarted\('unknown',\s*'unknown',\s*'checkout_redirect'\)[\s\S]*?\},\s*\[\]\)/
    );
    expect(analyticsEffectMatch).not.toBeNull();
  });
});

describe('Checkout success banner: rendering', () => {
  const src = readSource('app/analyze/page.tsx');

  it('renders banner when showCheckoutBanner is true', () => {
    expect(src).toContain('{showCheckoutBanner && (');
  });

  it('banner has a dismiss button with aria-label', () => {
    expect(src).toContain('aria-label="Dismiss"');
    expect(src).toContain('setShowCheckoutBanner(false)');
  });

  it('banner copy says "is activating" not "is now active"', () => {
    expect(src).toContain('Your subscription is activating');
    expect(src).not.toContain('is now active');
  });

  it('banner copy mentions next upload', () => {
    expect(src).toContain('next upload');
  });

  it('banner does not contain diagnostic or clinical language', () => {
    // Extract the banner block to scope the check
    const bannerStart = src.indexOf('{showCheckoutBanner && (');
    const bannerEnd = src.indexOf(')}', bannerStart) + 2;
    const bannerBlock = src.slice(bannerStart, bannerEnd);

    expect(bannerBlock).not.toContain('normal');
    expect(bannerBlock).not.toContain('abnormal');
    expect(bannerBlock).not.toContain('diagnos');
  });

  it('banner links to account settings', () => {
    expect(src).toContain('href="/account"');
    expect(src).toContain('account settings');
  });

  it('dismiss button has visible focus indicator class', () => {
    expect(src).toContain('focus-visible:outline');
  });
});

describe('Checkout success banner: analytics contract', () => {
  it('subscriptionStarted event is defined in analytics.ts', () => {
    const analyticsSrc = readSource('lib/analytics.ts');
    expect(analyticsSrc).toContain('subscriptionStarted: (tier: string, interval: string, source: string)');
  });
});
