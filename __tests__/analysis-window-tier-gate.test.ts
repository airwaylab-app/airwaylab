import { describe, it, expect } from 'vitest';
import { getAnalysisWindowDays } from '@/lib/auth/feature-gate';
import type { Tier } from '@/lib/auth/auth-context';

// Pure logic extracted from the visibleNights useMemo in app/analyze/page.tsx.
// Keeps the component thin and the gate logic fully unit-testable.
function computeVisibleNights(
  nights: { dateStr: string }[],
  tier: Tier,
  now = Date.now()
): { dateStr: string }[] {
  const windowDays = getAnalysisWindowDays(tier);
  if (windowDays === Infinity || !windowDays) return nights;
  const cutoff = now - windowDays * 24 * 60 * 60 * 1000;
  const filtered = nights.filter((n) => new Date(n.dateStr).getTime() >= cutoff);
  return filtered.slice(-windowDays);
}

function makeNights(count: number, mostRecentDate: Date): { dateStr: string }[] {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(mostRecentDate);
    d.setDate(d.getDate() - (count - 1 - i));
    return { dateStr: d.toISOString().split('T')[0]! };
  });
}

describe('analysis window tier gate — visibleNights slice logic', () => {
  const now = new Date('2026-05-06').getTime();

  it('community user with 10 nights sees only the 7 most recent', () => {
    const nights = makeNights(10, new Date('2026-05-06'));
    const visible = computeVisibleNights(nights, 'community', now);
    expect(visible).toHaveLength(7);
    expect(visible[0]!.dateStr).toBe('2026-04-30');
    expect(visible[6]!.dateStr).toBe('2026-05-06');
  });

  it('community user with exactly 7 nights sees all 7', () => {
    const nights = makeNights(7, new Date('2026-05-06'));
    const visible = computeVisibleNights(nights, 'community', now);
    expect(visible).toHaveLength(7);
  });

  it('community user with 3 nights sees all 3 (under cap)', () => {
    const nights = makeNights(3, new Date('2026-05-06'));
    const visible = computeVisibleNights(nights, 'community', now);
    expect(visible).toHaveLength(3);
  });

  it('community user sees no nights older than 7 days', () => {
    const oldNight = { dateStr: '2026-04-28' }; // 8 days ago from 2026-05-06
    const recentNights = makeNights(3, new Date('2026-05-06'));
    const visible = computeVisibleNights([oldNight, ...recentNights], 'community', now);
    expect(visible.every((n) => n.dateStr >= '2026-04-29')).toBe(true);
    expect(visible.find((n) => n.dateStr === '2026-04-28')).toBeUndefined();
  });

  it('supporter user with 10 nights sees all 10 (90-day window)', () => {
    const nights = makeNights(10, new Date('2026-05-06'));
    const visible = computeVisibleNights(nights, 'supporter', now);
    expect(visible).toHaveLength(10);
  });

  it('champion user with 10 nights sees all 10 (Infinity window)', () => {
    const nights = makeNights(10, new Date('2026-05-06'));
    const visible = computeVisibleNights(nights, 'champion', now);
    expect(visible).toHaveLength(10);
  });

  it('champion user sees nights from years ago unchanged', () => {
    const ancientNight = { dateStr: '2020-01-01' };
    const recentNights = makeNights(3, new Date('2026-05-06'));
    const visible = computeVisibleNights([ancientNight, ...recentNights], 'champion', now);
    expect(visible).toHaveLength(4);
    expect(visible[0]!.dateStr).toBe('2020-01-01');
  });

  it('empty nights array returns empty for any tier', () => {
    expect(computeVisibleNights([], 'community', now)).toHaveLength(0);
    expect(computeVisibleNights([], 'supporter', now)).toHaveLength(0);
    expect(computeVisibleNights([], 'champion', now)).toHaveLength(0);
  });
});
