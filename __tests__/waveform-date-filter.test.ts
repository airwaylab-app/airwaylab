import { describe, it, expect } from 'vitest';
import { isEdfRelevantForNight, localDateStr } from '@/lib/waveform-utils';

describe('localDateStr', () => {
  it('formats a Date as YYYY-MM-DD in local time', () => {
    expect(localDateStr(new Date(2024, 9, 14, 22, 0))).toBe('2024-10-14');
    expect(localDateStr(new Date(2024, 0, 1, 0, 0))).toBe('2024-01-01');
  });
});

describe('isEdfRelevantForNight — OOM guard for large SD cards (AIR-2631)', () => {
  it('accepts a recording that starts on the target date', () => {
    // Session begins 22:00 on Oct 14 → belongs to night of Oct 14
    expect(isEdfRelevantForNight(new Date(2024, 9, 14, 22, 0), '2024-10-14')).toBe(true);
  });

  it('accepts an early-morning recording on the next calendar day', () => {
    // Session starts 02:00 on Oct 15 → grouped into night of Oct 14 by night grouper
    expect(isEdfRelevantForNight(new Date(2024, 9, 15, 2, 0), '2024-10-14')).toBe(true);
  });

  it('accepts a late-morning recording on the next calendar day', () => {
    // Session starts 11:59 on Oct 15 — still within the +1 day window
    expect(isEdfRelevantForNight(new Date(2024, 9, 15, 11, 59), '2024-10-14')).toBe(true);
  });

  it('rejects a recording from the previous day', () => {
    // Session starts 22:00 on Oct 13 → night of Oct 13, not Oct 14
    expect(isEdfRelevantForNight(new Date(2024, 9, 13, 22, 0), '2024-10-14')).toBe(false);
  });

  it('rejects a recording from two days later', () => {
    expect(isEdfRelevantForNight(new Date(2024, 9, 16, 0, 0), '2024-10-14')).toBe(false);
  });

  it('handles month-end overflow (Dec 31 → Jan 1)', () => {
    // Session starts 02:00 Jan 1 2025 → belongs to night of Dec 31 2024
    expect(isEdfRelevantForNight(new Date(2025, 0, 1, 2, 0), '2024-12-31')).toBe(true);
    // Session starts 22:00 Dec 30 → belongs to Dec 30, not Dec 31
    expect(isEdfRelevantForNight(new Date(2024, 11, 30, 22, 0), '2024-12-31')).toBe(false);
  });

  it('handles year-end overflow (Dec 31 target)', () => {
    expect(isEdfRelevantForNight(new Date(2024, 11, 31, 22, 0), '2024-12-31')).toBe(true);
  });

  it('rejects an invalid recording date gracefully', () => {
    // Invalid Date → localDateStr returns "NaN-aN-aN" → no match → false
    expect(isEdfRelevantForNight(new Date('not-a-date'), '2024-10-14')).toBe(false);
  });
});
