import { describe, it, expect } from 'vitest';
import {
  detectOximetryFormat,
  parseO2RingTime,
  parseO2RingLine,
  parseOximetryCSV,
} from '@/lib/parsers/oximetry-csv-parser';

// ── Format detection ──────────────────────────────────────────

describe('detectOximetryFormat', () => {
  it('detects Checkme header as checkme', () => {
    const header = 'Time, Oxygen Level, Pulse Rate, Motion, O2 Reminder, PR Reminder';
    expect(detectOximetryFormat(header)).toBe('checkme');
  });

  it('detects O2Ring header as o2ring', () => {
    const header = 'Time,SpO2(%),Pulse Rate(bpm),Motion,SpO2 Reminder,PR Reminder,';
    expect(detectOximetryFormat(header)).toBe('o2ring');
  });

  it('defaults to checkme for unknown headers', () => {
    const header = 'Time,Something,Else';
    expect(detectOximetryFormat(header)).toBe('checkme');
  });
});

// ── O2Ring time parsing ───────────────────────────────────────

describe('parseO2RingTime', () => {
  it('parses standard PM time', () => {
    const result = parseO2RingTime('08:48:26PM Nov 27, 2025');
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2025);
    expect(result!.getMonth()).toBe(10); // Nov = 10
    expect(result!.getDate()).toBe(27);
    expect(result!.getHours()).toBe(20); // 8PM = 20
    expect(result!.getMinutes()).toBe(48);
    expect(result!.getSeconds()).toBe(26);
  });

  it('parses standard AM time', () => {
    const result = parseO2RingTime('06:30:00AM Jan 01, 2026');
    expect(result).not.toBeNull();
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(0); // Jan = 0
    expect(result!.getDate()).toBe(1);
    expect(result!.getHours()).toBe(6);
    expect(result!.getMinutes()).toBe(30);
    expect(result!.getSeconds()).toBe(0);
  });

  it('handles midnight (12:00:00AM = 00:00:00)', () => {
    const result = parseO2RingTime('12:00:00AM Dec 31, 2025');
    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(0);
    expect(result!.getMinutes()).toBe(0);
    expect(result!.getSeconds()).toBe(0);
  });

  it('handles noon (12:00:00PM = 12:00:00)', () => {
    const result = parseO2RingTime('12:00:00PM Dec 31, 2025');
    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(12);
    expect(result!.getMinutes()).toBe(0);
    expect(result!.getSeconds()).toBe(0);
  });

  it('strips surrounding quotes', () => {
    const result = parseO2RingTime('"08:48:26PM Nov 27, 2025"');
    expect(result).not.toBeNull();
    expect(result!.getHours()).toBe(20);
  });

  it('returns null for invalid input', () => {
    expect(parseO2RingTime('not-a-date')).toBeNull();
    expect(parseO2RingTime('')).toBeNull();
  });
});

// ── O2Ring line parsing ───────────────────────────────────────

describe('parseO2RingLine', () => {
  it('parses a standard O2Ring data line', () => {
    const line = '"08:48:26PM Nov 27, 2025",96,72,0,0,0,';
    const result = parseO2RingLine(line);
    expect(result).not.toBeNull();
    expect(result!.timeStr).toBe('08:48:26PM Nov 27, 2025');
    expect(result!.spo2Str).toBe('96');
    expect(result!.hrStr).toBe('72');
    expect(result!.motionStr).toBe('0');
  });

  it('handles trailing comma', () => {
    const line = '"08:48:30PM Nov 27, 2025",95,68,1,0,0,';
    const result = parseO2RingLine(line);
    expect(result).not.toBeNull();
    expect(result!.spo2Str).toBe('95');
  });

  it('returns null for empty line', () => {
    expect(parseO2RingLine('')).toBeNull();
    expect(parseO2RingLine('   ')).toBeNull();
  });

  it('returns null for line without quotes', () => {
    expect(parseO2RingLine('no quotes here,1,2,3')).toBeNull();
  });
});

// ── Full O2Ring CSV parsing ───────────────────────────────────

