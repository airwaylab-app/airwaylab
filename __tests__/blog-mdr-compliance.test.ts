import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

const projectRoot = join(__dirname, '..');
const blogPostsDir = join(projectRoot, 'app/blog/posts');
const blogPostsTs = join(projectRoot, 'lib/blog-posts.ts');

function readBlogPosts(): Array<{ file: string; content: string }> {
  const files = readdirSync(blogPostsDir).filter((f) => f.endsWith('.tsx'));
  return files.map((file) => ({
    file: `app/blog/posts/${file}`,
    content: readFileSync(join(blogPostsDir, file), 'utf8'),
  }));
}

describe('Blog MDR compliance — Rule 2 (RERA language)', () => {
  it('no blog post file contains "RERA detection" or "RERA Detection"', () => {
    const violations: string[] = [];
    for (const { file, content } of readBlogPosts()) {
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/RERA [Dd]etection/.test(line)) {
          violations.push(`${file}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it('lib/blog-posts.ts does not contain "RERA detection" or "RERA Detection"', () => {
    const content = readFileSync(blogPostsTs, 'utf8');
    const violations: string[] = [];
    content.split('\n').forEach((line, idx) => {
      if (/RERA [Dd]etection/.test(line)) {
        violations.push(`lib/blog-posts.ts:${idx + 1}: ${line.trim()}`);
      }
    });
    expect(violations).toEqual([]);
  });
});

describe('Blog MDR compliance — Rule 2 (diagnostic language)', () => {
  it('no blog post uses "AirwayLab detects" with clinical event types', () => {
    const pattern = /AirwayLab detects\s+(apnea|hypopnea|RERA|obstruction|flow.?limited|arousal)/i;
    const violations: string[] = [];
    for (const { file, content } of readBlogPosts()) {
      content.split('\n').forEach((line, idx) => {
        if (pattern.test(line)) {
          violations.push(`${file}:${idx + 1}: ${line.trim()}`);
        }
      });
    }
    expect(violations).toEqual([]);
  });

  it('lib/blog-posts.ts does not use "AirwayLab detects" with clinical event types', () => {
    const pattern = /AirwayLab detects\s+(apnea|hypopnea|RERA|obstruction|flow.?limited|arousal)/i;
    const content = readFileSync(blogPostsTs, 'utf8');
    const violations: string[] = [];
    content.split('\n').forEach((line, idx) => {
      if (pattern.test(line)) {
        violations.push(`lib/blog-posts.ts:${idx + 1}: ${line.trim()}`);
      }
    });
    expect(violations).toEqual([]);
  });
});

describe('Blog MDR compliance — Rule 1 (no therapy recommendations)', () => {
  const therapyRecommendationPatterns = [
    /discuss (pressure |adjusting |your pressure)/i,
    /consider adjusting (trigger|pressure|EPR|IPAP|EPAP)/i,
    /you (may|should|might) (need|want) to adjust/i,
    /try (increasing|decreasing|raising|lowering) (pressure|EPR|IPAP|EPAP)/i,
  ];

  it('no blog post contains therapy adjustment recommendations', () => {
    const violations: string[] = [];
    for (const { file, content } of readBlogPosts()) {
      content.split('\n').forEach((line, idx) => {
        for (const pattern of therapyRecommendationPatterns) {
          if (pattern.test(line)) {
            violations.push(`${file}:${idx + 1}: ${line.trim()}`);
          }
        }
      });
    }
    expect(violations).toEqual([]);
  });
});

describe('Blog MDR compliance — clinician disclaimer presence', () => {
  const clinicalTerms = /\b(AHI|flow limitation|RERA|Glasgow Index|NED score|oximetry|apnea|hypopnea)\b/i;
  const disclaimerTerms = /clinician|sleep physician|discuss.*your (doctor|specialist|physician|clinician)|medical (advice|disclaimer)/i;

  it('every blog post containing clinical metrics includes a clinician disclaimer', () => {
    const violations: string[] = [];
    for (const { file, content } of readBlogPosts()) {
      if (clinicalTerms.test(content) && !disclaimerTerms.test(content)) {
        violations.push(file);
      }
    }
    expect(violations).toEqual([]);
  });
});
