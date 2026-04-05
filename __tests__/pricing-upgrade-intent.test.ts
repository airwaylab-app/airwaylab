/**
 * Tests for AIR-228: preserve tier selection through magic-link auth flow.
 *
 * Verifies that the pricing page stores upgrade intent in sessionStorage
 * before opening the auth modal, then auto-triggers checkout when the
 * user returns authenticated.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

function readSource(filePath: string): string {
  return fs.readFileSync(path.join(ROOT, filePath), 'utf-8');
}

const pricingSrc = readSource('app/pricing/page.tsx');

// ── Constant ──────────────────────────────────────────────────
describe('UPGRADE_INTENT_KEY constant', () => {
  it('defines the constant with the correct airwaylab_ prefix', () => {
    expect(pricingSrc).toContain("const UPGRADE_INTENT_KEY = 'airwaylab_upgrade_intent'");
  });
});

// ── Intent storage on unauthenticated checkout ─────────────────
describe('handleCheckout: stores intent before auth modal', () => {
  it('calls sessionStorage.setItem with UPGRADE_INTENT_KEY before setAuthModalOpen', () => {
    expect(pricingSrc).toContain('sessionStorage.setItem(UPGRADE_INTENT_KEY, priceId)');
  });

  it('wraps sessionStorage.setItem in try/catch so storage failure is non-critical', () => {
    // The setItem call must be inside a try block
    const setItemIndex = pricingSrc.indexOf('sessionStorage.setItem(UPGRADE_INTENT_KEY');
    const tryBeforeSetItem = pricingSrc.lastIndexOf('try {', setItemIndex);
    const catchAfterSetItem = pricingSrc.indexOf('} catch', setItemIndex);
    expect(tryBeforeSetItem).toBeGreaterThan(-1);
    expect(catchAfterSetItem).toBeGreaterThan(setItemIndex);
  });

  it('still calls setAuthModalOpen(true) after storing intent', () => {
    const setItemIndex = pricingSrc.indexOf('sessionStorage.setItem(UPGRADE_INTENT_KEY');
    const modalOpenIndex = pricingSrc.indexOf('setAuthModalOpen(true)', setItemIndex);
    expect(modalOpenIndex).toBeGreaterThan(setItemIndex);
  });
});

// ── Intent pickup on auth ──────────────────────────────────────
describe('useEffect: auto-triggers checkout when user authenticates', () => {
  it('reads the stored intent from sessionStorage on user auth', () => {
    expect(pricingSrc).toContain('sessionStorage.getItem(UPGRADE_INTENT_KEY)');
  });

  it('removes the intent from sessionStorage after reading', () => {
    expect(pricingSrc).toContain('sessionStorage.removeItem(UPGRADE_INTENT_KEY)');
  });

  it('calls handleCheckout with the stored priceId', () => {
    expect(pricingSrc).toContain('handleCheckout(pendingPriceId)');
  });

  it('guards the effect with !user early return so it only fires when authenticated', () => {
    expect(pricingSrc).toContain('if (!user) return;');
  });

  it('dependency array is [user] so effect fires on authentication', () => {
    // Verify the intent effect uses [user] as its dependency
    const getItemIndex = pricingSrc.indexOf('sessionStorage.getItem(UPGRADE_INTENT_KEY)');
    const depsAfter = pricingSrc.indexOf('}, [user]);', getItemIndex);
    expect(depsAfter).toBeGreaterThan(getItemIndex);
  });

  it('wraps sessionStorage access in try/catch so storage failure is safe', () => {
    const getItemIndex = pricingSrc.indexOf('sessionStorage.getItem(UPGRADE_INTENT_KEY)');
    const tryBefore = pricingSrc.lastIndexOf('try {', getItemIndex);
    const catchAfter = pricingSrc.indexOf('} catch', getItemIndex);
    expect(tryBefore).toBeGreaterThan(-1);
    expect(catchAfter).toBeGreaterThan(getItemIndex);
  });
});

// ── No regression for authenticated users ─────────────────────
describe('handleCheckout: authenticated users bypass auth modal', () => {
  it('proceeds to fetch /api/create-checkout-session when user is set', () => {
    // The fetch call must come AFTER the !user guard, not before
    const userGuardIndex = pricingSrc.indexOf('if (!user) {');
    const fetchIndex = pricingSrc.indexOf("fetch('/api/create-checkout-session'");
    expect(fetchIndex).toBeGreaterThan(userGuardIndex);
  });

  it('does not store intent when user is already authenticated (setItem inside !user block)', () => {
    // The sessionStorage.setItem must be inside the if (!user) block, not outside
    const userGuardStart = pricingSrc.indexOf('if (!user) {');
    const userGuardEnd = pricingSrc.indexOf('\n    }', userGuardStart);
    const setItemIndex = pricingSrc.indexOf('sessionStorage.setItem(UPGRADE_INTENT_KEY', userGuardStart);
    expect(setItemIndex).toBeGreaterThan(userGuardStart);
    expect(setItemIndex).toBeLessThan(userGuardEnd);
  });
});