describe('parseOximetryCSV — O2Ring format', () => {
  function makeO2RingCSV(sampleCount: number): string {
    const header = 'Time,SpO2(%),Pulse Rate(bpm),Motion,SpO2 Reminder,PR Reminder,';
    const lines = [header];

    const baseTime = new Date(2025, 10, 27, 20, 48, 26); // Nov 27, 2025 8:48:26 PM

    for (let i = 0; i < sampleCount; i++) {
      const t = new Date(baseTime.getTime() + i * 4000); // 4s intervals
      const hours = t.getHours();
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      const hStr = String(h12).padStart(2, '0');
      const mStr = String(t.getMinutes()).padStart(2, '0');
      const sStr = String(t.getSeconds()).padStart(2, '0');

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mon = months[t.getMonth()];
      const day = String(t.getDate()).padStart(2, '0');
      const year = t.getFullYear();

      const timeField = `"${hStr}:${mStr}:${sStr}${ampm} ${mon} ${day}, ${year}"`;
      const spo2 = 94 + (i % 4); // 94-97 range
      const hr = 65 + (i % 6);   // 65-70 range
      lines.push(`${timeField},${spo2},${hr},0,0,0,`);
    }

    return lines.join('\n');
  }

  it('parses O2Ring CSV with correct sample count', () => {
    const csv = makeO2RingCSV(10);
    const result = parseOximetryCSV(csv);
    expect(result.samples).toHaveLength(10);
  });

  it('detects ~4s interval', () => {
    const csv = makeO2RingCSV(10);
    const result = parseOximetryCSV(csv);
    expect(result.intervalSeconds).toBe(4);
  });

  it('extracts correct start and end times', () => {
    const csv = makeO2RingCSV(10);
    const result = parseOximetryCSV(csv);
    expect(result.startTime.getHours()).toBe(20);
    expect(result.startTime.getMinutes()).toBe(48);
  });

  it('computes correct dateStr for evening recording', () => {
    const csv = makeO2RingCSV(10);
    const result = parseOximetryCSV(csv);
    // 8:48 PM → hour >= 18 → nightDate = startTime → 2025-11-27
    expect(result.dateStr).toBe('2025-11-27');
  });

  it('parses SpO2 and HR values correctly', () => {
    const csv = makeO2RingCSV(10);
    const result = parseOximetryCSV(csv);
    // First sample: spo2 = 94, hr = 65
    expect(result.samples[0]!.spo2).toBe(94);
    expect(result.samples[0]!.hr).toBe(65);
    expect(result.samples[0]!.valid).toBe(true);
  });

  it('marks samples as valid when in range', () => {
    const csv = makeO2RingCSV(10);
    const result = parseOximetryCSV(csv);
    for (const sample of result.samples) {
      expect(sample.valid).toBe(true);
      expect(sample.spo2).toBeGreaterThanOrEqual(50);
      expect(sample.spo2).toBeLessThanOrEqual(100);
    }
  });
});

// ── Regression: Checkme still works ───────────────────────────

describe('parseOximetryCSV — Checkme format regression', () => {
  function makeCheckmeCSV(sampleCount: number): string {
    const header = 'Time, Oxygen Level, Pulse Rate, Motion, O2 Reminder, PR Reminder';
    const lines = [header];

    const baseTime = new Date(2025, 0, 15, 23, 45, 0); // Jan 15, 2025 11:45 PM

    for (let i = 0; i < sampleCount; i++) {
      const t = new Date(baseTime.getTime() + i * 2000); // 2s intervals

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const hStr = String(t.getHours()).padStart(2, '0');
      const mStr = String(t.getMinutes()).padStart(2, '0');
      const sStr = String(t.getSeconds()).padStart(2, '0');
      const mon = months[t.getMonth()];
      const day = String(t.getDate()).padStart(2, '0');
      const year = t.getFullYear();

      const timeField = `${hStr}:${mStr}:${sStr} ${mon} ${day} ${year}`;
      const spo2 = 95 + (i % 3);
      const hr = 60 + (i % 5);
      lines.push(`${timeField}, ${spo2}, ${hr}, 0, 0, 0`);
    }

    return lines.join('\n');
  }

  it('parses Checkme CSV correctly', () => {
    const csv = makeCheckmeCSV(10);
    const result = parseOximetryCSV(csv);
    expect(result.samples).toHaveLength(10);
  });

  it('detects ~2s interval for Checkme', () => {
    const csv = makeCheckmeCSV(10);
    const result = parseOximetryCSV(csv);
    expect(result.intervalSeconds).toBe(2);
  });

  it('computes correct dateStr for Checkme', () => {
    const csv = makeCheckmeCSV(10);
    const result = parseOximetryCSV(csv);
    // 11:45 PM → hour >= 18 → nightDate = startTime → 2025-01-15
    expect(result.dateStr).toBe('2025-01-15');
  });
});
