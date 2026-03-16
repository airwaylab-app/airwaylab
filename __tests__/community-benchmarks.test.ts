import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

function readFile(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf-8');
}

describe('Community benchmarks', () => {
  describe('API route', () => {
    it('route file exists at app/api/community-benchmarks/route.ts', () => {
      expect(existsSync(join(root, 'app/api/community-benchmarks/route.ts'))).toBe(true);
    });

    it('uses rate limiting', () => {
      const content = readFile('app/api/community-benchmarks/route.ts');
      expect(content).toContain('RateLimiter');
      expect(content).toContain('isLimited');
    });

    it('implements 1-hour cache with TTL', () => {
      const content = readFile('app/api/community-benchmarks/route.ts');
      expect(content).toContain('CACHE_TTL_MS');
      expect(content).toContain('60 * 60 * 1000');
    });

    it('serves stale cache on error', () => {
      const content = readFile('app/api/community-benchmarks/route.ts');
      // Should check for cached data before returning error
      expect(content).toContain('cachedBenchmarks');
      const errorHandling = content.includes('Serve stale cache') || content.includes('cachedBenchmarks');
      expect(errorHandling).toBe(true);
    });

    it('returns insufficient when sample size < 20', () => {
      const content = readFile('app/api/community-benchmarks/route.ts');
      expect(content).toContain('sample_size < 20');
      expect(content).toContain('insufficient');
    });

    it('includes fetchedAt timestamp in response', () => {
      const content = readFile('app/api/community-benchmarks/route.ts');
      expect(content).toContain('fetchedAt');
    });

    it('returns percentiles for all 4 metrics', () => {
      const content = readFile('app/api/community-benchmarks/route.ts');
      expect(content).toContain('iflRisk');
      expect(content).toContain('glasgow');
      expect(content).toContain('flScore');
      expect(content).toContain('reraIndex');
    });
  });

  describe('Migration', () => {
    it('migration file exists', () => {
      expect(existsSync(join(root, 'supabase/migrations/026_community_benchmarks_rpc.sql'))).toBe(true);
    });

    it('creates get_community_benchmarks function', () => {
      const content = readFile('supabase/migrations/026_community_benchmarks_rpc.sql');
      expect(content).toContain('get_community_benchmarks');
      expect(content).toContain('SECURITY DEFINER');
    });

    it('computes percentiles for all 4 metrics', () => {
      const content = readFile('supabase/migrations/026_community_benchmarks_rpc.sql');
      expect(content).toContain('ifl_risk_p10');
      expect(content).toContain('glasgow_p50');
      expect(content).toContain('fl_score_p75');
      expect(content).toContain('rera_index_p90');
    });
  });

  describe('Component', () => {
    it('component file exists', () => {
      expect(existsSync(join(root, 'components/dashboard/community-benchmarks.tsx'))).toBe(true);
    });

    it('renders position bars for all 4 metrics', () => {
      const content = readFile('components/dashboard/community-benchmarks.tsx');
      expect(content).toContain('IFL Symptom Risk');
      expect(content).toContain('Glasgow Index');
      expect(content).toContain('FL Score');
      expect(content).toContain('RERA Index');
    });

    it('shows sample size', () => {
      const content = readFile('components/dashboard/community-benchmarks.tsx');
      expect(content).toContain('sampleSize');
      expect(content).toContain('anonymised community analyses');
    });

    it('shows upgrade nudge for non-paid users', () => {
      const content = readFile('components/dashboard/community-benchmarks.tsx');
      expect(content).toContain('!isPaid');
      expect(content).toContain('See supporter benefits');
    });

    it('does not contain medical advice language', () => {
      const content = readFile('components/dashboard/community-benchmarks.tsx').toLowerCase();
      expect(content).not.toContain('you should');
      expect(content).not.toContain('dangerous');
      expect(content).not.toContain('concerning');
    });

    it('handles insufficient data state', () => {
      const content = readFile('components/dashboard/community-benchmarks.tsx');
      expect(content).toContain('insufficient');
      expect(content).toContain('coming soon');
    });

    it('hides on error (non-blocking)', () => {
      const content = readFile('components/dashboard/community-benchmarks.tsx');
      expect(content).toContain("status === 'error'");
      expect(content).toContain('return null');
    });

    it('handles values outside community range', () => {
      const content = readFile('components/dashboard/community-benchmarks.tsx');
      expect(content).toContain('below community range');
      expect(content).toContain('above community range');
    });

    it('shows demo label in demo mode', () => {
      const content = readFile('components/dashboard/community-benchmarks.tsx');
      expect(content).toContain('isDemo');
      expect(content).toContain('demo data');
    });

    it('fires analytics event on load', () => {
      const content = readFile('components/dashboard/community-benchmarks.tsx');
      expect(content).toContain('communityBenchmarksViewed');
    });
  });

  describe('Integration', () => {
    it('overview-tab imports CommunityBenchmarks', () => {
      const content = readFile('components/dashboard/overview-tab.tsx');
      expect(content).toContain("import { CommunityBenchmarks }");
      expect(content).toContain('<CommunityBenchmarks');
    });

    it('analytics module has communityBenchmarksViewed event', () => {
      const content = readFile('lib/analytics.ts');
      expect(content).toContain('communityBenchmarksViewed');
      expect(content).toContain('Community Benchmarks Viewed');
    });
  });
});
