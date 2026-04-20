import { describe, it, expect, vi } from 'vitest';

/**
 * Tests for email infrastructure fixes:
 * 1. Sunset circuit breaker (skips when open tracking is broken)
 * 2. Cron handler scheduling order (schedule before send)
 */

// ── Sunset circuit breaker ───────────────────────────────────

describe('applySunsetPolicy circuit breaker', () => {
  function createMockChain() {
    // Builds a chainable mock that supports arbitrary .eq/.not/.is/.update calls
    const chain: Record<string, ReturnType<typeof vi.fn>> = {};
    const proxy = new Proxy(chain, {
      get(target, prop) {
        if (prop === 'then' || prop === 'catch') return undefined;
        if (!target[prop as string]) {
          target[prop as string] = vi.fn().mockReturnValue(proxy);
        }
        return target[prop as string];
      },
    });
    return proxy;
  }

  it('skips sunset when zero clicks are tracked system-wide', async () => {
    const { applySunsetPolicy } = await import('@/lib/email/sequences');

    const mockSupabase = {
      from: vi.fn().mockImplementation(() => {
        return {
          select: vi.fn().mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => {
            if (opts?.count === 'exact' && opts?.head) {
              return {
                not: vi.fn().mockReturnValue({ count: 0 }),
              };
            }
            return createMockChain();
          }),
          update: vi.fn().mockReturnValue(createMockChain()),
        };
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await applySunsetPolicy(mockSupabase as any);
    expect(result).toBe(0);
  });

  it('proceeds with sunset when clicks are tracked', async () => {
    const { applySunsetPolicy } = await import('@/lib/email/sequences');

    const mockSupabase = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'email_sequences') {
          return {
            select: vi.fn().mockImplementation((_cols: string, opts?: { count?: string; head?: boolean }) => {
              // Circuit breaker query: return 5 clicks
              if (opts?.count === 'exact' && opts?.head) {
                return {
                  not: vi.fn().mockReturnValue({ count: 5 }),
                };
              }
              // Unengaged users query: chain .eq().not().is()
              const terminalValue = Promise.resolve({
                data: [
                  { user_id: 'user-1' },
                  { user_id: 'user-1' },
                  { user_id: 'user-1' },
                ],
                error: null,
              });
              const notChain = { is: vi.fn().mockReturnValue(terminalValue) };
              const eqChain = { not: vi.fn().mockReturnValue(notChain) };
              return { eq: vi.fn().mockReturnValue(eqChain) };
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        // profiles table
        return {
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        };
      }),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await applySunsetPolicy(mockSupabase as any);
    expect(result).toBe(1);
  });
});

// ── Activation sequence configuration ───────────────────────

describe('activation sequence (SEQUENCES.activation)', () => {
  it('has 5 steps with correct day delays from sequence start', async () => {
    const { SEQUENCES } = await import('@/lib/email/templates');
    const activation = SEQUENCES.activation;

    expect(activation.totalSteps).toBe(5);
    // delays are days from sequence start (~48h after signup):
    // Email 1: day 2, Email 2: day 5, Email 3: day 8, Email 4: day 12, Email 5: day 16
    expect(activation.delays).toEqual([0, 3, 6, 10, 14]);
  });

  it('returns a template for every step', async () => {
    const { SEQUENCES } = await import('@/lib/email/templates');
    const { getTemplate } = SEQUENCES.activation;
    const dummyUrl = 'https://airwaylab.app/api/email/unsubscribe?token=test';

    for (let step = 1; step <= 5; step++) {
      const tpl = getTemplate(step, dummyUrl);
      expect(tpl).not.toBeNull();
      expect(tpl!.subject.length).toBeGreaterThan(0);
      expect(tpl!.html).toContain('/analyze');
      expect(tpl!.html).toContain(dummyUrl);
    }
  });

  it('returns null for out-of-range step', async () => {
    const { SEQUENCES } = await import('@/lib/email/templates');
    const { getTemplate } = SEQUENCES.activation;
    const dummyUrl = 'https://airwaylab.app/api/email/unsubscribe?token=test';

    expect(getTemplate(0, dummyUrl)).toBeNull();
    expect(getTemplate(6, dummyUrl)).toBeNull();
  });

  it('Email 5 is the final step and does not promise further emails', async () => {
    const { SEQUENCES } = await import('@/lib/email/templates');
    const { getTemplate } = SEQUENCES.activation;
    const dummyUrl = 'https://airwaylab.app/api/email/unsubscribe?token=test';
    const email5 = getTemplate(5, dummyUrl);

    // Final email should signal it is the last outreach
    expect(email5!.html.toLowerCase()).toContain('last time');
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

    // Find the function body (after the export line)
    const fnStart = source.indexOf('export async function processEmailDrips');
    expect(fnStart).toBeGreaterThan(-1);

    const body = source.slice(fnStart);

    // Look for the actual await calls, not imports
    const scheduleCall = body.indexOf('await scheduleDormancySequences');
    const activationCall = body.indexOf('await scheduleActivationSequences');
    const sendCall = body.indexOf('await getPendingEmails');
    const sunsetCall = body.indexOf('await applySunsetPolicy');

    expect(scheduleCall).toBeGreaterThan(-1);
    expect(activationCall).toBeGreaterThan(-1);
    expect(sendCall).toBeGreaterThan(-1);
    expect(sunsetCall).toBeGreaterThan(-1);

    // Schedule must come before send, send before sunset
    expect(scheduleCall).toBeLessThan(sendCall);
    expect(activationCall).toBeLessThan(sendCall);
    expect(sendCall).toBeLessThan(sunsetCall);
  });
});
