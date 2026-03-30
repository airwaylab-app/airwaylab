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

// ── Helpers ──────────────────────────────────────────────────

const UNSUB_URL = 'https://airwaylab.app/api/email/unsubscribe?token=test-token';

function assertValidHtml(html: string) {
  expect(html).toContain('<!DOCTYPE html>');
  expect(html).toContain('<html lang="en">');
  expect(html).toContain('</html>');
  expect(html).toContain('<body');
  expect(html).toContain('</body>');
}

function assertHasHeader(html: string) {
  expect(html).toContain('AirwayLab');
  expect(html).toContain('Airway');
  expect(html).toContain('Lab');
}

function assertHasUnsubscribeFooter(html: string) {
  expect(html).toContain(UNSUB_URL);
  expect(html).toContain('Unsubscribe');
  expect(html).toContain('opted in to email updates');
}

function assertDarkTheme(html: string) {
  expect(html).toContain('background-color:#0a0a0b');
  expect(html).toContain('color-scheme');
}

function assertHasCta(html: string) {
  // CTA button with teal background
  expect(html).toContain('background-color:#5eead4');
  expect(html).toContain('border-radius:8px');
}

// ── Shared template structure tests ──────────────────────────

describe('email templates — shared structure', () => {
  const allDirectTemplates = [
    { name: 'postUploadStep1', fn: postUploadStep1 },
    { name: 'postUploadStep2', fn: postUploadStep2 },
    { name: 'postUploadStep3', fn: postUploadStep3 },
    { name: 'dormancyStep1', fn: dormancyStep1 },
    { name: 'dormancyStep2', fn: dormancyStep2 },
    { name: 'featureEducationStep1', fn: featureEducationStep1 },
    { name: 'featureEducationStep2', fn: featureEducationStep2 },
  ];

  for (const { name, fn } of allDirectTemplates) {
    describe(name, () => {
      it('returns subject and html', () => {
        const result = fn(UNSUB_URL);
        expect(result.subject).toBeTruthy();
        expect(typeof result.subject).toBe('string');
        expect(result.html).toBeTruthy();
        expect(typeof result.html).toBe('string');
      });

      it('renders valid HTML with doctype', () => {
        assertValidHtml(fn(UNSUB_URL).html);
      });

      it('includes AirwayLab header', () => {
        assertHasHeader(fn(UNSUB_URL).html);
      });

      it('includes unsubscribe link in footer', () => {
        assertHasUnsubscribeFooter(fn(UNSUB_URL).html);
      });

      it('uses dark theme styling', () => {
        assertDarkTheme(fn(UNSUB_URL).html);
      });

      it('includes a CTA button', () => {
        assertHasCta(fn(UNSUB_URL).html);
      });
    });
  }
});

// ── Individual template content tests ────────────────────────

describe('email templates — content', () => {
  describe('post_upload sequence', () => {
    it('step 1 mentions engine analysis', () => {
      const { subject, html } = postUploadStep1(UNSUB_URL);
      expect(subject).toContain('engines');
      expect(html).toContain('flow limitation');
      expect(html).toContain('breathing regularity');
    });

    it('step 2 encourages multi-night uploads for trends', () => {
      const { subject, html } = postUploadStep2(UNSUB_URL);
      expect(subject).toContain('snapshot');
      expect(html).toContain('trend');
    });

    it('step 3 promotes symptom logging and AI insights upsell', () => {
      const { html } = postUploadStep3(UNSUB_URL);
      expect(html).toContain('symptom');
      expect(html).toContain('Supporter');
      expect(html).toContain('/pricing');
    });
  });

  describe('dormancy sequence', () => {
    it('step 1 encourages monthly uploads', () => {
      const { html } = dormancyStep1(UNSUB_URL);
      expect(html).toContain('monthly');
      expect(html).toContain('trend');
    });

    it('step 2 is the final email and says so', () => {
      const { html } = dormancyStep2(UNSUB_URL);
      expect(html).toContain('last email');
    });
  });

  describe('feature_education sequence', () => {
    it('step 1 promotes AI insights', () => {
      const { subject, html } = featureEducationStep1(UNSUB_URL);
      expect(subject).toContain('plain language');
      expect(html).toContain('AI insights');
      expect(html).toContain('Supporter');
    });

    it('step 2 promotes export features', () => {
      const { subject, html } = featureEducationStep2(UNSUB_URL);
      expect(subject).toContain('clinician');
      expect(html).toContain('PDF report');
      expect(html).toContain('CSV export');
      expect(html).toContain('Forum post');
    });
  });

  describe('UTM parameters', () => {
    it('all CTAs include UTM tracking parameters', () => {
      const templates = [
        postUploadStep1(UNSUB_URL),
        postUploadStep2(UNSUB_URL),
        postUploadStep3(UNSUB_URL),
        dormancyStep1(UNSUB_URL),
        dormancyStep2(UNSUB_URL),
        featureEducationStep1(UNSUB_URL),
        featureEducationStep2(UNSUB_URL),
      ];

      for (const { html } of templates) {
        expect(html).toContain('utm_source=email');
        expect(html).toContain('utm_medium=drip');
        expect(html).toContain('utm_campaign=');
      }
    });
  });
});

