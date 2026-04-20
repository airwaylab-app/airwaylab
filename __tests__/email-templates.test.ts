import { describe, it, expect } from 'vitest';
import {
  postUploadStep1,
  postUploadStep2,
  postUploadStep3,
  dormancyStep1,
  dormancyStep2,
  dormancyStep3,
  featureEducationStep1,
  featureEducationStep2,
  cpapTipsStep1,
  cpapTipsStep2,
  cpapTipsStep3,
  cpapTipsStep4,
  cpapTipsStep5,
  SEQUENCES,
  type SequenceName,
} from '@/lib/email/templates';
import { WELCOME_SEQUENCE_DAYS } from '@/lib/email/sequences';

const UNSUB_URL = 'https://airwaylab.app/unsubscribe?token=test-token';

// ── Individual template tests ──────────────────────────────────

describe('Post-upload sequence templates', () => {
  it('step 1 returns valid subject and HTML', () => {
    const { subject, html } = postUploadStep1(UNSUB_URL);
    expect(subject).toBeTruthy();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('AirwayLab');
    expect(html).toContain(UNSUB_URL);
  });

  it('step 1 includes upload CTA and privacy reassurance', () => {
    const { html } = postUploadStep1(UNSUB_URL);
    expect(html).toContain('Upload');
    expect(html).toContain('airwaylab.app/analyze');
    expect(html).toContain('saved in your browser');
  });

  it('step 2 explains multi-night analysis value', () => {
    const { subject, html } = postUploadStep2(UNSUB_URL);
    expect(subject).toBeTruthy();
    expect(html).toContain('Upload Your Next Night');
  });

  it('step 3 promotes symptom tracking', () => {
    const { subject, html } = postUploadStep3(UNSUB_URL);
    expect(subject).toBeTruthy();
    expect(html).toContain('Log How You Slept');
    expect(html).toContain('clinician');
  });
});

describe('Dormancy sequence templates', () => {
  it('step 1 highlights new features', () => {
    const { subject, html } = dormancyStep1(UNSUB_URL);
    expect(subject).toBeTruthy();
    expect(html).toContain('Upload This Month');
    expect(html).toContain('One upload, one minute');
  });

  it('step 2 encourages comparison', () => {
    const { subject, html } = dormancyStep2(UNSUB_URL);
    expect(subject).toBeTruthy();
    expect(html).toContain('Upload When You');
    expect(html).toContain('tracking');
  });

  it('step 3 is warm final touchpoint with no-pressure messaging', () => {
    const { subject, html } = dormancyStep3(UNSUB_URL);
    expect(subject).toBe('Still here if you need us');
    expect(html).toContain('No pressure, no guilt');
    expect(html).toContain('dormancy_3');
    expect(html).toContain(UNSUB_URL);
    expect(html).toContain('not a medical device');
  });
});

describe('Feature education sequence templates', () => {
  it('step 1 explains AI insights', () => {
    const { subject, html } = featureEducationStep1(UNSUB_URL);
    expect(subject).toBeTruthy();
    expect(html).toContain('AI');
    expect(html).toContain('Try AI Insights');
    expect(html).toContain('3 AI analyses per month');
  });

  it('step 2 promotes export options', () => {
    const { subject, html } = featureEducationStep2(UNSUB_URL);
    expect(subject).toBeTruthy();
    expect(html).toContain('PDF report');
    expect(html).toContain('CSV export');
    expect(html).toContain('Export Your Report');
  });
});

// ── CPAP tips sequence templates ───────────────────────────────

describe('CPAP tips sequence templates', () => {
  it('step 1 (~day 10 from signup) covers first-week expectations', () => {
    const { subject, html } = cpapTipsStep1(UNSUB_URL);
    expect(subject).toContain('first week');
    expect(html).toContain('Mask leak');
    expect(html).toContain('clinician');
    expect(html).toContain('Upload Your First Session');
  });

  it('step 2 (~day 14 from signup) explains AHI, leak, usage hours', () => {
    const { subject, html } = cpapTipsStep2(UNSUB_URL);
    expect(subject).toContain('AHI');
    expect(html).toContain('Apnea-Hypopnea');
    expect(html).toContain('Leak rate');
    expect(html).toContain('Open Your Session Dashboard');
  });

  it('step 3 (~day 19 from signup) covers flow limitation / fatigue with low AHI', () => {
    const { subject, html } = cpapTipsStep3(UNSUB_URL);
    expect(subject).toContain('Low AHI');
    expect(html).toContain('Flow limitation');
    expect(html).toContain('clinician');
    expect(html).toContain('Check Your Flow Limitation Score');
  });

  it('step 4 (~day 25 from signup) covers five feature highlights', () => {
    const { subject, html } = cpapTipsStep4(UNSUB_URL);
    expect(subject).toContain('Five things');
    expect(html).toContain('Compare two sessions');
    expect(html).toContain('trend charts');
    expect(html).toContain('Try Session Comparison');
  });

  it('step 5 (~day 32 from signup) prepares for clinic visit', () => {
    const { subject, html } = cpapTipsStep5(UNSUB_URL);
    expect(subject).toContain('Three weeks');
    expect(html).toContain('Generate a Session Summary');
    expect(html).toContain('clinician');
    expect(html).toContain('clinical review');
  });
});

