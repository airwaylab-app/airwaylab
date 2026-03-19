import { describe, it, expect } from 'vitest';
import { salvageTruncatedJSON } from '@/app/api/ai-insights/salvage';

describe('salvageTruncatedJSON', () => {
  it('extracts 2 complete objects from a response truncated after the 2nd object', () => {
    const truncated = `[
      {"id":"ai-001","type":"warning","title":"High FL","body":"FL is elevated.","category":"ned"},
      {"id":"ai-002","type":"positive","title":"Good AHI","body":"AHI is low.","category":"therapy"},
      {"id":"ai-003","type":"act`;
    const result = salvageTruncatedJSON(truncated);
    expect(result).toHaveLength(2);
    expect(result[0]!.id).toBe('ai-001');
    expect(result[1]!.id).toBe('ai-002');
  });

  it('extracts 1 object when truncated mid-2nd object', () => {
    const truncated = `[
      {"id":"ai-001","type":"warning","title":"High FL","body":"FL score is 72.","category":"ned"},
      {"id":"ai-002","ty`;
    const result = salvageTruncatedJSON(truncated);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('ai-001');
  });

  it('returns empty array when truncated mid-1st object', () => {
    const truncated = `[{"id":"ai-001","type":"warn`;
    const result = salvageTruncatedJSON(truncated);
    expect(result).toHaveLength(0);
  });

  it('handles nested braces in body text', () => {
    const truncated = `[
      {"id":"ai-001","type":"info","title":"NED analysis","body":"NED values {high: 24.8, low: 10.2} show variability.","category":"ned"},
      {"id":"ai-002","type":"wa`;
    const result = salvageTruncatedJSON(truncated);
    expect(result).toHaveLength(1);
    expect(result[0]!.body).toContain('{high: 24.8');
  });

  it('handles markdown fence wrapper + truncation', () => {
    const truncated = '```json\n[{"id":"ai-001","type":"warning","title":"Test","body":"Body.","category":"ned"},{"id":"ai-00';
    const result = salvageTruncatedJSON(truncated);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('ai-001');
  });

  it('handles complete valid JSON (no truncation)', () => {
    const complete = `[
      {"id":"ai-001","type":"warning","title":"High FL","body":"FL is high.","category":"ned"},
      {"id":"ai-002","type":"positive","title":"Good sleep","body":"Sleep quality ok.","category":"therapy"}
    ]`;
    const result = salvageTruncatedJSON(complete);
    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty or whitespace input', () => {
    expect(salvageTruncatedJSON('')).toHaveLength(0);
    expect(salvageTruncatedJSON('  ')).toHaveLength(0);
  });

  it('handles escaped quotes in body text', () => {
    const truncated = `[{"id":"ai-001","type":"info","title":"Test","body":"The \\"Glasgow\\" index shows improvement.","category":"glasgow"},{"id":"ai-002","ty`;
    const result = salvageTruncatedJSON(truncated);
    expect(result).toHaveLength(1);
    expect(result[0]!.body).toContain('"Glasgow"');
  });
});
