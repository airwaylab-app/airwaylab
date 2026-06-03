/**
 * Regression guard for the Discord webhook AbortSignal timeout (AIR-1648).
 *
 * The prior 10 s timeout kept fire-and-forget sendAlert() Promises alive
 * until the Vercel function budget expired, producing unhandled
 * TimeoutError events (JAVASCRIPT-NEXTJS-56). The fix reduces it to 3 s.
 *
 * This source-inspection test pins the value so a future increase back to
 * 10 s (or beyond) fails CI immediately.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');
const src = fs.readFileSync(path.join(ROOT, 'lib/discord-webhook.ts'), 'utf-8');

describe('discord-webhook — AbortSignal timeout config (AIR-1648 regression)', () => {
  it('uses a 3 s timeout so fire-and-forget calls do not exhaust the Vercel function budget', () => {
    expect(src).toContain('AbortSignal.timeout(3_000)');
  });

  it('does not use the old 10 s timeout that caused JAVASCRIPT-NEXTJS-56', () => {
    expect(src).not.toContain('AbortSignal.timeout(10_000)');
  });
});
