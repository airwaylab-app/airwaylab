/**
 * Tests for the post-purchase tier activation polling on /analyze?checkout=success
 * Verifies that refreshProfile is polled after Stripe checkout redirect so that
 * newly subscribed users see their updated tier without a manual page reload.
 * AIR-1126 / AIR-1134
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'app/analyze/page.tsx'), 'utf-8');

describe('checkout=success: refreshProfile polling', () => {
  it('destructures refreshProfile from useAuth alongside user and tier', () => {
    expect(src).toMatch(/const\s*\{[^}]*refreshProfile[^}]*\}\s*=\s*useAuth\(\)/);
  });

  it('uses a tierRef to avoid stale closure inside the polling interval', () => {
    expect(src).toContain('tierRef.current = tier');
    expect(src).toContain("tierRef.current !== 'community'");
  });

  it('calls refreshProfile inside a setInterval when checkout=success', () => {
    expect(src).toContain('await refreshProfile()');
    expect(src).toContain('setInterval');
  });

  it('caps polling at 15 attempts (30 seconds at 2s intervals)', () => {
    expect(src).toContain('attempts >= 15');
  });

  it('guards the effect so polling only starts on checkout=success', () => {
    expect(src).toContain("searchParams.get('checkout') !== 'success'");
  });

  it('returns a cleanup function that clears the interval on unmount', () => {
    expect(src).toContain('return () => clearInterval(poll)');
  });
});

describe('checkout=success: activated banner copy', () => {
  it('tracks bannerActivated state and sets it true when tier upgrades', () => {
    expect(src).toContain('bannerActivated');
    expect(src).toContain('setBannerActivated(true)');
  });

  it('shows "Subscription activated!" copy once tier has upgraded', () => {
    expect(src).toContain('Subscription activated!');
  });

  it('falls back to "is activating" copy while polling is in progress', () => {
    expect(src).toContain('Your subscription is activating');
  });
});
