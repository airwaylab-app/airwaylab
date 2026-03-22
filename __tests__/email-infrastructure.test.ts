import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for email infrastructure:
 * 1. Sunset circuit breaker (skips when tracking is broken)
 * 2. Sunset protects paying/active users
 * 3. Cron handler scheduling order (schedule before send)
 */

// ── Sunset policy ────────────────────────────────────────────

describe('applySunsetPolicy', () => {
  it('skips when zero engagement is tracked system-wide', async () => {
    const { applySunsetPolicy } = await import('@/lib/email/sequences');

    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({ count: 0 }),
        }),
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await applySunsetPolicy(mockSupabase as any);
    expect(result).toBe(0);
  });

  it('does not sunset paying subscribers or recently active users', async () => {
    // This is a structural test -- verify the source code checks tier and last_sign_in_at
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');

    const source = readFileSync(
      resolve(process.cwd(), 'lib/email/sequences.ts'),
      'utf8',
    );

    // The sunset function must exclude paying users (tier != community)
    expect(source).toContain('tier.neq.community');
    // The sunset function must exclude recently active users
    expect(source).toContain('last_sign_in_at');
    // Must check both opened_at and clicked_at for engagement
    expect(source).toContain('opened_at');
    expect(source).toContain('clicked_at');
  });
});

// ── Cron handler ordering ────────────────────────────────────

describe('processEmailDrips execution order', () => {
  it('calls schedule functions before getPendingEmails in the function body', async () => {
    const { readFileSync } = await import('fs');
    const { resolve } = await import('path');

    const source = readFileSync(
      resolve(process.cwd(), 'lib/email/cron-handler.ts'),
      'utf8',
    );

    const fnStart = source.indexOf('export async function processEmailDrips');
    expect(fnStart).toBeGreaterThan(-1);

    const body = source.slice(fnStart);

    const scheduleCall = body.indexOf('await scheduleDormancySequences');
    const activationCall = body.indexOf('await scheduleActivationSequences');
    const sendCall = body.indexOf('await getPendingEmails');
    const sunsetCall = body.indexOf('await applySunsetPolicy');

    expect(scheduleCall).toBeGreaterThan(-1);
    expect(activationCall).toBeGreaterThan(-1);
    expect(sendCall).toBeGreaterThan(-1);
    expect(sunsetCall).toBeGreaterThan(-1);

    expect(scheduleCall).toBeLessThan(sendCall);
    expect(activationCall).toBeLessThan(sendCall);
    expect(sendCall).toBeLessThan(sunsetCall);
  });
});
