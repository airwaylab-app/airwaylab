/**
 * Regression guard for the analyze page tier-window bypass conditions.
 *
 * Context: community tier window filtering was applied to ALL nights including demo
 * sample data (Jan 2025) and fresh SD card uploads. This caused 42 E2E test
 * failures because visibleNights was always empty for out-of-window fixture data.
 * (fix/air-940-e2e-tier-window-bypass)
 *
 * The useMemo hooks in app/analyze/page.tsx must bypass the window filter for:
 *   1. isDemo — sample data always visible
 *   2. state.nights.length > 0 — freshly uploaded session data bypasses the window
 *   3. isRecentRestore — session saved <24 h ago is shown in full (same-day reload)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'app/analyze/page.tsx'), 'utf-8');

describe('analyze page — tier window bypass conditions (AIR-940 regression)', () => {
  it('nights useMemo bypasses window filter for isDemo, fresh upload, and recent restore', () => {
    // All three bypass cases must guard the raw return before applying the date cutoff.
    expect(src).toContain('if (isDemo || state.nights.length > 0 || isRecentRestore || !isFinite(windowDays) || windowDays <= 0) return raw;');
  });

  it('visibleNights useMemo bypasses window filter for demo, fresh uploads, and recent restore', () => {
    // visibleNights short-circuits for demo, active sessions, and same-day restores.
    const visibleNightsMemo = src.slice(src.indexOf('visibleNights = useMemo'));
    expect(visibleNightsMemo).toContain('if (isDemo || state.nights.length > 0 || isRecentRestore) return nights;');
  });

  it('nights useMemo dependency array includes isDemo and state.nights', () => {
    expect(src).toMatch(/\[isDemo,\s*state\.nights[^\]]*\]/);
  });
});
