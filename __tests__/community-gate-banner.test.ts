import { describe, it, expect } from 'vitest';

const COMMUNITY_TIER_LIMIT = 7;
const GATE_SHIP_DATE_MS = new Date('2026-05-27T00:00:00').getTime();

function shouldShowBanner(opts: {
  tier: string;
  nightCount: number;
  nowMs?: number;
  dismissed?: boolean;
}): boolean {
  const { tier, nightCount, nowMs = Date.now(), dismissed = false } = opts;
  if (tier !== 'community') return false;
  if (nightCount <= COMMUNITY_TIER_LIMIT) return false;
  if (nowMs >= GATE_SHIP_DATE_MS) return false;
  if (dismissed) return false;
  return true;
}

const BEFORE_GATE = new Date('2026-05-20T12:00:00').getTime();
const AFTER_GATE = new Date('2026-05-27T00:00:00').getTime();
const NIGHT_COUNT_HIGH = 12;
const NIGHT_COUNT_LOW = 5;

describe('CommunityGateBanner guard conditions', () => {
  it('shows for community tier with >7 nights before gate ships', () => {
    expect(shouldShowBanner({ tier: 'community', nightCount: NIGHT_COUNT_HIGH, nowMs: BEFORE_GATE })).toBe(true);
  });

  it('hides for supporter tier regardless of night count', () => {
    expect(shouldShowBanner({ tier: 'supporter', nightCount: NIGHT_COUNT_HIGH, nowMs: BEFORE_GATE })).toBe(false);
  });

  it('hides for champion tier', () => {
    expect(shouldShowBanner({ tier: 'champion', nightCount: NIGHT_COUNT_HIGH, nowMs: BEFORE_GATE })).toBe(false);
  });

  it('hides for unauthenticated (free) tier', () => {
    expect(shouldShowBanner({ tier: 'free', nightCount: NIGHT_COUNT_HIGH, nowMs: BEFORE_GATE })).toBe(false);
  });

  it('hides for community tier with exactly 7 nights', () => {
    expect(shouldShowBanner({ tier: 'community', nightCount: 7, nowMs: BEFORE_GATE })).toBe(false);
  });

  it('hides for community tier with fewer than 7 nights', () => {
    expect(shouldShowBanner({ tier: 'community', nightCount: NIGHT_COUNT_LOW, nowMs: BEFORE_GATE })).toBe(false);
  });

  it('shows for community tier with exactly 8 nights', () => {
    expect(shouldShowBanner({ tier: 'community', nightCount: 8, nowMs: BEFORE_GATE })).toBe(true);
  });

  it('hides on the gate ship date itself', () => {
    expect(shouldShowBanner({ tier: 'community', nightCount: NIGHT_COUNT_HIGH, nowMs: AFTER_GATE })).toBe(false);
  });

  it('hides after the gate ship date', () => {
    const afterGate = new Date('2026-06-01T00:00:00').getTime();
    expect(shouldShowBanner({ tier: 'community', nightCount: NIGHT_COUNT_HIGH, nowMs: afterGate })).toBe(false);
  });

  it('hides when dismissed via sessionStorage', () => {
    expect(shouldShowBanner({ tier: 'community', nightCount: NIGHT_COUNT_HIGH, nowMs: BEFORE_GATE, dismissed: true })).toBe(false);
  });

  it('shows when not dismissed', () => {
    expect(shouldShowBanner({ tier: 'community', nightCount: NIGHT_COUNT_HIGH, nowMs: BEFORE_GATE, dismissed: false })).toBe(true);
  });
});
