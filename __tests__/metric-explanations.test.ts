import { describe, it, expect } from 'vitest';
import {
  getGlasgowExplanation,
  getEAIExplanation,
  getNEDExplanation,
  getODIExplanation,
  METRIC_PLAIN_LANGUAGE,
} from '@/lib/metric-explanations';
import { THRESHOLDS } from '@/lib/thresholds';

describe('getGlasgowExplanation', () => {
  const threshold = THRESHOLDS.glasgowOverall!;

  it('returns healthy explanation for good values', () => {
    const text = getGlasgowExplanation(0.5, threshold);
    expect(text).toContain('0.5');
    expect(text).toContain('lower range');
    expect(text).toContain('minimal flow limitation');
  });

  it('returns borderline explanation for warn values', () => {
    const text = getGlasgowExplanation(1.5, threshold);
    expect(text).toContain('1.5');
    expect(text).toContain('borderline');
    expect(text).toContain('clinician');
  });

  it('returns significant explanation for bad values', () => {
    const text = getGlasgowExplanation(3.0, threshold);
    expect(text).toContain('3.0');
    expect(text).toContain('significant');
    expect(text).toContain('clinician');
  });

  it('includes the actual value in all responses', () => {
    for (const val of [0.2, 1.8, 4.5]) {
      const text = getGlasgowExplanation(val, threshold);
      expect(text).toContain(val.toFixed(1));
    }
  });
});

describe('getEAIExplanation', () => {
  const threshold = THRESHOLDS.eai!;

  it('returns empty string for zero value', () => {
    expect(getEAIExplanation(0, threshold)).toBe('');
  });

  it('returns low explanation for good values', () => {
    const text = getEAIExplanation(3, threshold);
    expect(text).toContain('3.0');
    expect(text).toContain('low');
  });

  it('returns moderate explanation for warn values', () => {
    const text = getEAIExplanation(7, threshold);
    expect(text).toContain('7.0');
    expect(text).toContain('moderately elevated');
  });

  it('returns elevated explanation for bad values', () => {
    const text = getEAIExplanation(15, threshold);
    expect(text).toContain('15.0');
    expect(text).toContain('elevated');
    expect(text).toContain('clinician');
  });
});

describe('getNEDExplanation', () => {
  const threshold = THRESHOLDS.nedMean!;

  it('returns well-controlled for good NED and low RERA', () => {
    const text = getNEDExplanation(10, 3, threshold);
    expect(text).toContain('well-controlled');
  });

  it('prioritizes RERA explanation when RERA >= 10', () => {
    const text = getNEDExplanation(12, 12, threshold);
    expect(text).toContain('RERA');
    expect(text).toContain('12.0');
  });

  it('returns elevated effort for bad NED', () => {
    const text = getNEDExplanation(30, 8, threshold);
    expect(text).toContain('elevated');
  });

  it('returns moderate explanation for borderline values', () => {
    const text = getNEDExplanation(18, 6, threshold);
    expect(text).toContain('moderate');
  });
});

describe('getODIExplanation', () => {
  const threshold = THRESHOLDS.odi3!;

  it('returns stable explanation for good values', () => {
    const text = getODIExplanation(2, threshold);
    expect(text).toContain('stable');
  });

  it('returns moderate explanation for warn values', () => {
    const text = getODIExplanation(8, threshold);
    expect(text).toContain('moderate');
    expect(text).toContain('stress response');
  });

  it('returns frequent explanation for bad values', () => {
    const text = getODIExplanation(20, threshold);
    expect(text).toContain('frequent');
    expect(text).toContain('clinical attention');
  });
});

describe('METRIC_PLAIN_LANGUAGE', () => {
  const expectedKeys = [
    'iflRisk',
    'glasgowIndex',
    'flScore',
    'nedMean',
    'reraIndex',
    'eai',
    'regularity',
    'periodicity',
    'combinedFL',
    'odi3',
    'tBelow90',
    'spo2Mean',
    'hrClin10',
  ];

  it('has plain-language text for all key metrics used in the dashboard', () => {
    for (const key of expectedKeys) {
      expect(METRIC_PLAIN_LANGUAGE[key], `Missing plain language for ${key}`).toBeDefined();
      expect(METRIC_PLAIN_LANGUAGE[key]!.length, `Empty plain language for ${key}`).toBeGreaterThan(10);
    }
  });

  it('each entry is a non-empty string', () => {
    for (const [key, value] of Object.entries(METRIC_PLAIN_LANGUAGE)) {
      expect(typeof value, `${key} should be a string`).toBe('string');
      expect(value.trim().length, `${key} should not be empty`).toBeGreaterThan(0);
    }
  });
});