// ── SEQUENCES registry tests ─────────────────────────────────

describe('SEQUENCES registry', () => {
  const sequenceNames: SequenceName[] = ['post_upload', 'dormancy', 'feature_education', 'activation', 'premium_onboarding'];

  it('has all expected sequence names', () => {
    for (const name of sequenceNames) {
      expect(SEQUENCES[name]).toBeDefined();
    }
  });

  for (const name of sequenceNames) {
    describe(name, () => {
      const config = SEQUENCES[name];

      it('has totalSteps matching delays array length', () => {
        expect(config.totalSteps).toBe(config.delays.length);
      });

      it('has non-decreasing delay values', () => {
        for (let i = 1; i < config.delays.length; i++) {
          expect(config.delays[i]!).toBeGreaterThanOrEqual(config.delays[i - 1]!);
        }
      });

      it('returns templates for all valid steps', () => {
        for (let step = 1; step <= config.totalSteps; step++) {
          const template = config.getTemplate(step, UNSUB_URL);
          expect(template).not.toBeNull();
          expect(template!.subject).toBeTruthy();
          expect(template!.html).toBeTruthy();
        }
      });

      it('returns null for out-of-range steps', () => {
        expect(config.getTemplate(0, UNSUB_URL)).toBeNull();
        expect(config.getTemplate(config.totalSteps + 1, UNSUB_URL)).toBeNull();
        expect(config.getTemplate(-1, UNSUB_URL)).toBeNull();
      });
    });
  }

  describe('activation sequence (not exported directly)', () => {
    it('step 1 helps users get started with SD card upload', () => {
      const template = SEQUENCES.activation.getTemplate(1, UNSUB_URL)!;
      expect(template.subject).toContain('SD card');
      expect(template.html).toContain('ResMed');
      expect(template.html).toContain('DATALOG');
    });

    it('step 2 is the last activation email', () => {
      const template = SEQUENCES.activation.getTemplate(2, UNSUB_URL)!;
      expect(template.html).toContain('last activation email');
    });
  });

  describe('premium_onboarding sequence (not exported directly)', () => {
    it('step 1 introduces AI-powered insights', () => {
      const template = SEQUENCES.premium_onboarding.getTemplate(1, UNSUB_URL)!;
      expect(template.html).toContain('AI-powered insights');
    });

    it('step 2 promotes PDF report for clinicians', () => {
      const template = SEQUENCES.premium_onboarding.getTemplate(2, UNSUB_URL)!;
      expect(template.html).toContain('PDF report');
      expect(template.html).toContain('clinician');
    });

    it('step 3 mentions open-source and supporters page', () => {
      const template = SEQUENCES.premium_onboarding.getTemplate(3, UNSUB_URL)!;
      expect(template.html).toContain('open-source');
      expect(template.html).toContain('/supporters');
    });
  });

  describe('delay configurations', () => {
    it('post_upload starts immediately, then 3 and 7 days', () => {
      expect(SEQUENCES.post_upload.delays).toEqual([0, 3, 7]);
    });

    it('dormancy starts immediately, then 7 days', () => {
      expect(SEQUENCES.dormancy.delays).toEqual([0, 7]);
    });

    it('feature_education starts at day 10, then day 17', () => {
      expect(SEQUENCES.feature_education.delays).toEqual([10, 17]);
    });

    it('activation starts immediately, then 3 days', () => {
      expect(SEQUENCES.activation.delays).toEqual([0, 3]);
    });

    it('premium_onboarding starts immediately, then 3 and 7 days', () => {
      expect(SEQUENCES.premium_onboarding.delays).toEqual([0, 3, 7]);
    });
  });
});

// ── No health data in emails ─────────────────────────────────

describe('email templates — privacy', () => {
  it('no template contains raw health data patterns', () => {
    const allTemplates: string[] = [];
    for (const config of Object.values(SEQUENCES)) {
      for (let step = 1; step <= config.totalSteps; step++) {
        const t = config.getTemplate(step, UNSUB_URL);
        if (t) allTemplates.push(t.html);
      }
    }

    for (const html of allTemplates) {
      // Templates should contain links back to the app, not raw patient data
      expect(html).not.toMatch(/SpO2:\s*\d+/);
      expect(html).not.toMatch(/AHI:\s*\d+\.\d+/);
      // Should link to airwaylab.app
      expect(html).toContain('airwaylab.app');
    }
  });
});
