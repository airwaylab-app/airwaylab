import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

function readFile(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf-8');
}

describe('Contextual upgrade nudges', () => {
  describe('UpgradePrompt', () => {
    it('does not mention "metric explanations" as a paid feature', () => {
      const content = readFile('components/auth/upgrade-prompt.tsx');
      expect(content.toLowerCase()).not.toContain('metric explanations');
    });

    it('uses Sparkles icon instead of Heart', () => {
      const content = readFile('components/auth/upgrade-prompt.tsx');
      expect(content).toContain('Sparkles');
      expect(content).not.toContain("import { Heart");
    });

    it('links to /pricing with "See supporter benefits" CTA', () => {
      const content = readFile('components/auth/upgrade-prompt.tsx');
      expect(content).toContain('See supporter benefits');
      expect(content).toContain('href="/pricing"');
    });
  });

  describe('AIInsightsCTA', () => {
    it('credits-remaining state mentions deeper analysis, not funding', () => {
      const content = readFile('components/dashboard/ai-insights-cta.tsx');
      expect(content).toContain('deeper analysis');
      expect(content).toContain('breath');
    });

    it('credits-exhausted state mentions waveform-level depth', () => {
      const content = readFile('components/dashboard/ai-insights-cta.tsx');
      expect(content).toContain('waveform-level');
      expect(content).toContain('cross-engine correlations your clinician can review');
    });

    it('uses "See supporter benefits" CTA instead of "Support the project"', () => {
      const content = readFile('components/dashboard/ai-insights-cta.tsx');
      expect(content).toContain('See supporter benefits');
      expect(content).not.toContain('Support the project');
    });
  });

  describe('DeepInsightTeasers', () => {
    it('accepts a night prop for contextual teasers', () => {
      const content = readFile('components/dashboard/deep-insight-teasers.tsx');
      expect(content).toContain('night?: NightResult');
    });

    it('generates RERA-specific teaser when RERA > 5', () => {
      const content = readFile('components/dashboard/deep-insight-teasers.tsx');
      expect(content).toContain('night.ned.reraIndex > 5');
      expect(content).toContain('Your RERA patterns across the night');
    });

    it('generates FL-specific teaser when FL Score > 30', () => {
      const content = readFile('components/dashboard/deep-insight-teasers.tsx');
      expect(content).toContain('night.wat.flScore > 30');
      expect(content).toContain('driving your flow limitation');
    });

    it('generates H1/H2 teaser when NED differs significantly', () => {
      const content = readFile('components/dashboard/deep-insight-teasers.tsx');
      expect(content).toContain('h1NedMean');
      expect(content).toContain('h2NedMean');
      expect(content).toContain('First-half vs second-half');
    });

    it('uses "See supporter benefits" CTA', () => {
      const content = readFile('components/dashboard/deep-insight-teasers.tsx');
      expect(content).toContain('See supporter benefits');
    });

    it('is passed night data from ai-insights-gate', () => {
      const content = readFile('components/dashboard/ai-insights-gate.tsx');
      expect(content).toContain('DeepInsightTeasers night=');
    });
  });

  describe('Overview tab contextual UpgradePrompt', () => {
    it('computes IFL Risk for contextual messaging', () => {
      const content = readFile('components/dashboard/overview-tab.tsx');
      // Should have contextual logic based on IFL tier
      expect(content).toContain('iflTier');
      expect(content).toContain('metrics look typical');
      expect(content).toContain('worth exploring further');
    });
  });
});
