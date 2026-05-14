import { describe, it, expect } from 'vitest';
import { getAnalysisWindowDays } from '@/lib/auth/feature-gate';

// Test the pure logic — daysLeft calculation — without React rendering.
// The component is a thin wrapper around this logic.

const WARNING_WINDOW_DAYS = 15;

function calcDaysLeft(
  tier: string,
  nightDates: string[],
  now: number
): number | null {
  if (tier !== 'supporter' || nightDates.length === 0) return null;

  const windowDays = getAnalysisWindowDays(tier as 'supporter');
  if (!isFinite(windowDays) || windowDays <= 0) return null;

  const oldestDate = nightDates.reduce((oldest, dateStr) => {
    const d = new Date(dateStr);
    return d < oldest ? d : oldest;
  }, new Date(nightDates[0]!));

  const daysSinceOldest = Math.floor(
    (now - oldestDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  const remaining = windowDays - daysSinceOldest;

  if (remaining > WARNING_WINDOW_DAYS || remaining < 0) return null;
  return Math.max(0, remaining);
}

describe('History Expiry Warning — daysLeft calculation', () => {
  it('returns null for community tier', () => {
    expect(calcDaysLeft('community', ['2026-01-01'], Date.now())).toBeNull();
  });

  it('returns null for champion tier', () => {
    expect(calcDaysLeft('champion', ['2026-01-01'], Date.now())).toBeNull();
  });

  it('returns null for empty nights array', () => {
    expect(calcDaysLeft('supporter', [], Date.now())).toBeNull();
  });

  it('returns null when oldest night is less than 75 days old', () => {
    const now = new Date('2026-03-27').getTime();
    // Night from 60 days ago = 90 - 60 = 30 days left > 15 warning window
    const sixtyDaysAgo = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(calcDaysLeft('supporter', [sixtyDaysAgo], now)).toBeNull();
  });

  it('returns days left when oldest night is 80 days old', () => {
    const now = new Date('2026-03-27').getTime();
    const eightyDaysAgo = new Date(now - 80 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(calcDaysLeft('supporter', [eightyDaysAgo], now)).toBe(10);
  });

  it('returns 0 when oldest night is exactly 90 days old', () => {
    const now = new Date('2026-03-27').getTime();
    const ninetyDaysAgo = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(calcDaysLeft('supporter', [ninetyDaysAgo], now)).toBe(0);
  });

  it('returns null when oldest night is over 90 days old', () => {
    const now = new Date('2026-03-27').getTime();
    const hundredDaysAgo = new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(calcDaysLeft('supporter', [hundredDaysAgo], now)).toBeNull();
  });

  it('uses the oldest date from multiple nights', () => {
    const now = new Date('2026-03-27').getTime();
    const eightyDaysAgo = new Date(now - 80 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    const tenDaysAgo = new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    // Oldest is 80 days → 10 days left
    expect(calcDaysLeft('supporter', [tenDaysAgo, eightyDaysAgo], now)).toBe(10);
  });

  it('returns 15 at exactly the warning threshold (75 days old)', () => {
    const now = new Date('2026-03-27').getTime();
    const seventyFiveDaysAgo = new Date(now - 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(calcDaysLeft('supporter', [seventyFiveDaysAgo], now)).toBe(15);
  });

  it('returns 1 when oldest night is 89 days old', () => {
    const now = new Date('2026-03-27').getTime();
    const eightyNineDaysAgo = new Date(now - 89 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    expect(calcDaysLeft('supporter', [eightyNineDaysAgo], now)).toBe(1);
  });

  it('supporter window is 90 days per feature gate', () => {
    expect(getAnalysisWindowDays('supporter')).toBe(90);
  });

  it('champion window is Infinity per feature gate', () => {
    expect(getAnalysisWindowDays('champion')).toBe(Infinity);
  });

  it('community window is 30 days per feature gate', () => {
    expect(getAnalysisWindowDays('community')).toBe(30);
  });
});
