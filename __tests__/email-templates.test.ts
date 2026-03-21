import { describe, it, expect } from 'vitest';
import {
  postUploadStep1,
  postUploadStep2,
  postUploadStep3,
  dormancyStep1,
  dormancyStep2,
  featureEducationStep1,
  featureEducationStep2,
  SEQUENCES,
  type SequenceName,
} from '@/lib/email/templates';

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

// ── Structural invariants ──────────────────────────────────────

describe('All templates — structural invariants', () => {
  const allTemplates = [
    { name: 'postUpload1', fn: postUploadStep1 },
    { name: 'postUpload2', fn: postUploadStep2 },
    { name: 'postUpload3', fn: postUploadStep3 },
    { name: 'dormancy1', fn: dormancyStep1 },
    { name: 'dormancy2', fn: dormancyStep2 },
    { name: 'featureEd1', fn: featureEducationStep1 },
    { name: 'featureEd2', fn: featureEducationStep2 },
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
  const sequenceNames: SequenceName[] = ['post_upload', 'dormancy', 'feature_education', 'activation', 'premium_onboarding'];

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

  it('dormancy has 2 steps with delays [0, 7]', () => {
    expect(SEQUENCES.dormancy.totalSteps).toBe(2);
    expect(SEQUENCES.dormancy.delays).toEqual([0, 7]);
  });

  it('feature_education has 2 steps with delays [10, 17]', () => {
    expect(SEQUENCES.feature_education.totalSteps).toBe(2);
    expect(SEQUENCES.feature_education.delays).toEqual([10, 17]);
  });

  it('premium_onboarding has 3 steps with delays [0, 3, 7]', () => {
    expect(SEQUENCES.premium_onboarding.totalSteps).toBe(3);
    expect(SEQUENCES.premium_onboarding.delays).toEqual([0, 3, 7]);
  });
});
