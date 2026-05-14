/**
 * Regression guard for the analyze page tier-window bypass conditions.
 *
 * Context: community tier window filtering was applied to ALL nights including demo
 * sample data (Jan 2025) and fresh SD card uploads. This caused 42 E2E test
 * failures because visibleNights was always empty for out-of-window fixture data.
 * (fix/air-940-e2e-tier-window-bypass)
 *
 * The useMemo hooks in app/analyze/page.tsx must bypass the window filter for:
 *   1. isDemo mode — sample data should always be visible
 *   2. state.nights.length > 0 — freshly uploaded session data bypasses the persisted
 *      history window (the tier window applies to stored history, not active sessions)
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'app/analyze/page.tsx'), 'utf-8');

describe('analyze page — tier window bypass conditions (AIR-940 regression)', () => {
  it('nights useMemo bypasses window filter when isDemo or fresh upload (return raw)', () => {
    // The bypass condition must include both isDemo and state.nights.length > 0
    // before returning the unfiltered raw array.
    expect(src).toContain('if (isDemo || state.nights.length > 0 || !isFinite(windowDays) || windowDays <= 0) return raw;');
  });

  it('visibleNights useMemo bypasses window filter for demo mode and fresh uploads (return nights)', () => {
    // visibleNights short-circuits before getAnalysisWindowDays for demo and active sessions.
    const visibleNightsMemo = src.slice(src.indexOf('visibleNights = useMemo'));
    expect(visibleNightsMemo).toContain('if (isDemo || state.nights.length > 0) return nights;');
  });

  it('nights useMemo dependency array includes isDemo and state.nights', () => {
    expect(src).toMatch(/\[isDemo,\s*state\.nights[^\]]*\]/);
  });
});
