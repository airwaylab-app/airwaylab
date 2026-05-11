import { describe, it, expect } from 'vitest';
import { filterNightsToTierWindow } from '@/lib/analysis-orchestrator';
import type { NightResult } from '@/lib/types';

// ---------------------------------------------------------------------------
// Minimal NightResult stub — only dateStr is needed for filter tests
// ---------------------------------------------------------------------------
function makeNight(dateStr: string): NightResult {
  return { dateStr } as unknown as NightResult;
}

function makeNights(count: number, mostRecentDate: Date): NightResult[] {
  // Sorted most-recent-first (matches orchestrator convention)
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(mostRecentDate);
    d.setDate(d.getDate() - i);
    return makeNight(d.toISOString().split('T')[0]!);
  });
}

describe('filterNightsToTierWindow — oximetry/breath trace pruning for persist', () => {
  const now = new Date('2026-05-11').getTime();

  describe('community tier (7-day window)', () => {
    it('prunes nights outside the 7-day cutoff', () => {
      // 10 nights: 2026-05-11 to 2026-05-02. Cutoff = 2026-05-04. Kept = 8 (05-11 to 05-04).
      const nights = makeNights(10, new Date('2026-05-11'));
      const result = filterNightsToTierWindow(nights, 'community', now);
      expect(result).toHaveLength(8);
      expect(result[0]!.dateStr).toBe('2026-05-11');
      expect(result[7]!.dateStr).toBe('2026-05-04');
    });

    it('keeps all nights when all are within 7 days', () => {
      const nights = makeNights(5, new Date('2026-05-11'));
      const result = filterNightsToTierWindow(nights, 'community', now);
      expect(result).toHaveLength(5);
    });

    it('excludes nights older than 7 days even when count is under 7', () => {
      const oldNight = makeNight('2026-04-28'); // 13 days ago
      const recentNights = makeNights(3, new Date('2026-05-11'));
      const nights = [oldNight, ...recentNights].sort((a, b) => b.dateStr.localeCompare(a.dateStr));
      const result = filterNightsToTierWindow(nights, 'community', now);
      expect(result.find((n) => n.dateStr === '2026-04-28')).toBeUndefined();
      expect(result).toHaveLength(3);
    });

    it('returns empty array when all nights are outside the window', () => {
      const nights = [makeNight('2026-04-01'), makeNight('2026-03-01')];
      const result = filterNightsToTierWindow(nights, 'community', now);
      expect(result).toHaveLength(0);
    });
  });

  describe('supporter tier (90-day window)', () => {
    it('keeps all nights within 90 days', () => {
      const nights = makeNights(20, new Date('2026-05-11'));
      const result = filterNightsToTierWindow(nights, 'supporter', now);
      expect(result).toHaveLength(20);
    });

    it('prunes nights older than 90 days', () => {
      const oldNight = makeNight('2026-01-01'); // > 90 days before 2026-05-11
      const recentNights = makeNights(5, new Date('2026-05-11'));
      const nights = [oldNight, ...recentNights].sort((a, b) => b.dateStr.localeCompare(a.dateStr));
      const result = filterNightsToTierWindow(nights, 'supporter', now);
      expect(result.find((n) => n.dateStr === '2026-01-01')).toBeUndefined();
      expect(result).toHaveLength(5);
    });
  });

  describe('champion tier (unlimited window)', () => {
    it('returns all nights unmodified', () => {
      const nights = [
        makeNight('2020-01-01'),
        makeNight('2022-06-15'),
        makeNight('2026-05-11'),
      ];
      const result = filterNightsToTierWindow(nights, 'champion', now);
      expect(result).toHaveLength(3);
      expect(result).toBe(nights); // same reference — no copy
    });

    it('does not cap even with many nights', () => {
      const nights = makeNights(100, new Date('2026-05-11'));
      const result = filterNightsToTierWindow(nights, 'champion', now);
      expect(result).toHaveLength(100);
    });
  });

  describe('edge cases', () => {
    it('handles empty input for any tier', () => {
      expect(filterNightsToTierWindow([], 'community', now)).toHaveLength(0);
      expect(filterNightsToTierWindow([], 'supporter', now)).toHaveLength(0);
      expect(filterNightsToTierWindow([], 'champion', now)).toHaveLength(0);
    });

    it('community: exactly 7 nights within window passes through unchanged', () => {
      const nights = makeNights(7, new Date('2026-05-11'));
      const result = filterNightsToTierWindow(nights, 'community', now);
      expect(result).toHaveLength(7);
    });

    it('community with oximetry-trace nights — only keeps within-window nights for IDB persist', () => {
      // 10 nights: 8 within the 7-day cutoff, 2 outside. IDB should not see the 2 oldest.
      const nights = makeNights(10, new Date('2026-05-11'));
      const toSave = filterNightsToTierWindow(nights, 'community', now);
      const oldest = nights[nights.length - 1]!.dateStr; // '2026-05-02'
      expect(toSave.find((n) => n.dateStr === oldest)).toBeUndefined();
    });
  });
});