// ── Structural invariants ──────────────────────────────────────

describe('All templates — structural invariants', () => {
  const allTemplates = [
    { name: 'postUpload1', fn: postUploadStep1 },
    { name: 'postUpload2', fn: postUploadStep2 },
    { name: 'postUpload3', fn: postUploadStep3 },
    { name: 'dormancy1', fn: dormancyStep1 },
    { name: 'dormancy2', fn: dormancyStep2 },
    { name: 'dormancy3', fn: dormancyStep3 },
    { name: 'featureEd1', fn: featureEducationStep1 },
    { name: 'featureEd2', fn: featureEducationStep2 },
    { name: 'cpapTips1', fn: cpapTipsStep1 },
    { name: 'cpapTips2', fn: cpapTipsStep2 },
    { name: 'cpapTips3', fn: cpapTipsStep3 },
    { name: 'cpapTips4', fn: cpapTipsStep4 },
    { name: 'cpapTips5', fn: cpapTipsStep5 },
  ];

  it.each(allTemplates)('$name has non-empty subject', ({ fn }) => {
    const { subject } = fn(UNSUB_URL);
    expect(subject.length).toBeGreaterThan(0);
  });

  it.each(allTemplates)('$name produces valid HTML document', ({ fn }) => {
    const { html } = fn(UNSUB_URL);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
  });

  it.each(allTemplates)('$name includes unsubscribe link', ({ fn }) => {
    const { html } = fn(UNSUB_URL);
    expect(html).toContain(UNSUB_URL);
    expect(html).toContain('Unsubscribe');
  });

  it.each(allTemplates)('$name includes AirwayLab branding', ({ fn }) => {
    const { html } = fn(UNSUB_URL);
    expect(html).toContain('Airway');
    expect(html).toContain('Lab');
  });

  it.each(allTemplates)('$name includes dark theme meta', ({ fn }) => {
    const { html } = fn(UNSUB_URL);
    expect(html).toContain('color-scheme');
    expect(html).toContain('dark');
  });

  it.each(allTemplates)('$name includes UTM tracking on CTA', ({ fn }) => {
    const { html } = fn(UNSUB_URL);
    expect(html).toContain('utm_source=email');
    expect(html).toContain('utm_medium=drip');
  });
});

// ── SEQUENCES registry ─────────────────────────────────────────

describe('SEQUENCES registry', () => {
  const sequenceNames: SequenceName[] = ['post_upload', 'dormancy', 'feature_education', 'activation', 'premium_onboarding', 'cpap_tips'];

  it.each(sequenceNames)('%s has correct totalSteps matching delays array', (name) => {
    const config = SEQUENCES[name];
    expect(config.delays).toHaveLength(config.totalSteps);
  });

  it.each(sequenceNames)('%s getTemplate returns valid output for every step', (name) => {
    const config = SEQUENCES[name];
    for (let step = 1; step <= config.totalSteps; step++) {
      const result = config.getTemplate(step, UNSUB_URL);
      expect(result).not.toBeNull();
      expect(result!.subject).toBeTruthy();
      expect(result!.html).toContain('<!DOCTYPE html>');
    }
  });

  it.each(sequenceNames)('%s getTemplate returns null for out-of-range step', (name) => {
    const config = SEQUENCES[name];
    expect(config.getTemplate(0, UNSUB_URL)).toBeNull();
    expect(config.getTemplate(config.totalSteps + 1, UNSUB_URL)).toBeNull();
  });

  it('post_upload has 3 steps with delays [0, 3, 7]', () => {
    expect(SEQUENCES.post_upload.totalSteps).toBe(3);
    expect(SEQUENCES.post_upload.delays).toEqual([0, 3, 7]);
  });

  it('dormancy has 3 steps with delays [0, 14, 31]', () => {
    expect(SEQUENCES.dormancy.totalSteps).toBe(3);
    expect(SEQUENCES.dormancy.delays).toEqual([0, 14, 31]);
  });

  it('feature_education has 2 steps with delays [10, 17]', () => {
    expect(SEQUENCES.feature_education.totalSteps).toBe(2);
    expect(SEQUENCES.feature_education.delays).toEqual([10, 17]);
  });

  it('premium_onboarding has 3 steps with delays [0, 3, 7]', () => {
    expect(SEQUENCES.premium_onboarding.totalSteps).toBe(3);
    expect(SEQUENCES.premium_onboarding.delays).toEqual([0, 3, 7]);
  });

  it('cpap_tips has 5 steps with delays [3, 7, 12, 18, 25]', () => {
    expect(SEQUENCES.cpap_tips.totalSteps).toBe(5);
    expect(SEQUENCES.cpap_tips.delays).toEqual([3, 7, 12, 18, 25]);
  });

  it('cpap_tips first email starts after post_upload last email when offset by WELCOME_SEQUENCE_DAYS', () => {
    const postUploadLastDay = Math.max(...SEQUENCES.post_upload.delays);
    const cpapTipsFirstDay = Math.min(...SEQUENCES.cpap_tips.delays);
    const effectiveFirstCpapTipsDay = WELCOME_SEQUENCE_DAYS + cpapTipsFirstDay;
    expect(effectiveFirstCpapTipsDay).toBeGreaterThan(postUploadLastDay);
  });
});
